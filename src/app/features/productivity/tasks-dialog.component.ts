import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { explicitEffect } from 'ngxtension/explicit-effect';
import type { Task } from '../../core/models/task.model';
import { TaskStoreService } from '../../core/services/task-store.service';

/**
 * Centered modal for full task list: grouped inbox (Now / Up next / Done) and
 * quick capture. Keeps the dashboard clear while keyboard shortcuts surface
 * the same surface from anywhere.
 */
@Component({
  selector: 'dt-tasks-dialog',
  imports: [FormsModule, DatePipe, NgTemplateOutlet],
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6"
        role="presentation"
      >
        <div
          class="dt-backdrop-enter absolute inset-0 bg-black/50 backdrop-blur-[2px]"
          aria-hidden="true"
          (click)="dismiss()"
        ></div>

        <section
          class="dt-modal-enter relative z-10 flex max-h-[min(85vh,46rem)] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-white/8 bg-neutral-950 shadow-[0_25px_80px_-20px_rgba(0,0,0,0.85)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tasks-dialog-title"
          tabindex="-1"
          (keydown.escape)="dismiss()"
        >
          <header
            class="flex items-start justify-between gap-4 border-b border-white/6 px-5 pt-5 pb-4 sm:px-6 sm:pt-6"
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
                <span class="font-mono tabular-nums text-zinc-300">{{
                  store.openTaskCount()
                }}</span>
                open
                @if (store.completedTodayCount() > 0) {
                  <span class="mx-1.5 text-zinc-700">·</span>
                  <span class="font-mono tabular-nums text-zinc-400">{{
                    store.completedTodayCount()
                  }}</span>
                  completed today
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

          <form
            class="flex items-center gap-2 border-b border-white/6 px-5 py-3 sm:px-6"
            (ngSubmit)="onFormSubmit()"
          >
            <span class="font-mono text-emerald-400/70" aria-hidden="true">+</span>
            <label class="sr-only" for="tasks-dialog-input">Add task</label>
            <input
              #addInput
              id="tasks-dialog-input"
              name="newTaskTitle"
              class="min-w-0 flex-1 bg-transparent py-1 text-[14px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              type="text"
              placeholder="Capture a quick task…"
              [(ngModel)]="newTitle"
              autocomplete="off"
            />
            <kbd
              class="hidden rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 sm:inline"
              aria-hidden="true"
              >↵</kbd
            >
          </form>

          <div class="min-h-0 flex-1 overflow-y-auto">
            <div class="px-5 py-4 sm:px-6">
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
                      <ng-container *ngTemplateOutlet="row; context: { $implicit: task }" />
                    }
                  </ul>
                </section>
              }

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
                      <ng-container *ngTemplateOutlet="row; context: { $implicit: task }" />
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
                      <ng-container *ngTemplateOutlet="row; context: { $implicit: task }" />
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
          </div>

          <footer
            class="flex items-center justify-between border-t border-white/6 bg-black/30 px-5 py-3 font-mono text-[11px] text-zinc-500 sm:px-6"
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
        </section>
      </div>

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
              name="editTaskTitle"
              [ngModel]="editTitle()"
              (ngModelChange)="editTitle.set($event)"
              [ngModelOptions]="{ standalone: true }"
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
            <span
              class="hidden shrink-0 font-mono text-[11px] tabular-nums text-zinc-500 sm:inline"
            >
              {{ task.dueAt | date: 'd MMM' }}
            </span>
          }

          <button
            type="button"
            class="shrink-0 font-mono text-[11px] text-zinc-600 opacity-0 transition hover:text-red-300 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
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

  protected readonly newTitle = signal('');

  protected readonly editingId = signal<string | null>(null);
  protected readonly editTitle = signal('');

  private readonly addInput = viewChild<ElementRef<HTMLInputElement>>('addInput');

  constructor() {
    afterNextRender(() => this.focusAddInput());

    explicitEffect([this.open], ([open]) => {
      if (open) {
        this.editingId.set(null);
        this.newTitle.set('');
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

  protected onFormSubmit(): void {
    const value = this.newTitle().trim();
    if (!value) return;
    void this.store.addQuickTask(value).then(() => this.newTitle.set(''));
  }

  protected complete(id: string): void {
    const target = this.store.tasks().find((t) => t.id === id);
    if (target?.status === 'done') {
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
    this.editTitle.set(task.title);
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  protected saveEdit(id: string): void {
    if (this.editingId() !== id) return;
    const value = this.editTitle().trim();
    if (!value) {
      this.editingId.set(null);
      return;
    }
    void this.store.updateTaskTitle(id, value).then(() => this.editingId.set(null));
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
    if (!this.open()) return;
    this.addInput()?.nativeElement?.focus();
  }
}
