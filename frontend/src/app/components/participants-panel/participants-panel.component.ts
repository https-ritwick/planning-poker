import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ROLE_LABELS, Role, Snapshot, UserPublic } from '../../core/models/models';

@Component({
  selector: 'app-participants-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card">
      <div class="card-header">
        <span class="card-title">👥 Participants <span class="count">{{ users.length }}</span></span>
        <span class="badge badge-gray">{{ activeCount }} active</span>
      </div>
      <div class="plist">
        @for (u of users; track u.id) {
          <div class="prow" [class.is-admin]="u.is_admin" [class.is-me]="u.id === myId">
            <div class="avatar" [class.admin-av]="u.is_admin">{{ initials(u.name) }}</div>
            <div class="pinfo">
              <div class="pname">
                {{ u.name }}
                @if (u.id === myId) { <span class="you-tag">You</span> }
              </div>
              <div class="prole">
                {{ roleLabel(u.role) }}
                @if (u.is_admin) { <span class="badge badge-orange" style="margin-left:4px">Scrum Master</span> }
              </div>
            </div>
            <div class="pstatus">
              <span class="dot" [class.dot-on]="u.is_active" [class.dot-off]="!u.is_active"
                    [title]="u.is_active ? 'Active' : 'Inactive'"></span>
              @if (!u.can_vote) {
                <span class="vote-chip observer" title="Observer">👁</span>
              } @else if (revealed) {
                <span class="vote-chip revealed">{{ voteDisplay(u.id) }}</span>
              } @else if (u.has_voted) {
                <span class="vote-chip voted" title="Voted">✓</span>
              } @else {
                <span class="vote-chip pending" title="Waiting">…</span>
              }
            </div>
          </div>
        }
        @if (users.length === 0) {
          <div class="empty">No participants yet.</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .count {
      font-size: 12px; background: var(--exl-orange-50); color: var(--exl-orange-dark);
      padding: 1px 8px; border-radius: 999px; font-weight: 700;
    }
    .plist { padding: 8px; display: flex; flex-direction: column; gap: 2px; max-height: 380px; overflow-y: auto; }
    .prow {
      display: flex; align-items: center; gap: 12px; padding: 10px 12px;
      border-radius: 10px; transition: background 0.15s ease;
    }
    .prow:hover { background: var(--surface-2); }
    .prow.is-me { background: var(--exl-orange-50); }
    .avatar {
      width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 14px; font-family: var(--font-display);
      background: var(--bg); color: var(--text-muted); border: 1px solid var(--border);
    }
    .avatar.admin-av { background: var(--exl-orange); color: #fff; border-color: var(--exl-orange-dark); }
    .pinfo { flex: 1; min-width: 0; }
    .pname { font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 6px; }
    .you-tag {
      font-size: 10px; background: var(--info); color: #fff; padding: 1px 6px;
      border-radius: 6px; font-weight: 700; letter-spacing: 0.03em;
    }
    .prole { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; }
    .pstatus { display: flex; align-items: center; gap: 10px; }
    .vote-chip {
      min-width: 30px; height: 30px; padding: 0 6px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 13px;
    }
    .vote-chip.voted { background: var(--success-bg); color: var(--success); }
    .vote-chip.pending { background: var(--bg); color: var(--text-faint); }
    .vote-chip.observer { background: var(--bg); color: var(--text-muted); }
    .vote-chip.revealed { background: var(--exl-orange); color: #fff; animation: flip 0.4s ease both; }
    .empty { padding: 24px; text-align: center; color: var(--text-faint); font-size: 14px; }
  `],
})
export class ParticipantsPanelComponent {
  @Input() snapshot!: Snapshot;
  @Input() myId = '';

  get users(): UserPublic[] { return this.snapshot?.users ?? []; }
  get revealed(): boolean { return this.snapshot?.revealed ?? false; }
  get activeCount(): number { return this.users.filter((u) => u.is_active).length; }

  initials(name: string): string {
    return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  }
  roleLabel(role: Role): string { return ROLE_LABELS[role]; }

  voteDisplay(userId: string): string {
    const v = this.snapshot?.votes?.[userId];
    if (!v) return '–';
    return v === 'coffee' ? '☕' : v;
  }
}
