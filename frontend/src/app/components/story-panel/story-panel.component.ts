import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PRIORITY_LABELS, Priority, Story } from '../../core/models/models';

@Component({
  selector: 'app-story-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (story) {
      <div class="card story-card anim-fade">
        <div class="story-top">
          <div class="story-tags">
            @if (story.jira_id) { <span class="badge badge-blue mono">{{ story.jira_id }}</span> }
            <span class="badge" [class]="priorityClass(story.priority)">{{ priorityLabel(story.priority) }}</span>
            @if (story.status === 'estimated') {
              <span class="badge badge-green">✓ Estimated · {{ story.final_estimate }}</span>
            } @else {
              <span class="badge badge-amber">In estimation</span>
            }
          </div>
        </div>
        <h2 class="story-title">{{ story.title }}</h2>
        @if (story.description) {
          <p class="story-desc">{{ story.description }}</p>
        }
        @if (story.acceptance_criteria) {
          <div class="ac-block">
            <div class="ac-label">Acceptance Criteria</div>
            <p class="ac-text">{{ story.acceptance_criteria }}</p>
          </div>
        }
      </div>
    } @else {
      <div class="card empty-story">
        <div class="empty-illustration">🃏</div>
        <h3>No story selected</h3>
        <p class="muted">
          The Scrum Master hasn't picked a story to estimate yet.
          Sit tight — voting will begin shortly.
        </p>
      </div>
    }
  `,
  styles: [`
    .story-card { padding: 24px; }
    .story-top { margin-bottom: 14px; }
    .story-tags { display: flex; flex-wrap: wrap; gap: 8px; }
    .story-title { font-size: 24px; line-height: 1.25; margin-bottom: 12px; }
    .story-desc { font-size: 15px; line-height: 1.6; color: var(--text-muted); margin: 0 0 16px; white-space: pre-wrap; }
    .ac-block {
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: 12px; padding: 14px 16px;
    }
    .ac-label {
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
      color: var(--exl-orange-dark); margin-bottom: 6px;
    }
    .ac-text { font-size: 14px; line-height: 1.6; color: var(--text); margin: 0; white-space: pre-wrap; }
    .empty-story { padding: 48px 24px; text-align: center; }
    .empty-illustration { font-size: 52px; margin-bottom: 12px; opacity: 0.7; }
    .empty-story h3 { font-size: 19px; margin-bottom: 8px; }
    .empty-story p { font-size: 14px; max-width: 360px; margin: 0 auto; line-height: 1.6; }
  `],
})
export class StoryPanelComponent {
  @Input() story: Story | null = null;

  priorityLabel(p: Priority): string { return PRIORITY_LABELS[p]; }
  priorityClass(p: Priority): string {
    return {
      low: 'badge-gray',
      medium: 'badge-blue',
      high: 'badge-amber',
      critical: 'badge-red',
    }[p];
  }
}
