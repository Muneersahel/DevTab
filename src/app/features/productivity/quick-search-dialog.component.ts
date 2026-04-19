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
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'dt-quick-search-dialog',
  imports: [ReactiveFormsModule],
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4" role="presentation">
        <section
          class="w-full max-w-md rounded-xl border border-white/10 bg-zinc-950 p-5 shadow-xl ring-1 ring-white/5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-search-title"
        >
          <h2 id="quick-search-title" class="text-lg font-semibold text-zinc-50">Search the web</h2>
          <p class="mt-1 text-sm text-zinc-500">
            Uses your browser default search when available. Configure a fallback URL in Settings.
          </p>
          <form class="mt-4 flex flex-col gap-3" (ngSubmit)="submit()">
            <label class="text-sm text-zinc-400" for="quick-search-input">Query</label>
            <input
              #searchQuery
              id="quick-search-input"
              class="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
              type="search"
              autocomplete="off"
              placeholder="Search…"
              [formControl]="query"
            />
            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                class="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"
                (click)="close()"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-neutral-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                [disabled]="query.invalid"
              >
                Search
              </button>
            </div>
          </form>
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

  protected readonly query = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(1)],
  });

  private readonly searchField = viewChild<ElementRef<HTMLInputElement>>('searchQuery');

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      this.query.setValue('');
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

  protected submit(): void {
    if (this.query.invalid) {
      this.query.markAsTouched();
      return;
    }
    const text = this.query.value.trim();
    if (!text) return;
    this.searchRequested.emit(text);
    this.dismissed.emit();
  }
}
