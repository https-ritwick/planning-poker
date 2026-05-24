import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Snapshot } from '../models/models';

type WsStatus = 'connecting' | 'open' | 'closed';

/**
 * Manages the room WebSocket: connect, heartbeat ping, auto-reconnect with
 * backoff, and surfacing incoming state snapshots as an observable stream.
 */
@Injectable({ providedIn: 'root' })
export class WsService {
  private ws?: WebSocket;
  private roomId = '';
  private userId = '';
  private heartbeat?: any;
  private reconnectTimer?: any;
  private retries = 0;
  private manuallyClosed = false;

  readonly snapshot$ = new Subject<Snapshot>();
  readonly status$ = new Subject<WsStatus>();

  constructor(private zone: NgZone) {}

  connect(roomId: string, userId: string): void {
    this.roomId = roomId;
    this.userId = userId;
    this.manuallyClosed = false;
    this.open();
  }

  private open(): void {
    this.status$.next('connecting');
    const url = `${environment.wsBase}/${this.roomId}?user_id=${this.userId}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.zone.run(() => {
        this.retries = 0;
        this.status$.next('open');
        this.startHeartbeat();
      });
    };

    this.ws.onmessage = (ev) => {
      this.zone.run(() => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type === 'state') {
            this.snapshot$.next(data.payload as Snapshot);
          }
        } catch {
          /* ignore malformed frames */
        }
      });
    };

    this.ws.onclose = () => {
      this.zone.run(() => {
        this.stopHeartbeat();
        this.status$.next('closed');
        if (!this.manuallyClosed) this.scheduleReconnect();
      });
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  /** Send a vote over the socket (lower-latency than the REST endpoint). */
  sendVote(card: string): void {
    this.send({ type: 'vote', card });
  }

  requestState(): void {
    this.send({ type: 'request_state' });
  }

  private send(msg: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeat = setInterval(() => this.send({ type: 'ping' }), 15000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = undefined;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * 2 ** this.retries, 10000);
    this.retries++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.open();
    }, delay);
  }

  disconnect(): void {
    this.manuallyClosed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = undefined;
  }
}
