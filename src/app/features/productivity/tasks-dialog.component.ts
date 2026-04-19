import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import type { KanbanColumnId, Task } from '../../core/models/task.model';
import { TaskStoreService } from '../../core/services/task-store.service';

type TabId = 'inbox' | 'board';

/**
 * Right-anchored drawer that hosts all task management. Splits into two
 * tabs so the surface never feels cluttered:
 *   - Inbox: grouped flat list (Now / Up next / Done)
 *   - Board: vertical stack of the three kanban columns
 *
 * Keeping the UI inside a drawer rather than on the dashboard lets the
 * WakaTime stats page stay uncluttered, while a single keyboard shortcut
 * (T) brings tasks into focus from anywhere.
 */
@Component({
  selector: 'dt-tasks-dialog',
  imports: [ReactiveFormsModule, DatePipe, NgTemplateOutlet],
  template: `
    @if (open()) {
      <div
        class="dt-backdrop-enter fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
        (click)="dismiss()"
        aria-hidden="true"
      ></div>

      <aside
        #panel
        class="dt-drawer-enter fixed right-0 top-0 z-50 flex h-full w-full max-w-[520px] flex-col border-l border-white/8 bg-neutral-950 shadow-[-20px_0_60px_-30px_rgba(0,0,0,0.8)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tasks-dialog-title"
        tabindex="-1"
        (keydown.escape)="dismiss()"
      >
        <header
          class="flex items-start justify-between gap-4 border-b border-white/6 px-6 pt-6 pb-4"
        >
          <div>
            <p class="font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-400/90">
              / tasks
            </p>
            <h2
              id="tasks-dialog-title"
              class="mt-1 text-xl font-semibold tracking-tight text-zinc-50"
            >
              What's on your plate
            </h2>
            <p class="mt-1 text-[12px] text-zinc-500">
              <span class="font-mono tabular-nums text-zinc-300">{{ store.openTaskCount() }}</span>
              open
              @if (doneCount() > 0) {
                <span class="mx-1.5 text-zinc-700">·</span>
                <span class="font-mono tabular-nums text-zinc-400">{{ doneCount() }}</span>
                done
              }
            </p>
          </div>
          <button
            type="button"
            class="rounded-md border border-white/8 p-1.5 text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
            (click)="dismiss()"
            aria-label="Close tasks"
          >
            <svg
              width="16"
              height="16"
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

        <nav class="flex gap-6 border-b border-white/6 px-6" aria-label="Task views">
          @for (t of tabs; track t.id) {
            <button
              type="button"
              class="relative py-3 text-[13px] font-medium transition-colors"
              [class.text-zinc-100]="tab() === t.id"
              [class.text-zinc-500]="tab() !== t.id"
              (click)="tab.set(t.id)"
            >
              {{ t.label }}
              <span
                class="ml-1.5 font-mono text-[11px] tabular-nums text-zinc-600"
                aria-hidden="true"
                >{{ t.count() }}</span
              >
              @if (tab() === t.id) {
                <span
                  class="absolute inset-x-0 -bottom-px h-px bg-emerald-400"
                  aria-hidden="true"
                ></span>
              }
            </button>
          }
        </nav>

        <form
          class="flex items-center gap-2 border-b border-white/6 px-6 py-3"
          (ngSubmit)="submit()"
        >
          <span class="font-mono text-emerald-400/70" aria-hidden="true">+</span>
          <label class="sr-only" for="tasks-dialog-input">Add task</label>
          <input
            #addInput
            id="tasks-dialog-input"
            class="min-w-0 flex-1 bg-transparent py-1 text-[14px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
            type="text"
            [placeholder]="tab() === 'board' ? 'Add to Backlog…' : 'Capture a quick task…'"
            [formControl]="newTitle"
            autocomplete="off"
          />
          <kbd
            class="hidden rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 sm:inline"
            aria-hidden="true"
            >↵</kbd
          >
        </form>

        <div class="min-h-0 flex-1 overflow-y-auto">
          @if (tab() === 'inbox') {
            <div class="px-6 py-4">
              <!-- Now: tasks currently in flight -->
              @if (nowTasks().length) {
                <section class="mb-5">
                  <header class="mb-2 flex items-baseline justify-between">
                    <h3
                      class="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-400/80"
                    >
                      Now
                    </h3>
                    <span class="font-mono text-[11px] tabular-nums text-zinc-600">
                      {{ nowTasks().length }}
                    </span>
                  </header>
                  <ul class="divide-y divide-white/5">
                    @for (task of nowTasks(); track task.id) {
                      <ng-container
                        *ngTemplateOutlet="row; context: { $implicit: task }"
                      ></ng-container>
                    }
                  </ul>
                </section>
              }

              <!-- Up next: quick tasks + backlog -->
              @if (upNextTasks().length) {
                <section class="mb-5">
                  <header class="mb-2 flex items-baseline justify-between">
                    <h3 class="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                      Up next
                    </h3>
                    <span class="font-mono text-[11px] tabular-nums text-zinc-600">
                      {{ upNextTasks().length }}
                    </span>
                  </header>
                  <ul class="divide-y divide-white/5">
                    @for (task of upNextTasks(); track task.id) {
                      <ng-container
                        *ngTemplateOutlet="row; context: { $implicit: task }"
                      ></ng-container>
                    }
                  </ul>
                </section>
              }

              @if (doneTasks().length) {
                <details class="group">
                  <summary
                    class="flex cursor-pointer list-none items-center justify-between py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 hover:text-zinc-300"
                  >
                    <span class="inline-flex items-center gap-2">
                      <svg
                        class="h-3 w-3 transition-transform group-open:rotate-90"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        aria-hidden="true"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                      Done
                    </span>
                    <span class="font-mono tabular-nums text-zinc-600">
                      {{ doneTasks().length }}
                    </span>
                  </summary>
                  <ul class="divide-y divide-white/5">
                    @for (task of doneTasks(); track task.id) {
                      <ng-container
                        *ngTemplateOutlet="row; context: { $implicit: task }"
                      ></ng-container>
                    }
                  </ul>
                </details>
              }

              @if (!nowTasks().length && !upNextTasks().length && !doneTasks().length) {
                <div class="px-2 py-16 text-center">
                  <p class="font-serif-italic text-lg text-zinc-500">An empty inbox.</p>
                  <p class="mt-1 text-[12px] text-zinc-600">
                    Type above and press enter to capture something.
                  </p>
                </div>
              }
            </div>
          } @else {
            <div class="space-y-3 p-6">
              @for (col of columns; track col.id) {
                <section
                  class="rounded-md border border-white/6 bg-white/2"
                  [class.border-emerald-400/20]="col.id === 'doing'"
                  [class.bg-emerald-400/3]="col.id === 'doing'"
                >
                  <header class="flex items-center justify-between px-4 py-2.5">
                    <h3
                      class="text-[11px] font-semibold uppercase tracking-[0.14em]"
                      [class.text-emerald-300]="col.id === 'doing'"
                      [class.text-zinc-400]="col.id !== 'doing'"
                    >
                      {{ col.label }}
                    </h3>
                    <span class="font-mono text-[11px] tabular-nums text-zinc-600">
                      {{ columnTasks(col.id).length }}
                    </span>
                  </header>

                  <ul class="divide-y divide-white/5 border-t border-white/6">
                    @for (task of columnTasks(col.id); track task.id) {
                      <li class="group px-4 py-2.5">
                        <div class="flex items-start gap-3">
                          <button
                            type="button"
                            class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-white/15 text-transparent transition hover:border-emerald-400/60 hover:text-emerald-400"
                            [class.border-emerald-400/60]="task.status === 'done'"
                            [class.bg-emerald-400]="task.status === 'done'"
                            [class.!text-neutral-950]="task.status === 'done'"
                            (click)="complete(task.id)"
                            [attr.aria-label]="'Complete: ' + task.title"
                          >
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="3"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              aria-hidden="true"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </button>

                          @if (editingId() === task.id) {
                            <input
                              class="min-w-0 flex-1 rounded border border-white/15 bg-black/30 px-2 py-1 text-[14px] text-zinc-100 focus:outline-none"
                              type="text"
                              [formControl]="editTitle"
                              (keydown.enter)="saveEdit(task.id)"
                              (keydown.escape)="cancelEdit()"
                              (blur)="saveEdit(task.id)"
                            />
                          } @else {
                            <button
                              type="button"
                              class="min-w-0 flex-1 truncate text-left text-[14px]"
                              [class.text-zinc-100]="task.status !== 'done'"
                              [class.text-zinc-600]="task.status === 'done'"
                              [class.line-through]="task.status === 'done'"
                              (click)="startEdit(task)"
                            >
                              {{ task.title }}
                            </button>
                          }
                        </div>

                        <div
                          class="mt-2 flex flex-wrap items-center gap-3 pl-7 font-mono text-[11px]"
                        >
                          <label class="inline-flex items-center gap-1.5 text-zinc-500">
                            <span class="text-zinc-600">due</span>
                            <input
                              class="rounded border border-white/10 bg-transparent px-1 py-0.5 text-[11px] text-zinc-300 focus:outline-none"
                              type="date"
                              [value]="dueInput(task.dueAt)"
                              (change)="onDueChange(task.id, $any($event.target).value)"
                            />
                          </label>
                          <label class="inline-flex items-center gap-1.5 text-zinc-500">
                            <span class="text-zinc-600">move</span>
                            <select
                              class="rounded border border-white/10 bg-transparent px-1 py-0.5 text-[11px] text-zinc-300 focus:outline-none"
                              [value]="task.columnId"
                              (change)="onMoveSelect(task.id, $any($event.target).value)"
                              [attr.aria-label]="'Move task: ' + task.title"
                            >
                              <option value="backlog">Backlog</option>
                              <option value="doing">Doing</option>
                              <option value="done">Done</option>
                            </select>
                          </label>
                          <button
                            type="button"
                            class="ml-auto text-zinc-600 opacity-0 transition hover:text-red-300 group-hover:opacity-100 focus:opacity-100"
                            (click)="remove(task.id)"
                          >
                            delete
                          </button>
                        </div>
                      </li>
                    } @empty {
                      <li class="px-4 py-3 font-serif-italic text-[13px] text-zinc-600">
                        Nothing here yet.
                      </li>
                    }
                  </ul>
                </section>
              }
            </div>
          }
        </div>

        <footer
          class="flex items-center justify-between border-t border-white/6 bg-black/30 px-6 py-3 font-mono text-[11px] text-zinc-500"
        >
          <span>
            <kbd class="rounded border border-white/10 px-1 py-0.5 text-zinc-400">esc</kbd>
            to close
          </span>
          <span>
            <kbd class="rounded border border-white/10 px-1 py-0.5 text-zinc-400">t</kbd>
            to toggle
          </span>
        </footer>
      </aside>

      <ng-template #row let-task>
        <li class="group flex items-center gap-3 py-2.5">
          <button
            type="button"
            class="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-white/15 text-transparent transition hover:border-emerald-400/60 hover:text-emerald-400"
            [class.border-emerald-400/60]="task.status === 'done'"
            [class.bg-emerald-400]="task.status === 'done'"
            [class.!text-neutral-950]="task.status === 'done'"
            (click)="complete(task.id)"
            [attr.aria-label]="'Complete: ' + task.title"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>

          @if (editingId() === task.id) {
            <input
              class="min-w-0 flex-1 rounded border border-white/15 bg-black/30 px-2 py-1 text-[14px] text-zinc-100 focus:outline-none"
              type="text"
              [formControl]="editTitle"
              (keydown.enter)="saveEdit(task.id)"
              (keydown.escape)="cancelEdit()"
              (blur)="saveEdit(task.id)"
            />
          } @else {
            <button
              type="button"
              class="min-w-0 flex-1 truncate text-left text-[14px]"
              [class.text-zinc-100]="task.status !== 'done'"
              [class.text-zinc-600]="task.status === 'done'"
              [class.line-through]="task.status === 'done'"
              (click)="startEdit(task)"
            >
              {{ task.title }}
            </button>
          }

          <span
            class="shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider"
            [class]="kindClasses(task)"
          >
            {{ kindLabel(task) }}
          </span>

          @if (task.dueAt) {
            <span class="shrink-0 font-mono text-[11px] tabular-nums text-zinc-500">
              {{ task.dueAt | date: 'd MMM' }}
            </span>
          }

          <button
            type="button"
            class="shrink-0 font-mono text-[11px] text-zinc-600 opacity-0 transition hover:text-red-300 group-hover:opacity-100 focus:opacity-100"
            (click)="remove(task.id)"
            [attr.aria-label]="'Delete: ' + task.title"
          >
            ×
          </button>
        </li>
      </ng-template>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TasksDialogComponent {
  readonly open = input<boolean>(false);
  readonly dismissed = output<void>();

  protected readonly store = inject(TaskStoreService);

  protected readonly tab = signal<TabId>('inbox');

  protected readonly tabs = [
    { id: 'inbox' as const, label: 'Inbox', count: () => this.store.openTaskCount() },
    { id: 'board' as const, label: 'Board', count: () => this.projectCount() },
  ];

  protected readonly columns: { id: KanbanColumnId; label: string }[] = [
    { id: 'doing', label: 'Doing' },
    { id: 'backlog', label: 'Backlog' },
    { id: 'done', label: 'Done' },
  ];

  protected readonly newTitle = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(1)],
  });

  protected readonly editingId = signal<string | null>(null);
  protected readonly editTitle = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(1)],
  });

  private readonly addInput = viewChild<ElementRef<HTMLInputElement>>('addInput');

  constructor() {
    afterNextRender(() => this.focusAddInput());

    // Focus the add input whenever the drawer opens, and reset edit state
    // so stale in-place edits don't linger between sessions.
    effect(() => {
      if (this.open()) {
        this.editingId.set(null);
        queueMicrotask(() => this.focusAddInput());
      }
    });
  }

  protected readonly nowTasks = computed(() =>
    this.store
      .tasks()
      .filter((t) => t.kind === 'project' && t.columnId === 'doing' && t.status !== 'done')
      .sort((a, b) => a.sortOrder - b.sortOrder),
  );

  protected readonly upNextTasks = computed(() => {
    const quick = this.store
      .tasks()
      .filter((t) => t.kind === 'quick' && t.status !== 'done')
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const backlog = this.store
      .tasks()
      .filter((t) => t.kind === 'project' && t.columnId === 'backlog' && t.status !== 'done')
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return [...quick, ...backlog];
  });

  protected readonly doneTasks = computed(() =>
    this.store
      .tasks()
      .filter((t) => t.status === 'done')
      .sort((a, b) => (b.updatedAt < a.updatedAt ? -1 : 1)),
  );

  protected readonly doneCount = computed(() => this.doneTasks().length);

  protected columnTasks(col: KanbanColumnId): Task[] {
    return this.store.projectTasksByColumn()[col];
  }

  protected projectCount(): number {
    const cols = this.store.projectTasksByColumn();
    return cols.backlog.length + cols.doing.length + cols.done.length;
  }

  protected submit(): void {
    if (this.newTitle.invalid) return;
    const value = this.newTitle.value.trim();
    if (!value) return;
    const add =
      this.tab() === 'board' ? this.store.addProjectTask(value) : this.store.addQuickTask(value);
    void add.then(() => this.newTitle.setValue(''));
  }

  protected complete(id: string): void {
    const target = this.store.tasks().find((t) => t.id === id);
    if (target?.status === 'done') {
      // Allow un-checking a quick task to re-open it.
      if (target.kind === 'quick') {
        void this.store.toggleQuickTaskDone(id);
      } else {
        void this.store.moveProjectTaskToColumn(id, 'backlog');
      }
      return;
    }
    void this.store.completeTask(id);
  }

  protected startEdit(task: Task): void {
    this.editingId.set(task.id);
    this.editTitle.setValue(task.title);
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  protected saveEdit(id: string): void {
    if (this.editingId() !== id) return;
    const value = this.editTitle.value.trim();
    if (!value) {
      this.editingId.set(null);
      return;
    }
    void this.store.updateTaskTitle(id, value).then(() => this.editingId.set(null));
  }

  protected onDueChange(id: string, value: string): void {
    const due = value ? new Date(value + 'T12:00:00').toISOString() : null;
    void this.store.updateTaskDue(id, due);
  }

  protected dueInput(dueAt: string | null): string {
    if (!dueAt) return '';
    const d = new Date(dueAt);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }

  protected onMoveSelect(id: string, col: string): void {
    if (col === 'backlog' || col === 'doing' || col === 'done') {
      void this.store.moveProjectTaskToColumn(id, col);
    }
  }

  protected remove(id: string): void {
    void this.store.deleteTask(id);
  }

  protected kindLabel(task: Task): string {
    if (task.kind === 'quick') return 'Quick';
    switch (task.columnId) {
      case 'doing':
        return 'Doing';
      case 'done':
        return 'Done';
      default:
        return 'Backlog';
    }
  }

  protected kindClasses(task: Task): string {
    if (task.status === 'done') {
      return 'border-white/8 bg-white/3 text-zinc-600';
    }
    if (task.kind === 'quick') {
      return 'border-emerald-400/25 bg-emerald-400/5 text-emerald-300';
    }
    if (task.columnId === 'doing') {
      return 'border-amber-400/25 bg-amber-400/5 text-amber-200';
    }
    return 'border-white/10 bg-white/3 text-zinc-400';
  }

  protected dismiss(): void {
    this.dismissed.emit();
  }

  private focusAddInput(): void {
    const input = this.addInput()?.nativeElement;
    input?.focus();
  }
}
