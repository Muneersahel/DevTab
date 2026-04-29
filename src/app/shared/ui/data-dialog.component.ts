import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { UsageItem } from '../../core/models/dashboard.model';
import {
  lockDocumentBodyScroll,
  unlockDocumentBodyScroll,
} from '../../core/utils/document-scroll-lock';
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
      class="dt-dialog m-auto flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/8 bg-zinc-950/95 p-0 text-zinc-100 shadow-[0_30px_120px_-30px_rgba(16,185,129,0.35)] backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      (close)="dismissed.emit()"
    >
      <div class="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <button
          type="button"
          class="absolute inset-0 z-0 m-0 cursor-default border-0 bg-transparent p-0"
          aria-label="Dismiss dialog"
          (click)="close()"
        ></button>
        <div class="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
          <header
            class="flex shrink-0 items-start justify-between gap-4 border-b border-white/6 bg-zinc-950/95 px-6 py-5"
          >
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

          <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
            <dt-usage-list
              [items]="items()"
              [showSwatch]="showSwatch()"
              [accent]="accent()"
              emptyMessage="No data to show."
            />
          </div>
        </div>
      </div>
    </dialog>
  `,
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
    effect((onCleanup) => {
      if (!this.open()) return;

      const dialog = this.dialogRef()?.nativeElement;
      if (!dialog) return;

      if (!dialog.open) {
        dialog.showModal?.();
      }
      lockDocumentBodyScroll(this.document);

      onCleanup(() => {
        unlockDocumentBodyScroll(this.document);
        if (dialog.open) {
          dialog.close?.();
        }
      });
    });
  }

  protected close(): void {
    this.dialogRef()?.nativeElement.close?.();
  }
}
