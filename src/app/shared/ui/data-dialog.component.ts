import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { UsageItem } from '../../core/models/dashboard.model';
import { UsageListComponent } from './usage-list.component';

/**
 * Lightweight modal that surfaces the full version of a usage list when the
 * compact preview on the dashboard is truncated. Built on the native
 * <dialog> element so we get focus trapping, ESC to close, and inert
 * background out of the box.
 */
@Component({
  selector: 'dt-data-dialog',
  imports: [UsageListComponent],
  template: `
    <dialog
      #dialog
      class="dt-dialog m-auto w-full max-w-lg rounded-2xl border border-white/8 bg-zinc-950/95 p-0 text-zinc-100 shadow-[0_30px_120px_-30px_rgba(16,185,129,0.35)] backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      (close)="dismissed.emit()"
      (click)="onBackdropClick($event)"
    >
      <div class="relative flex max-h-[80vh] flex-col">
        <header class="flex items-start justify-between gap-4 border-b border-white/6 px-6 py-5">
          <div class="min-w-0">
            <p class="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              {{ eyebrow() }}
            </p>
            <h2 class="mt-1 truncate text-base font-semibold text-zinc-50">{{ title() }}</h2>
            <p class="mt-1 text-[12px] text-zinc-500">Showing all {{ items().length }} entries</p>
          </div>
          <button
            type="button"
            class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/4 text-zinc-300 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
            (click)="close()"
            aria-label="Close dialog"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        <div class="overflow-y-auto px-6 py-5">
          <dt-usage-list
            [items]="items()"
            [showSwatch]="showSwatch()"
            [accent]="accent()"
            emptyMessage="No data to show."
          />
        </div>
      </div>
    </dialog>
  `,
  styles: [
    `
      .dt-dialog {
        opacity: 0;
        transform: translateY(8px) scale(0.98);
        transition:
          opacity 160ms ease-out,
          transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1),
          overlay 200ms ease-out allow-discrete,
          display 200ms ease-out allow-discrete;
      }
      .dt-dialog[open] {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      @starting-style {
        .dt-dialog[open] {
          opacity: 0;
          transform: translateY(8px) scale(0.98);
        }
      }
      .dt-dialog::backdrop {
        opacity: 0;
        transition:
          opacity 200ms ease-out,
          overlay 200ms ease-out allow-discrete,
          display 200ms ease-out allow-discrete;
      }
      .dt-dialog[open]::backdrop {
        opacity: 1;
      }
      @starting-style {
        .dt-dialog[open]::backdrop {
          opacity: 0;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataDialogComponent {
  readonly open = input.required<boolean>();
  readonly title = input.required<string>();
  readonly eyebrow = input<string>('All entries');
  readonly items = input.required<UsageItem[]>();
  readonly accent = input<string>('#34d399');
  readonly showSwatch = input<boolean>(false);
  readonly dismissed = output<void>();

  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly document = inject(DOCUMENT);

  constructor() {
    const destroyRef = inject(DestroyRef);
    // Restore scroll if the component is torn down while the dialog is open.
    destroyRef.onDestroy(() => this.setBodyScrollLocked(false));

    effect(() => {
      const dialog = this.dialogRef()?.nativeElement;
      if (!dialog) return;

      if (this.open()) {
        if (!dialog.open) dialog.showModal();
        this.setBodyScrollLocked(true);
      } else {
        if (dialog.open) dialog.close();
        this.setBodyScrollLocked(false);
      }
    });
  }

  protected close(): void {
    this.dialogRef()?.nativeElement.close();
  }

  protected onBackdropClick(event: MouseEvent): void {
    // The dialog element itself receives clicks on its backdrop because the
    // backdrop is a pseudo-element. When the click target is the dialog
    // (not a child), it means the user clicked outside the inner card.
    if (event.target === this.dialogRef()?.nativeElement) {
      this.close();
    }
  }

  /**
   * Lock body scroll while the modal is open so the page behind the
   * backdrop stays put. Compensate for the disappearing scrollbar via
   * `padding-right` to avoid a layout shift on desktop browsers that
   * reserve scrollbar gutter.
   */
  private setBodyScrollLocked(locked: boolean): void {
    const body = this.document.body;
    if (!body) return;

    if (locked) {
      const scrollbarWidth = window.innerWidth - this.document.documentElement.clientWidth;
      body.dataset['dtPrevOverflow'] = body.style.overflow;
      body.dataset['dtPrevPaddingRight'] = body.style.paddingRight;
      body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        body.style.paddingRight = `${scrollbarWidth}px`;
      }
    } else {
      body.style.overflow = body.dataset['dtPrevOverflow'] ?? '';
      body.style.paddingRight = body.dataset['dtPrevPaddingRight'] ?? '';
      delete body.dataset['dtPrevOverflow'];
      delete body.dataset['dtPrevPaddingRight'];
    }
  }
}
