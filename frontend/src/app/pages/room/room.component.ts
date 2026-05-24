import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ApiService } from '../../core/services/api.service';
import { WsService } from '../../core/services/ws.service';
import { SessionService } from '../../core/services/session.service';
import { ToastService } from '../../core/services/toast.service';
import { Priority } from '../../core/models/models';

import { VotingCardsComponent } from '../../components/voting-cards/voting-cards.component';
import { ParticipantsPanelComponent } from '../../components/participants-panel/participants-panel.component';
import { StoryPanelComponent } from '../../components/story-panel/story-panel.component';
import { StoryListComponent } from '../../components/story-list/story-list.component';
import { AdminControlsComponent } from '../../components/admin-controls/admin-controls.component';
import { ResultsSummaryComponent } from '../../components/results-summary/results-summary.component';

@Component({
  selector: 'app-room',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    VotingCardsComponent,
    ParticipantsPanelComponent,
    StoryPanelComponent,
    StoryListComponent,
    AdminControlsComponent,
    ResultsSummaryComponent,
  ],
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.css'],
})
export class RoomComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private ws = inject(WsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  toast = inject(ToastService);
  session = inject(SessionService);

  roomId = '';

  // Modal / UI state
  showStoryModal = signal(false);
  showConfirm = signal<null | { title: string; message: string; action: () => void }>(null);
  showSummary = signal(false);

  // Story form
  storyForm = {
    title: '',
    description: '',
    acceptance_criteria: '',
    priority: 'medium' as Priority,
    jira_id: '',
  };

  // expose signals to template
  snapshot = this.session.snapshot;
  me = this.session.me;
  isAdmin = this.session.isAdmin;
  currentStory = this.session.currentStory;
  connected = this.session.connected;

  readonly canVote = computed(() => {
    const me = this.me();
    return !!me && me.can_vote && !this.snapshot()?.revealed;
  });

  ngOnInit(): void {
    this.roomId = this.route.snapshot.paramMap.get('roomId') ?? '';
    const id = this.session.identity();

    // If identity is missing or for a different room, send them to join.
    if (!id || id.roomId !== this.roomId) {
      this.router.navigate(['/join', this.roomId]);
      return;
    }

    // Prime with a REST snapshot, then open the socket for live updates.
    this.api.getRoom(this.roomId).subscribe({
      next: (snap) => this.session.snapshot.set(snap),
      error: () => {
        this.toast.error('Room not found.');
        this.router.navigate(['/']);
      },
    });

    this.ws.snapshot$.subscribe((snap) => {
      this.session.snapshot.set(snap);
      this.session.clearLocalVoteIfRoundReset(snap);
    });
    this.ws.status$.subscribe((s) => this.session.connected.set(s === 'open'));
    this.ws.connect(this.roomId, id.userId);
  }

  ngOnDestroy(): void {
    this.ws.disconnect();
  }

  // ---------------- Voting ----------------
  onVote(card: string): void {
    if (!this.canVote()) return;
    this.session.setLocalVote(card);
    this.ws.sendVote(card); // low-latency path; backend broadcasts new state
    this.toast.info(`You voted ${card === 'coffee' ? '☕' : card}`);
  }

  // ---------------- Admin: round ----------------
  reveal(): void {
    const id = this.session.identity()!;
    this.api.reveal(this.roomId, id.userId).subscribe({
      error: () => this.toast.error('Could not reveal votes.'),
    });
  }

  reset(): void {
    const id = this.session.identity()!;
    this.api.reset(this.roomId, id.userId).subscribe({
      next: () => {
        this.session.setLocalVote(null);
        this.toast.info('Round reset.');
      },
      error: () => this.toast.error('Could not reset.'),
    });
  }

  startTimer(opts: { seconds: number; autoReveal: boolean }): void {
    const id = this.session.identity()!;
    this.api.startTimer(this.roomId, id.userId, opts.seconds, opts.autoReveal).subscribe({
      next: () => this.toast.info(`Timer started: ${opts.seconds}s`),
      error: () => this.toast.error('Could not start timer.'),
    });
  }

  finalize(estimate: string): void {
    const id = this.session.identity()!;
    const story = this.currentStory();
    if (!story) return;
    this.api.finalize(this.roomId, id.userId, story.id, estimate).subscribe({
      next: () => {
        this.session.setLocalVote(null);
        this.toast.success(`Story finalized at ${estimate} points.`);
      },
      error: () => this.toast.error('Could not finalize.'),
    });
  }

  // ---------------- Admin: stories ----------------
  openStoryModal(): void {
    this.storyForm = { title: '', description: '', acceptance_criteria: '', priority: 'medium', jira_id: '' };
    this.showStoryModal.set(true);
  }

  submitStory(): void {
    if (!this.storyForm.title.trim()) {
      this.toast.warning('Story title is required.');
      return;
    }
    const id = this.session.identity()!;
    this.api
      .addStory(this.roomId, id.userId, {
        title: this.storyForm.title.trim(),
        description: this.storyForm.description.trim(),
        acceptance_criteria: this.storyForm.acceptance_criteria.trim(),
        priority: this.storyForm.priority,
        jira_id: this.storyForm.jira_id.trim() || null,
      })
      .subscribe({
        next: () => {
          this.showStoryModal.set(false);
          this.toast.success('Story added to backlog.');
        },
        error: () => this.toast.error('Could not add story.'),
      });
  }

  selectStory(storyId: string): void {
    const id = this.session.identity()!;
    this.api.activateStory(this.roomId, id.userId, storyId).subscribe({
      next: () => this.session.setLocalVote(null),
      error: () => this.toast.error('Could not switch story.'),
    });
  }

  confirmDeleteStory(storyId: string): void {
    this.showConfirm.set({
      title: 'Delete story?',
      message: 'This will permanently remove the story from the backlog.',
      action: () => {
        const id = this.session.identity()!;
        this.api.deleteStory(this.roomId, id.userId, storyId).subscribe({
          next: () => this.toast.info('Story deleted.'),
          error: () => this.toast.error('Could not delete story.'),
        });
        this.showConfirm.set(null);
      },
    });
  }

  // ---------------- Misc ----------------
  copyInvite(): void {
    const link = `${location.origin}/join/${this.roomId}`;
    navigator.clipboard.writeText(link).then(
      () => this.toast.success('Invite link copied!'),
      () => this.toast.error('Copy failed — copy it manually.')
    );
  }

  copyRoomId(): void {
    navigator.clipboard.writeText(this.roomId).then(
      () => this.toast.success('Room ID copied!'),
      () => this.toast.error('Copy failed.')
    );
  }

  export(fmt: 'json' | 'csv'): void {
    window.open(this.api.exportUrl(this.roomId, fmt), '_blank');
  }

  toggleTheme(): void { this.session.toggleTheme(); }

  confirmLeave(): void {
    this.showConfirm.set({
      title: 'Leave session?',
      message: 'You can rejoin later using the same room ID.',
      action: () => {
        this.ws.disconnect();
        this.session.clearIdentity();
        this.router.navigate(['/']);
      },
    });
  }

  get inviteLink(): string {
    return `${location.origin}/join/${this.roomId}`;
  }

  get theme() { return this.session.theme(); }

  // ---------------- Template helpers ----------------
  votedCount(snap: import('../../core/models/models').Snapshot): number {
    return snap.users.filter((u) => u.can_vote && u.has_voted).length;
  }

  voterCount(snap: import('../../core/models/models').Snapshot): number {
    return snap.users.filter((u) => u.can_vote).length;
  }

  totalPoints(snap: import('../../core/models/models').Snapshot): number {
    return snap.stories.reduce((sum, s) => {
      const n = s.final_estimate ? parseInt(s.final_estimate, 10) : NaN;
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
  }

  jiraFor(snap: import('../../core/models/models').Snapshot, storyId: string): string {
    return snap.stories.find((s) => s.id === storyId)?.jira_id ?? '–';
  }
}
