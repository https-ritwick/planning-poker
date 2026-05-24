import { Injectable, computed, signal } from '@angular/core';
import { Identity, Snapshot, UserPublic } from '../models/models';

const ID_KEY = 'exl_pp_identity';
const THEME_KEY = 'exl_pp_theme';

/**
 * Central session store using Angular signals. Holds the current identity,
 * the latest server snapshot, theme, and exposes derived/computed state
 * (current user, current story, my vote, etc.).
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly identity = signal<Identity | null>(this.loadIdentity());
  readonly snapshot = signal<Snapshot | null>(null);
  readonly connected = signal<boolean>(false);
  readonly theme = signal<'light' | 'dark'>(this.loadTheme());

  constructor() {
    this.applyTheme();
  }

  // ---- Identity persistence ----
  setIdentity(id: Identity): void {
    this.identity.set(id);
    localStorage.setItem(ID_KEY, JSON.stringify(id));
  }

  clearIdentity(): void {
    this.identity.set(null);
    this.snapshot.set(null);
    localStorage.removeItem(ID_KEY);
  }

  private loadIdentity(): Identity | null {
    try {
      const raw = localStorage.getItem(ID_KEY);
      return raw ? (JSON.parse(raw) as Identity) : null;
    } catch {
      return null;
    }
  }

  // ---- Theme ----
  toggleTheme(): void {
    const next = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(next);
    localStorage.setItem(THEME_KEY, next);
    this.applyTheme();
  }

  private loadTheme(): 'light' | 'dark' {
    return (localStorage.getItem(THEME_KEY) as 'light' | 'dark') || 'light';
  }

  private applyTheme(): void {
    document.documentElement.setAttribute('data-theme', this.theme());
  }

  // ---- Derived state ----
  readonly me = computed<UserPublic | null>(() => {
    const snap = this.snapshot();
    const id = this.identity();
    if (!snap || !id) return null;
    return snap.users.find((u) => u.id === id.userId) ?? null;
  });

  readonly isAdmin = computed<boolean>(() => this.me()?.is_admin ?? false);

  readonly currentStory = computed(() => {
    const snap = this.snapshot();
    if (!snap || !snap.current_story_id) return null;
    return snap.stories.find((s) => s.id === snap.current_story_id) ?? null;
  });

  readonly myVote = computed<string | null>(() => {
    const snap = this.snapshot();
    const id = this.identity();
    if (!snap || !id || !snap.revealed) {
      // Before reveal we don't get others' votes; we track our own locally.
      return this.localVote();
    }
    return snap.votes[id.userId] ?? null;
  });

  // Local (optimistic) vote, kept because the server hides votes pre-reveal.
  private readonly _localVote = signal<string | null>(null);
  localVote = () => this._localVote();
  setLocalVote(card: string | null): void {
    this._localVote.set(card);
  }
  clearLocalVoteIfRoundReset(snap: Snapshot): void {
    // When a new round starts (no votes recorded for me & not revealed), clear.
    if (!snap.revealed) {
      const id = this.identity();
      const stillVoted = id ? snap.users.find((u) => u.id === id.userId)?.has_voted : false;
      if (!stillVoted) this._localVote.set(null);
    }
  }
}
