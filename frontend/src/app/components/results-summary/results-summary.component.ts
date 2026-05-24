import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CARDS, Snapshot, Stats } from '../../core/models/models';

@Component({
  selector: 'app-results-summary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card results anim-fade">
      <div class="card-header">
        <span class="card-title">📊 Estimation Results</span>
        @if (stats?.consensus) {
          <span class="badge badge-green">✓ Consensus reached</span>
        } @else {
          <span class="badge badge-amber">No consensus</span>
        }
      </div>

      <div class="card-pad">
        <!-- Stat tiles -->
        <div class="stat-grid">
          <div class="stat-tile">
            <div class="stat-val">{{ stats?.average ?? '–' }}</div>
            <div class="stat-lbl">Average</div>
          </div>
          <div class="stat-tile">
            <div class="stat-val">{{ stats?.median ?? '–' }}</div>
            <div class="stat-lbl">Median</div>
          </div>
          <div class="stat-tile">
            <div class="stat-val">{{ stats?.lowest ?? '–' }}</div>
            <div class="stat-lbl">Lowest</div>
          </div>
          <div class="stat-tile">
            <div class="stat-val">{{ stats?.highest ?? '–' }}</div>
            <div class="stat-lbl">Highest</div>
          </div>
          <div class="stat-tile suggest">
            <div class="stat-val">{{ display(stats?.suggested) }}</div>
            <div class="stat-lbl">Suggested</div>
          </div>
        </div>

        <!-- Distribution chart -->
        <div class="dist">
          <div class="dist-label">Vote distribution · {{ stats?.total_votes ?? 0 }} votes</div>
          <div class="bars">
            @for (c of orderedCards(); track c.card) {
              <div class="bar-col">
                <div class="bar-track">
                  <div class="bar-fill" [style.height.%]="barHeight(c.count)" [class.special]="c.special">
                    @if (c.count > 0) { <span class="bar-count">{{ c.count }}</span> }
                  </div>
                </div>
                <div class="bar-card" [class.special-card]="c.special">{{ display(c.card) }}</div>
              </div>
            }
          </div>
        </div>

        <!-- Individual votes -->
        <div class="votes-list">
          <div class="dist-label">Individual votes</div>
          <div class="vote-pills">
            @for (v of individualVotes(); track v.name) {
              <div class="vote-pill">
                <span class="vp-name">{{ v.name }}</span>
                <span class="vp-card" [class.special-card]="v.special">{{ display(v.card) }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Finalize (admin only) -->
        @if (isAdmin && story && story.status !== 'estimated') {
          <div class="divider"></div>
          <div class="finalize">
            <div class="dist-label">Set final estimate</div>
            <div class="final-picker">
              @for (c of numericChoices(); track c) {
                <button class="final-chip" [class.active]="chosen === c" (click)="chosen = c">{{ c }}</button>
              }
            </div>
            <div class="row gap-12" style="margin-top:14px; flex-wrap:wrap">
              <button class="btn btn-soft" (click)="acceptSuggested()" [disabled]="!stats?.suggested">
                Accept suggested ({{ display(stats?.suggested) }})
              </button>
              <button class="btn btn-success grow" (click)="confirmFinal()" [disabled]="!chosen">
                ✓ Finalize estimate
              </button>
            </div>
          </div>
        }

        @if (story?.status === 'estimated') {
          <div class="divider"></div>
          <div class="finalized-banner">
            <span class="fb-icon">✓</span>
            <div>
              <div class="fb-title">Story estimated</div>
              <div class="fb-sub muted">Final estimate set to <strong>{{ story?.final_estimate }}</strong> points.</div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .stat-grid {
      display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 24px;
    }
    .stat-tile {
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: 12px; padding: 14px 10px; text-align: center;
    }
    .stat-tile.suggest { background: var(--exl-orange-50); border-color: var(--exl-orange-light); }
    .stat-val { font-family: var(--font-display); font-weight: 800; font-size: 26px; color: var(--text); }
    .stat-tile.suggest .stat-val { color: var(--exl-orange-dark); }
    .stat-lbl { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-top: 4px; font-weight: 600; }

    .dist { margin-bottom: 22px; }
    .dist-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 12px; }
    .bars { display: flex; align-items: flex-end; gap: 6px; height: 140px; }
    .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
    .bar-track { flex: 1; width: 100%; display: flex; align-items: flex-end; }
    .bar-fill {
      width: 100%; background: var(--exl-orange); border-radius: 6px 6px 0 0;
      min-height: 3px; position: relative; transition: height 0.5s cubic-bezier(0.2,0.8,0.2,1);
      display: flex; align-items: flex-start; justify-content: center;
    }
    .bar-fill.special { background: var(--text-muted); }
    .bar-count { color: #fff; font-size: 11px; font-weight: 700; margin-top: 3px; }
    .bar-card { font-size: 12px; font-weight: 700; margin-top: 6px; color: var(--text-muted); }
    .bar-card.special-card { color: var(--text-faint); }

    .votes-list { margin-bottom: 4px; }
    .vote-pills { display: flex; flex-wrap: wrap; gap: 8px; }
    .vote-pill {
      display: flex; align-items: center; gap: 8px; background: var(--surface-2);
      border: 1px solid var(--border); border-radius: 999px; padding: 5px 6px 5px 12px;
    }
    .vp-name { font-size: 13px; font-weight: 500; }
    .vp-card {
      min-width: 26px; height: 26px; border-radius: 50%; background: var(--exl-orange);
      color: #fff; font-weight: 700; font-size: 12px;
      display: flex; align-items: center; justify-content: center;
    }
    .vp-card.special-card { background: var(--text-muted); }

    .final-picker { display: flex; flex-wrap: wrap; gap: 8px; }
    .final-chip {
      min-width: 46px; height: 44px; border-radius: 10px; border: 2px solid var(--border-strong);
      background: var(--surface); font-weight: 700; font-size: 15px; color: var(--text);
      transition: all 0.15s ease;
    }
    .final-chip:hover { border-color: var(--exl-orange); }
    .final-chip.active { background: var(--exl-orange); color: #fff; border-color: var(--exl-orange-dark); }

    .finalized-banner { display: flex; align-items: center; gap: 14px; }
    .fb-icon {
      width: 40px; height: 40px; border-radius: 50%; background: var(--success); color: #fff;
      display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700;
    }
    .fb-title { font-weight: 700; font-size: 15px; }
    .fb-sub { font-size: 13px; }

    @media (max-width: 640px) {
      .stat-grid { grid-template-columns: repeat(3, 1fr); }
    }
  `],
})
export class ResultsSummaryComponent {
  @Input() snapshot!: Snapshot;
  @Input() isAdmin = false;
  @Output() finalize = new EventEmitter<string>();

  chosen: string | null = null;

  get stats(): Stats | null { return this.snapshot?.stats ?? null; }
  get story() {
    if (!this.snapshot?.current_story_id) return null;
    return this.snapshot.stories.find((s) => s.id === this.snapshot.current_story_id) ?? null;
  }

  display(card: string | null | undefined): string {
    if (card == null) return '–';
    return card === 'coffee' ? '☕' : card;
  }

  numericChoices(): string[] {
    return ['0', '1', '2', '3', '5', '8', '13', '21', '34'];
  }

  orderedCards(): { card: string; count: number; special: boolean }[] {
    const dist = this.stats?.distribution ?? {};
    return CARDS.map((card) => ({
      card,
      count: dist[card] ?? 0,
      special: card === '?' || card === 'coffee',
    }));
  }

  barHeight(count: number): number {
    const dist = this.stats?.distribution ?? {};
    const max = Math.max(1, ...Object.values(dist));
    return (count / max) * 100;
  }

  individualVotes(): { name: string; card: string; special: boolean }[] {
    const votes = this.snapshot?.votes ?? {};
    const names = this.snapshot?.vote_names ?? {};
    return Object.entries(votes).map(([uid, card]) => ({
      name: names[uid] ?? 'Unknown',
      card,
      special: card === '?' || card === 'coffee',
    }));
  }

  acceptSuggested(): void {
    if (this.stats?.suggested) this.chosen = this.stats.suggested;
  }

  confirmFinal(): void {
    if (this.chosen) this.finalize.emit(this.chosen);
  }
}
