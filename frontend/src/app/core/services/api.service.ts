import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Priority, Role, Snapshot, Story } from '../models/models';

/** Thin wrapper over the FastAPI REST endpoints. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiBase;

  constructor(private http: HttpClient) {}

  createRoom(payload: { room_name: string; admin_name: string; team?: string }) {
    return this.http.post<{ room_id: string; user_id: string; role: Role; snapshot: Snapshot }>(
      `${this.base}/rooms`,
      payload
    );
  }

  joinRoom(roomId: string, payload: { name: string; role: Role }) {
    return this.http.post<{ room_id: string; user_id: string; role: Role; snapshot: Snapshot }>(
      `${this.base}/rooms/${roomId}/join`,
      payload
    );
  }

  getRoom(roomId: string): Observable<Snapshot> {
    return this.http.get<Snapshot>(`${this.base}/rooms/${roomId}`);
  }

  addStory(
    roomId: string,
    userId: string,
    payload: {
      title: string;
      description: string;
      acceptance_criteria: string;
      priority: Priority;
      jira_id: string | null;
    }
  ) {
    return this.http.post<Story>(
      `${this.base}/rooms/${roomId}/stories?user_id=${userId}`,
      payload
    );
  }

  updateStory(roomId: string, userId: string, storyId: string, payload: any) {
    return this.http.put<Story>(
      `${this.base}/rooms/${roomId}/stories/${storyId}?user_id=${userId}`,
      payload
    );
  }

  deleteStory(roomId: string, userId: string, storyId: string) {
    return this.http.delete(`${this.base}/rooms/${roomId}/stories/${storyId}?user_id=${userId}`);
  }

  activateStory(roomId: string, userId: string, storyId: string) {
    return this.http.post(
      `${this.base}/rooms/${roomId}/stories/${storyId}/activate?user_id=${userId}`,
      {}
    );
  }

  vote(roomId: string, userId: string, card: string) {
    return this.http.post(`${this.base}/rooms/${roomId}/vote`, { user_id: userId, card });
  }

  reveal(roomId: string, userId: string) {
    return this.http.post(`${this.base}/rooms/${roomId}/reveal?user_id=${userId}`, {});
  }

  reset(roomId: string, userId: string) {
    return this.http.post(`${this.base}/rooms/${roomId}/reset?user_id=${userId}`, {});
  }

  finalize(roomId: string, userId: string, storyId: string, finalEstimate: string) {
    return this.http.post(`${this.base}/rooms/${roomId}/finalize?user_id=${userId}`, {
      story_id: storyId,
      final_estimate: finalEstimate,
    });
  }

  startTimer(roomId: string, userId: string, seconds: number, autoReveal: boolean) {
    return this.http.post(`${this.base}/rooms/${roomId}/timer?user_id=${userId}`, {
      seconds,
      auto_reveal: autoReveal,
    });
  }

  exportUrl(roomId: string, fmt: 'json' | 'csv'): string {
    return `${this.base}/rooms/${roomId}/export.${fmt}`;
  }
}
