import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
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
import { describeDue, type DueDescription } from '../../core/utils/task-due';
import { TaskCaptureComponent } from './task-capture.component';

interface TaskGroup {
  key: 'today' | 'upcoming' | 'someday';
  label: string;
  tasks: Task[];
}

/**
 * Full task list in a centered modal: quick capture, open tasks grouped by
 * due date (Today, Upcoming, No date) and a collapsed Done section.
 */
@Component({
  selector: 'dt-tasks-dialog',
  imports: [FormsModule, NgTemplateOutlet, TaskCaptureComponent],
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-40 flex items-start justify-center px-4 pt-[min(14vh,6rem)] sm:px-6"
        role="presentation"
      >
        <div
          class="dt-backdrop-enter fixed inset-0 bg-black/60 backdrop-blur-sm"
          aria-hidden="true"
          (click)="dismiss()"
        ></div>

        <section
          class="dt-modal-enter relative z-10 flex max-h-[min(80vh,44rem)] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-white/10 bg-zinc-900/95 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tasks-dialog-title"
          tabindex="-1"
          (keydown.escape)="dismiss()"
        >
          <header class="flex shrink-0 items-center justify-between gap-4 px-5 pt-5 pb-3">
            <div class="flex min-w-0 items-baseline gap-3">
              <h2
                id="tasks-dialog-title"
                class="text-[16px] font-semibold tracking-tight text-zinc-50"
              >
                Tasks
              </h2>
              <p class="truncate text-[12px] text-zinc-400">
                <span class="font-mono tabular-nums text-zinc-200">{{
                  store.openTaskCount()
                }}</span>
                open
                @if (store.completedTodayCount() > 0) {
                  <span aria-hidden="true"> · </span>
                  <span class="font-mono tabular-nums text-zinc-200">{{
                    store.completedTodayCount()
                  }}</span>
                  done today
                }
              </p>
            </div>
            <button
              type="button"
              class="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-white/8 hover:text-zinc-100"
              (click)="dismiss()"
              aria-label="Close tasks"
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
          </header>

          <div class="shrink-0 px-5 pb-3">
            <dt-task-capture inputId="tasks-dialog-input" />
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            @for (group of groups(); track group.key) {
              @if (group.tasks.length) {
                <section class="mt-1" [attr.aria-labelledby]="'tasks-group-' + group.key">
                  <h3
                    [id]="'tasks-group-' + group.key"
                    class="flex items-center justify-between px-2 pt-2 pb-1 text-[11px] font-medium uppercase tracking-[0.12em]"
                    [class.text-amber-300]="group.key === 'today'"
                    [class.text-zinc-400]="group.key !== 'today'"
                  >
                    {{ group.label }}
                    <span class="font-mono tabular-nums text-zinc-400">{{
                      group.tasks.length
                    }}</span>
                  </h3>
                  <ul>
                    @for (task of group.tasks; track task.id) {
                      <ng-container *ngTemplateOutlet="row; context: { $implicit: task }" />
                    }
                  </ul>
                </section>
              }
            }

            @if (doneTasks().length) {
              <details class="group/done mt-1">
                <summary
                  class="flex cursor-pointer list-none items-center justify-between rounded-md px-2 pt-2 pb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400 hover:text-zinc-200"
                >
                  <span class="inline-flex items-center gap-1.5">
                    <svg
                      class="h-3 w-3 transition-transform group-open/done:rotate-90"
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
                  <span class="font-mono tabular-nums">{{ doneTasks().length }}</span>
                </summary>
                <ul>
                  @for (task of doneTasks(); track task.id) {
                    <ng-container *ngTemplateOutlet="row; context: { $implicit: task }" />
                  }
                </ul>
              </details>
            }

            @if (!store.openTaskCount() && !doneTasks().length) {
              <div class="px-4 py-14 text-center">
                <div
                  class="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300"
                  aria-hidden="true"
                >
                  <svg
                    class="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M9 11l3 3 8-8" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                </div>
                <p class="mt-3 text-[14px] font-medium text-zinc-200">No tasks yet</p>
                <p class="mt-1 text-[12px] text-zinc-400">
                  Add one above. Give it a date to see it under Today.
                </p>
              </div>
            }
          </div>

          <footer
            class="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-white/6 bg-black/20 px-5 py-2.5 text-[11px] text-zinc-400"
          >
            <span>Click a task to rename it</span>
            <span class="flex items-center gap-3" aria-hidden="true">
              <span class="inline-flex items-center gap-1.5">
                <kbd
                  class="rounded border border-white/12 bg-white/5 px-1.5 py-px font-mono text-zinc-300"
                  >t</kbd
                >
                toggle
              </span>
              <span class="inline-flex items-center gap-1.5">
                <kbd
                  class="rounded border border-white/12 bg-white/5 px-1.5 py-px font-mono text-zinc-300"
                  >esc</kbd
                >
                close
              </span>
            </span>
          </footer>
        </section>
      </div>

      <ng-template #row let-task>
        <li
          class="group flex min-h-10 items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/4"
        >
          <button
            type="button"
            class="flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border border-white/20 text-transparent transition hover:border-emerald-400/70 hover:text-emerald-400"
            [class.border-emerald-400]="task.status === 'done'"
            [class.bg-emerald-400]="task.status === 'done'"
            [class.!text-neutral-950]="task.status === 'done'"
            (click)="complete(task.id)"
            [attr.aria-label]="(task.status === 'done' ? 'Reopen: ' : 'Complete: ') + task.title"
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
              class="min-w-0 flex-1 rounded-md border border-white/15 bg-black/30 px-2 py-1 text-[14px] text-zinc-100 focus:border-emerald-400/50 focus:outline-none"
              type="text"
              name="editTaskTitle"
              [attr.aria-label]="'Rename ' + task.title"
              [ngModel]="editTitle()"
              (ngModelChange)="editTitle.set($event)"
              [ngModelOptions]="{ standalone: true }"
              (keydown.enter)="saveEdit(task.id)"
              (keydown.escape)="cancelEdit($event)"
              (blur)="saveEdit(task.id)"
            />
          } @else {
            <button
              type="button"
              class="min-w-0 flex-1 truncate text-left text-[14px]"
              [class.text-zinc-100]="task.status !== 'done'"
              [class.text-zinc-400]="task.status === 'done'"
              [class.line-through]="task.status === 'done'"
              (click)="startEdit(task)"
            >
              {{ task.title }}
            </button>
          }

          @if (isDoing(task)) {
            <span
              class="shrink-0 rounded border border-amber-400/25 bg-amber-400/5 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-amber-200"
            >
              Doing
            </span>
          }

          @if (task.status !== 'done') {
            @let due = describe(task);
            <span class="relative shrink-0">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[11px] tabular-nums transition hover:bg-white/8 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
                [class.text-red-300]="due?.tone === 'overdue'"
                [class.text-amber-300]="due?.tone === 'today'"
                [class.text-zinc-300]="due?.tone === 'upcoming'"
                [class.text-zinc-400]="!due"
                [class.opacity-0]="!due"
                [attr.aria-label]="
                  due
                    ? 'Due ' + due.label + '. Change due date for ' + task.title
                    : 'Set due date for ' + task.title
                "
                (click)="openDatePicker(dueInput)"
              >
                <svg
                  class="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M16 3v4" />
                  <path d="M8 3v4" />
                  <path d="M3 10h18" />
                </svg>
                {{ due ? due.label : 'Set date' }}
              </button>
              <input
                #dueInput
                type="date"
                class="pointer-events-none absolute inset-0 h-full w-full opacity-0"
                tabindex="-1"
                aria-hidden="true"
                [value]="task.dueAt ?? ''"
                (change)="setDue(task.id, dueInput.value)"
              />
            </span>
          }

          <button
            type="button"
            class="shrink-0 rounded-md p-1 text-zinc-400 opacity-0 transition hover:bg-white/8 hover:text-red-300 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
            (click)="remove(task.id)"
            [attr.aria-label]="'Delete: ' + task.title"
          >
            <svg
              class="h-3.5 w-3.5"
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

  protected readonly editingId = signal<string | null>(null);
  protected readonly editTitle = signal('');

  private readonly capture = viewChild(TaskCaptureComponent);

  constructor() {
    afterNextRender(() => this.focusCapture());

    explicitEffect([this.open], ([open]) => {
      if (open) {
        this.editingId.set(null);
        queueMicrotask(() => {
          this.capture()?.reset();
          this.focusCapture();
        });
      }
    });
  }

  protected readonly groups = computed((): TaskGroup[] => {
    const { today, upcoming, someday } = this.store.openTaskGroups();
    return [
      { key: 'today', label: 'Today', tasks: today },
      { key: 'upcoming', label: 'Upcoming', tasks: upcoming },
      { key: 'someday', label: 'No date', tasks: someday },
    ];
  });

  protected readonly doneTasks = computed(() =>
    this.store
      .tasks()
      .filter((t) => t.status === 'done')
      .sort((a, b) => (b.updatedAt < a.updatedAt ? -1 : 1)),
  );

  protected complete(id: string): void {
    const target = this.store.tasks().find((t) => t.id === id);
    if (target?.status === 'done') {
      void this.store.reopenTask(id);
      return;
    }
    void this.store.completeTask(id);
  }

  protected startEdit(task: Task): void {
    this.editingId.set(task.id);
    this.editTitle.set(task.title);
  }

  protected cancelEdit(event: Event): void {
    // Keep Escape from also closing the dialog while renaming.
    event.stopPropagation();
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

  protected setDue(id: string, value: string): void {
    void this.store.updateTaskDue(id, value || null);
  }

  protected openDatePicker(input: HTMLInputElement): void {
    input.showPicker?.();
  }

  protected describe(task: Task): DueDescription | null {
    return task.dueAt ? describeDue(task.dueAt, new Date()) : null;
  }

  protected isDoing(task: Task): boolean {
    return task.kind === 'project' && task.columnId === 'doing' && task.status !== 'done';
  }

  protected dismiss(): void {
    this.dismissed.emit();
  }

  private focusCapture(): void {
    if (!this.open()) return;
    this.capture()?.focus();
  }
}
