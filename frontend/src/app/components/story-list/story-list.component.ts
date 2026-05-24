import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PRIORITY_LABELS, Priority, Snapshot, Story } from '../../core/models/models';

@Component({
  selector: 'app-story-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card">
      <div class="card-header">
        <span class="card-title">📋 Backlog</span>
        <div class="row gap-8 center">
          <span class="badge badge-green">{{ snapshot.estimated_count }} done</span>
          <span class="badge badge-gray">{{ snapshot.pending_count }} left</span>
        </div>
      </div>

      <div class="slist">
        @for (s of snapshot.stories; track s.id) {
          <div class="srow" [class.active]="s.id === snapshot.current_story_id">
            <div class="s-status">
              @if (s.status === 'estimated') { <span class="sdot done">✓</span> }
              @else if (s.id === snapshot.current_story_id) { <span class="sdot active-dot"></span> }
              @else { <span class="sdot pending"></span> }
            </div>
            <div class="s-main" (click)="canManage && select.emit(s.id)" [class.clickable]="canManage">
              <div class="s-title">{{ s.title }}</div>
              <div class="s-meta">
                @if (s.jira_id) { <span class="mono faint">{{ s.jira_id }}</span> · }
                <span [class]="'pri ' + s.priority">{{ priorityLabel(s.priority) }}</span>
                @if (s.final_estimate) { · <strong class="est">{{ s.final_estimate }} pts</strong> }
              </div>
            </div>
            @if (canManage) {
              <div class="s-actions">
                @if (s.id !== snapshot.current_story_id) {
                  <button class="mini-btn" title="Estimate this" (click)="select.emit(s.id)">▶</button>
                }
                <button class="mini-btn danger" title="Delete" (click)="remove.emit(s.id)">✕</button>
              </div>
            }
          </div>
        }
        @if (snapshot.stories.length === 0) {
          <div class="empty">
            <div class="empty-ic">📭</div>
            <p class="muted">No stories yet.</p>
            @if (canManage) { <p class="faint" style="font-size:13px">Add one to start estimating.</p> }
          </div>
        }
      </div>

      @if (canManage) {
        <div class="slist-foot">
          <button class="btn btn-soft btn-block" (click)="addStory.emit()">+ Add story</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .slist { padding: 6px; max-height: 340px; overflow-y: auto; }
    .srow {
      display: flex; align-items: center; gap: 10px; padding: 10px 10px;
      border-radius: 10px; transition: background 0.15s ease; position: relative;
    }
    .srow:hover { background: var(--surface-2); }
    .srow.active { background: var(--exl-orange-50); }
    .srow.active::before {
      content: ''; position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px;
      background: var(--exl-orange); border-radius: 2px;
    }
    .s-status { width: 22px; display: flex; justify-content: center; }
    .sdot { width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; }
    .sdot.done { background: var(--success); color: #fff; }
    .sdot.active-dot { background: var(--exl-orange); animation: pulse 1.6s ease-in-out infinite; }
    .sdot.pending { background: transparent; border: 2px solid var(--border-strong); }
    .s-main { flex: 1; min-width: 0; }
    .s-main.clickable { cursor: pointer; }
    .s-title { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .s-meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .pri { font-weight: 600; }
    .pri.low { color: var(--text-muted); } .pri.medium { color: var(--info); }
    .pri.high { color: var(--warning); } .pri.critical { color: var(--danger); }
    .est { color: var(--success); }
    .s-actions { display: flex; gap: 4px; opacity: 0; transition: opacity 0.15s ease; }
    .srow:hover .s-actions { opacity: 1; }
    .mini-btn {
      width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--border);
      background: var(--surface); color: var(--text-muted); font-size: 12px;
      display: flex; align-items: center; justify-content: center;
    }
    .mini-btn:hover { border-color: var(--exl-orange); color: var(--exl-orange); }
    .mini-btn.danger:hover { border-color: var(--danger); color: var(--danger); }
    .empty { padding: 28px; text-align: center; }
    .empty-ic { font-size: 34px; margin-bottom: 6px; opacity: 0.6; }
    .empty p { margin: 2px 0; }
    .slist-foot { padding: 12px; border-top: 1px solid var(--border); }
  `],
})
export class StoryListComponent {
  @Input() snapshot!: Snapshot;
  @Input() canManage = false;
  @Output() select = new EventEmitter<string>();
  @Output() remove = new EventEmitter<string>();
  @Output() addStory = new EventEmitter<void>();

  priorityLabel(p: Priority): string { return PRIORITY_LABELS[p]; }
}
