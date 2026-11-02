import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
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
 * Command-palette web search: one large field, a list of actions (search, and
 * open when the query looks like a link), and keyboard hints. Searches with
 * the browser's default engine.
 */
@Component({
  selector: 'dt-quick-search-dialog',
  imports: [FormsModule],
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[min(18vh,8rem)] sm:px-6"
        role="presentation"
      >
        <div
          class="dt-backdrop-enter fixed inset-0 bg-black/60 backdrop-blur-sm"
          aria-hidden="true"
          (click)="close()"
        ></div>

        <section
          class="dt-modal-enter relative w-full max-w-xl overflow-hidden rounded-xl border border-white/10 bg-zinc-900/95 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-label="Search the web"
          tabindex="-1"
          (keydown.escape)="close()"
        >
          <form (ngSubmit)="onFormSubmit()">
            <div
              class="flex items-center gap-3 border-b border-white/8 px-4 transition-colors focus-within:border-emerald-400/50"
            >
              <svg
                class="h-5 w-5 shrink-0 text-zinc-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                #searchQuery
                id="quick-search-input"
                name="searchQuery"
                class="h-14 min-w-0 flex-1 bg-transparent text-[16px] text-zinc-50 caret-emerald-400 placeholder:text-zinc-400 focus:outline-none"
                type="text"
                autocomplete="off"
                spellcheck="false"
                placeholder="Search the web or enter a link…"
                aria-label="Search the web or enter a link"
                aria-describedby="quick-search-hint"
                role="combobox"
                aria-autocomplete="list"
                aria-controls="quick-search-actions"
                [attr.aria-expanded]="actions().length > 0"
                [attr.aria-activedescendant]="
                  actions().length ? 'quick-search-action-' + activeIndex() : null
                "
                [ngModel]="query()"
                (ngModelChange)="onQueryChange($event)"
                (keydown.arrowdown)="moveActive(1, $event)"
                (keydown.arrowup)="moveActive(-1, $event)"
              />
              @if (query()) {
                <button
                  type="button"
                  class="rounded-md p-1 text-zinc-400 hover:bg-white/8 hover:text-zinc-100"
                  aria-label="Clear search"
                  (click)="clear()"
                >
                  <svg
                    class="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    aria-hidden="true"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              }
            </div>

            <div class="p-2">
              <div
                id="quick-search-actions"
                class="space-y-1"
                role="listbox"
                aria-label="Actions"
                [class.hidden]="!actions().length"
              >
                @for (action of actions(); track action.kind; let i = $index) {
                  <button
                    [id]="'quick-search-action-' + i"
                    type="button"
                    role="option"
                    tabindex="-1"
                    class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
                    [class.bg-white/8]="i === activeIndex()"
                    [attr.aria-selected]="i === activeIndex()"
                    (mousemove)="activeIndex.set(i)"
                    (click)="run(action)"
                  >
                    <span
                      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                      [class.bg-emerald-400/12]="action.kind === 'search'"
                      [class.text-emerald-300]="action.kind === 'search'"
                      [class.bg-sky-400/12]="action.kind === 'open'"
                      [class.text-sky-300]="action.kind === 'open'"
                      aria-hidden="true"
                    >
                      <svg
                        class="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        @if (action.kind === 'open') {
                          <path d="M7 17 17 7" />
                          <path d="M8 7h9v9" />
                        } @else {
                          <circle cx="12" cy="12" r="9" />
                          <path d="M3 12h18" />
                          <path d="M12 3a14 14 0 0 1 0 18" />
                          <path d="M12 3a14 14 0 0 0 0 18" />
                        }
                      </svg>
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-[14px] font-medium text-zinc-100">{{
                        action.label
                      }}</span>
                      <span class="block truncate text-[12px] text-zinc-400">{{
                        action.detail
                      }}</span>
                    </span>
                    @if (i === activeIndex()) {
                      <kbd
                        class="shrink-0 rounded border border-white/12 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-zinc-300"
                        aria-hidden="true"
                        >↵</kbd
                      >
                    }
                  </button>
                }
              </div>
              @if (!actions().length) {
                <p class="px-3 py-5 text-center text-[13px] text-zinc-400">
                  Type to search the web, or paste a link to open it.
                </p>
              }
            </div>
          </form>

          <footer
            class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-white/6 bg-black/20 px-4 py-2.5 text-[11px] text-zinc-400"
          >
            <p id="quick-search-hint">Default search engine · fallback URL in Settings</p>
            <p class="flex items-center gap-3" aria-hidden="true">
              <span class="inline-flex items-center gap-1.5">
                <kbd
                  class="rounded border border-white/12 bg-white/5 px-1.5 py-px font-mono text-zinc-300"
                  >↑↓</kbd
                >
                choose
              </span>
              <span class="inline-flex items-center gap-1.5">
                <kbd
                  class="rounded border border-white/12 bg-white/5 px-1.5 py-px font-mono text-zinc-300"
                  >↵</kbd
                >
                run
              </span>
              <span class="inline-flex items-center gap-1.5">
                <kbd
                  class="rounded border border-white/12 bg-white/5 px-1.5 py-px font-mono text-zinc-300"
                  >esc</kbd
                >
                close
              </span>
            </p>
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
  readonly urlRequested = output<string>();

  protected readonly query = signal('');
  protected readonly activeIndex = signal(0);

  /** Search is always offered; a link-like query adds an "Open" action. */
  protected readonly actions = computed((): PaletteAction[] => {
    const text = this.query().trim();
    if (!text) return [];

    const search: PaletteAction = {
      kind: 'search',
      label: text,
      detail: 'Search the web',
      value: text,
    };
    const link = parseLink(text);
    if (!link) return [search];

    const open: PaletteAction = { kind: 'open', label: text, detail: link.url, value: link.url };
    return link.likely ? [open, search] : [search, open];
  });

  private readonly searchField = viewChild<ElementRef<HTMLInputElement>>('searchQuery');

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      this.onQueryChange('');
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

  protected onQueryChange(value: string): void {
    this.query.set(value);
    this.activeIndex.set(0);
  }

  protected moveActive(step: number, event: Event): void {
    const count = this.actions().length;
    if (!count) return;
    event.preventDefault();
    this.activeIndex.update((i) => (i + step + count) % count);
  }

  protected close(): void {
    this.dismissed.emit();
  }

  protected clear(): void {
    this.onQueryChange('');
    this.searchField()?.nativeElement.focus();
  }

  protected onFormSubmit(): void {
    const action = this.actions()[this.activeIndex()];
    if (action) this.run(action);
  }

  protected run(action: PaletteAction): void {
    if (action.kind === 'open') {
      this.urlRequested.emit(action.value);
    } else {
      this.searchRequested.emit(action.value);
    }
    this.dismissed.emit();
  }
}

interface PaletteAction {
  kind: 'open' | 'search';
  label: string;
  detail: string;
  /** URL to open, or text to search for. */
  value: string;
}

const LOCAL_HOST = /^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/|$)/i;
// A bare `name.tld` is only treated as a link by default for these endings, so
// queries like "node.js" or "readme.md" still search first.
const COMMON_TLDS = new Set([
  'com',
  'org',
  'net',
  'io',
  'dev',
  'app',
  'co',
  'ai',
  'me',
  'gov',
  'edu',
]);

/**
 * Detects link-like input. `likely` marks input that is clearly a link (scheme,
 * `www.`, a path or port, a local address, or a common domain ending), so
 * opening it becomes the default action.
 */
function parseLink(text: string): { url: string; likely: boolean } | null {
  if (/\s/.test(text)) return null;

  const hasScheme = /^https?:\/\//i.test(text);
  if (!hasScheme && /^[a-z][a-z\d+.-]*:/i.test(text) && !LOCAL_HOST.test(text)) return null;

  const isLocal = !hasScheme && LOCAL_HOST.test(text);
  let url: URL;
  try {
    url = new URL(hasScheme ? text : `${isLocal ? 'http' : 'https'}://${text}`);
  } catch {
    return null;
  }

  const host = url.hostname;
  const tld = host.split('.').pop() ?? '';
  if (!hasScheme && !isLocal && !/^[a-z]{2,}$/i.test(tld)) return null;
  if (!hasScheme && !isLocal && !host.includes('.')) return null;

  const likely =
    hasScheme ||
    isLocal ||
    host.startsWith('www.') ||
    url.pathname !== '/' ||
    url.port !== '' ||
    COMMON_TLDS.has(tld.toLowerCase());

  return { url: url.href, likely };
}
