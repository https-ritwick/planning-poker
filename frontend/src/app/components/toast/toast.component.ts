import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-wrap">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class]="'toast-' + t.kind" (click)="toast.dismiss(t.id)">
          <span class="toast-icon">{{ icon(t.kind) }}</span>
          <span class="toast-msg">{{ t.message }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-wrap {
      position: fixed; bottom: 24px; right: 24px; z-index: 1000;
      display: flex; flex-direction: column; gap: 10px; max-width: 360px;
    }
    .toast {
      display: flex; align-items: center; gap: 10px;
      background: var(--surface); border: 1px solid var(--border);
      border-left: 4px solid var(--text-muted);
      box-shadow: var(--shadow-lg); border-radius: 12px;
      padding: 13px 16px; font-size: 14px; font-weight: 500; color: var(--text);
      cursor: pointer; animation: fadeUp 0.25s ease both;
    }
    .toast-icon { font-size: 16px; }
    .toast-success { border-left-color: var(--success); }
    .toast-error   { border-left-color: var(--danger); }
    .toast-info    { border-left-color: var(--exl-orange); }
    .toast-warning { border-left-color: var(--warning); }
    @media (max-width: 640px) {
      .toast-wrap { left: 14px; right: 14px; bottom: 14px; max-width: none; }
    }
  `],
})
export class ToastComponent {
  toast = inject(ToastService);
  icon(k: string): string {
    return { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' }[k] ?? 'ℹ';
  }
}
