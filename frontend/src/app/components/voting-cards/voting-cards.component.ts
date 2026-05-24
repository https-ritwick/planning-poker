import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CARDS } from '../../core/models/models';

@Component({
  selector: 'app-voting-cards',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="deck">
      @for (card of cards; track card) {
        <button
          class="poker-card"
          [class.selected]="selected === card"
          [class.special]="card === '?' || card === 'coffee'"
          [disabled]="disabled"
          (click)="pick(card)"
        >
          <span class="card-face">{{ display(card) }}</span>
          <span class="card-corner top">{{ display(card) }}</span>
          <span class="card-corner bot">{{ display(card) }}</span>
        </button>
      }
    </div>
  `,
  styles: [`
    .deck {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(72px, 1fr));
      gap: 12px;
    }
    .poker-card {
      position: relative;
      aspect-ratio: 3 / 4.2;
      border-radius: 12px;
      border: 2px solid var(--border-strong);
      background: var(--surface);
      color: var(--text);
      font-family: var(--font-display);
      font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.14s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease;
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }
    .poker-card:hover:not(:disabled) {
      transform: translateY(-6px);
      border-color: var(--exl-orange);
      box-shadow: var(--shadow);
    }
    .poker-card:disabled { opacity: 0.45; cursor: not-allowed; }
    .poker-card.selected {
      background: var(--exl-orange);
      border-color: var(--exl-orange-dark);
      color: #fff;
      transform: translateY(-6px);
      box-shadow: var(--shadow-orange);
    }
    .poker-card.special .card-face { font-size: 20px; }
    .card-face { font-size: 26px; line-height: 1; }
    .card-corner {
      position: absolute; font-size: 11px; font-weight: 700; opacity: 0.55;
    }
    .card-corner.top { top: 6px; left: 8px; }
    .card-corner.bot { bottom: 6px; right: 8px; transform: rotate(180deg); }
    .poker-card.special .card-corner { font-size: 10px; }
  `],
})
export class VotingCardsComponent {
  cards = CARDS;
  @Input() selected: string | null = null;
  @Input() disabled = false;
  @Output() vote = new EventEmitter<string>();

  display(card: string): string {
    return card === 'coffee' ? '☕' : card;
  }

  pick(card: string): void {
    if (this.disabled) return;
    this.vote.emit(card);
  }
}
