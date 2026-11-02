import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TaskStoreService } from '../../core/services/task-store.service';
import { formatDueDate, parseTaskInput, type ParsedTaskInput } from '../../core/utils/task-due';

/**
 * Quick-capture field shared by the Up next panel and the tasks dialog. A
 * trailing date word ("tomorrow", "fri", "next week") becomes the due date,
 * previewed as a chip that can be dismissed to keep the word in the title.
 */
@Component({
  selector: 'dt-task-capture',
  imports: [FormsModule],
  template: `
    <form (ngSubmit)="submit()">
      <div
        class="flex items-center gap-2.5 rounded-lg border border-white/10 bg-black/30 px-3 transition-colors focus-within:border-emerald-400/50"
      >
        <svg
          class="h-4 w-4 shrink-0 text-emerald-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
        <label class="sr-only" [for]="inputId()">Add a task</label>
        <input
          #field
          [id]="inputId()"
          name="taskTitle"
          class="h-10 min-w-0 flex-1 bg-transparent text-[14px] text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
          type="text"
          placeholder="Add a task…"
          autocomplete="off"
          [attr.aria-describedby]="parsed().dueAt ? inputId() + '-due' : null"
          [ngModel]="text()"
          (ngModelChange)="text.set($event)"
        />
        @if (parsed().dueAt; as dueAt) {
          <span
            class="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-400/12 py-0.5 pr-0.5 pl-2 font-mono text-[11px] text-amber-200"
          >
            <span [id]="inputId() + '-due'"
              ><span class="sr-only">Due </span>{{ dueLabel(dueAt) }}</span
            >
            <button
              type="button"
              class="rounded-full p-0.5 text-amber-200/80 hover:bg-white/10 hover:text-amber-100"
              [attr.aria-label]="'Keep “' + parsed().dateText + '” as text'"
              (click)="keepAsText()"
            >
              <svg
                class="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </span>
        } @else {
          <kbd
            class="hidden rounded border border-white/12 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-zinc-300 sm:inline"
            aria-hidden="true"
            >↵</kbd
          >
        }
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCaptureComponent {
  readonly inputId = input.required<string>();

  private readonly store = inject(TaskStoreService);
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  protected readonly text = signal('');
  /** Text for which the user dismissed the date chip; typing anything else re-enables parsing. */
  private readonly keptAsTextFor = signal<string | null>(null);

  protected readonly parsed = computed((): ParsedTaskInput => {
    const text = this.text();
    if (text === this.keptAsTextFor()) {
      return { title: text.trim(), dueAt: null, dateText: null };
    }
    return parseTaskInput(text, new Date());
  });

  focus(): void {
    this.field()?.nativeElement.focus();
  }

  reset(): void {
    this.text.set('');
    this.keptAsTextFor.set(null);
  }

  protected submit(): void {
    const { title, dueAt } = this.parsed();
    if (!title) return;
    void this.store.addQuickTask(title, dueAt).then(() => this.reset());
  }

  protected keepAsText(): void {
    this.keptAsTextFor.set(this.text());
    this.focus();
  }

  protected dueLabel(dueAt: string): string {
    return formatDueDate(dueAt);
  }
}
