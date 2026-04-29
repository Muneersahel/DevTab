import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Command-palette style web search: compact, monospace, waiting for input.
 * Matches DevTab’s instrument-panel language (emerald accents, scanlines).
 */
@Component({
  selector: 'dt-quick-search-dialog',
  imports: [FormsModule],
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-50 flex items-start justify-center pt-[min(18vh,7.5rem)] px-4 sm:px-6"
        role="presentation"
      >
        <div
          class="dt-backdrop-enter fixed inset-0 bg-black/65 backdrop-blur-[3px]"
          aria-hidden="true"
          (click)="close()"
        ></div>

        <section
          class="dt-modal-enter relative w-full max-w-136 overflow-hidden rounded-md border border-white/10 bg-neutral-950 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_28px_90px_-28px_rgba(0,0,0,0.92)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-search-title"
          aria-describedby="quick-search-hint"
          tabindex="-1"
          (keydown.escape)="close()"
        >
          <div
            class="dt-rule-lines pointer-events-none absolute inset-0 opacity-[0.12]"
            aria-hidden="true"
          ></div>

          <header class="relative border-b border-white/6 px-4 pb-3 pt-3.5 sm:px-5 sm:pt-4">
            <p class="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-400/85">
              / invoke · web search
            </p>
            <h2 id="quick-search-title" class="sr-only">Web search command</h2>
            <p class="mt-2 font-mono text-[13px] leading-snug text-zinc-300">
              <span class="text-emerald-400/90" aria-hidden="true">⟩</span>
              <span class="ml-1.5 text-zinc-500">Waiting for your query.</span>
            </p>
            <p
              id="quick-search-hint"
              class="mt-1.5 text-[12px] leading-relaxed text-zinc-600 truncate"
            >
              Uses your browser’s default search when available — fallback URL lives in Settings.
            </p>
          </header>

          <form
            class="relative border-b border-white/6 px-3 py-3 sm:px-4"
            (ngSubmit)="onFormSubmit()"
          >
            <label class="sr-only" for="quick-search-input">Search query</label>
            <div
              class="flex items-stretch gap-0 overflow-hidden rounded-md border border-white/10 bg-black/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[border-color,box-shadow] duration-150 focus-within:border-emerald-400/40 focus-within:shadow-[inset_0_0_0_1px_rgba(52,211,153,0.12),0_0_24px_-8px_rgba(52,211,153,0.15)]"
            >
              <span
                class="flex select-none items-center border-r border-white/8 bg-white/3 px-3 font-mono text-[15px] font-medium leading-none text-emerald-400 tabular-nums"
                aria-hidden="true"
                >&#62;</span
              >
              <input
                #searchQuery
                id="quick-search-input"
                name="searchQuery"
                class="min-w-0 flex-1 border-0 bg-transparent px-3 py-3 font-mono text-[15px] text-zinc-100 caret-emerald-400 placeholder:text-zinc-600 placeholder:opacity-90 focus:outline-none"
                type="text"
                autocomplete="off"
                spellcheck="false"
                placeholder="Type and press return…"
                [ngModel]="query()"
                (ngModelChange)="query.set($event)"
              />
            </div>
          </form>

          <footer
            class="relative flex flex-col gap-2 border-t border-white/6 bg-black/25 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
          >
            <p
              class="order-2 font-mono text-[10px] uppercase tracking-wider text-zinc-600 sm:order-1"
            >
              @if (query().trim()) {
                <span class="text-emerald-400/70">Ready</span>
              } @else {
                Awaiting input
              }
            </p>
            <div
              class="order-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-zinc-500 sm:order-2 sm:justify-end"
            >
              <span class="inline-flex items-center gap-1.5">
                <kbd
                  class="rounded border border-white/12 bg-white/4 px-1.5 py-px text-[10px] text-zinc-400"
                  >esc</kbd
                >
                <span>cancel</span>
              </span>
              <span class="inline-flex items-center gap-1.5">
                <kbd
                  class="rounded border border-white/12 bg-white/4 px-1.5 py-px text-[10px] text-emerald-400/90"
                  >&#8617;</kbd
                >
                <span>run</span>
              </span>
            </div>
          </footer>
        </section>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickSearchDialogComponent {
  private readonly injector = inject(Injector);

  /** When true, the dialog is visible. */
  readonly open = input(false);

  readonly dismissed = output<void>();
  readonly searchRequested = output<string>();

  protected readonly query = signal('');

  private readonly searchField = viewChild<ElementRef<HTMLInputElement>>('searchQuery');

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      this.query.set('');
      afterNextRender(
        () => {
          const el = this.searchField()?.nativeElement;
          el?.focus();
          el?.select();
        },
        { injector: this.injector },
      );
    });
  }

  protected close(): void {
    this.dismissed.emit();
  }

  protected onFormSubmit(): void {
    const text = this.query().trim();
    if (!text) return;
    this.searchRequested.emit(text);
    this.dismissed.emit();
  }
}
