import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Snapshot } from '../../core/models/models';

@Component({
  selector: 'app-admin-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card admin-card">
      <div class="card-header">
        <span class="card-title">🛠 Scrum Master Controls</span>
      </div>
      <div class="card-pad col gap-16">
        <!-- Primary round actions -->
        <div class="control-grid">
          @if (!snapshot.revealed) {
            <button class="btn btn-primary" (click)="reveal.emit()" [disabled]="!hasVotes">
              👁 Reveal votes
            </button>
          } @else {
            <button class="btn btn-ghost" (click)="reset.emit()">
              ↻ Revote
            </button>
          }
          <button class="btn btn-ghost" (click)="reset.emit()" [disabled]="!hasVotes && !snapshot.revealed">
            🗑 Reset round
          </button>
        </div>

        <div class="divider" style="margin:4px 0"></div>

        <!-- Timer -->
        <div class="timer-block">
          <div class="row between center">
            <span class="ctl-label">⏱ Voting timer</span>
            @if (snapshot.timer_remaining != null) {
              <span class="timer-display mono" [class.urgent]="snapshot.timer_remaining <= 10">
                {{ fmt(snapshot.timer_remaining) }}
              </span>
            }
          </div>
          <div class="row gap-8 center" style="margin-top:10px; flex-wrap:wrap">
            <select class="select timer-select" [(ngModel)]="timerSecs">
              <option [ngValue]="30">30s</option>
              <option [ngValue]="60">1 min</option>
              <option [ngValue]="120">2 min</option>
              <option [ngValue]="300">5 min</option>
            </select>
            <label class="auto-reveal">
              <input type="checkbox" [(ngModel)]="autoReveal" /> Auto-reveal
            </label>
            <button class="btn btn-soft btn-sm grow" (click)="startTimer.emit({ seconds: timerSecs, autoReveal })">
              Start timer
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-card { border-color: var(--exl-orange-light); }
    .control-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .control-grid .btn { justify-content: center; }
    .ctl-label { font-size: 13px; font-weight: 700; color: var(--text-muted); }
    .timer-display {
      font-family: var(--font-display); font-weight: 800; font-size: 18px;
      color: var(--exl-orange-dark);
    }
    .timer-display.urgent { color: var(--danger); animation: pulse 1s ease-in-out infinite; }
    .timer-select { width: auto; padding: 7px 10px; font-size: 13px; }
    .auto-reveal { font-size: 13px; color: var(--text-muted); display: flex; align-items: center; gap: 5px; cursor: pointer; }
    .auto-reveal input { accent-color: var(--exl-orange); }
  `],
})
export class AdminControlsComponent {
  @Input() snapshot!: Snapshot;
  @Output() reveal = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();
  @Output() startTimer = new EventEmitter<{ seconds: number; autoReveal: boolean }>();

  timerSecs = 60;
  autoReveal = true;

  get hasVotes(): boolean {
    return this.snapshot.users.some((u) => u.has_voted);
  }

  fmt(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
