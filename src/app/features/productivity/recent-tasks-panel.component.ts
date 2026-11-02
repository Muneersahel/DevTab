import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Task } from '../../core/models/task.model';
import { TaskStoreService } from '../../core/services/task-store.service';
import { describeDue, type DueDescription } from '../../core/utils/task-due';
import { TaskCaptureComponent } from './task-capture.component';

const UNDO_WINDOW_MS = 4000;

/**
 * Right-column preview of open tasks with quick capture. Full list lives in
 * {@link TasksDialogComponent}; "View all" only opens that modal.
 */
@Component({
  selector: 'dt-recent-tasks-panel',
  imports: [FormsModule, NgTemplateOutlet, TaskCaptureComponent],
  template: `
    <section
      id="recent-tasks"
      class="flex min-h-0 flex-col overflow-hidden rounded-lg border border-white/8 bg-surface"
      aria-labelledby="recent-tasks-heading"
      tabindex="-1"
    >
      <header class="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
        <h2 id="recent-tasks-heading" class="text-[14px] font-semibold text-zinc-50">
          Up next
          <span class="ml-1.5 text-[12px] font-normal text-zinc-400">
            <span class="font-mono tabular-nums text-zinc-200">{{ store.openTaskCount() }}</span>
            open
          </span>
        </h2>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-zinc-400 transition-colors hover:bg-white/6 hover:text-zinc-100"
          (click)="viewAllRequested.emit()"
          aria-keyshortcuts="t"
        >
          View all
          <kbd
            class="rounded border border-white/12 bg-white/5 px-1 font-mono text-[11px] text-zinc-300"
            aria-hidden="true"
            >t</kbd
          >
        </button>
      </header>

      <div class="px-4 pb-2">
        <dt-task-capture inputId="recent-tasks-input" />
      </div>

      @if (store.upNextTasks(); as groups) {
        @if (groups.today.length || groups.later.length) {
          <div
            class="max-h-[min(24rem,calc(100vh-16rem))] overflow-y-auto overflow-x-hidden px-2 pb-2"
          >
            @if (groups.today.length) {
              <h3
                id="up-next-today"
                class="px-2 pt-2 pb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-amber-300"
              >
                Today
              </h3>
              <ul aria-labelledby="up-next-today">
                @for (task of groups.today; track task.id) {
                  <ng-container *ngTemplateOutlet="row; context: { $implicit: task }" />
                }
              </ul>
              @if (groups.later.length) {
                <h3
                  id="up-next-later"
                  class="px-2 pt-2 pb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-400"
                >
                  Later
                </h3>
              }
            }
            @if (groups.later.length) {
              <ul [attr.aria-labelledby]="groups.today.length ? 'up-next-later' : null">
                @for (task of groups.later; track task.id) {
                  <ng-container *ngTemplateOutlet="row; context: { $implicit: task }" />
                }
              </ul>
            }
          </div>
        } @else {
          <div
            class="mx-4 mt-1 mb-4 rounded-lg border border-dashed border-white/10 px-3 py-4 text-center"
          >
            <p class="text-[13px] font-medium text-zinc-200">Nothing due today</p>
            <p class="mt-1 text-[12px] text-zinc-400">End a task with a date to schedule it:</p>
            <p class="mt-2 flex flex-wrap justify-center gap-1.5">
              @for (example of dateExamples; track example) {
                <span
                  class="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[11px] text-zinc-300"
                  >{{ example }}</span
                >
              }
            </p>
          </div>
        }
      }

      <div role="status" aria-live="polite">
        @if (lastCompleted(); as task) {
          <div
            class="mx-3 mb-3 flex items-center justify-between gap-3 rounded-md bg-white/5 px-3 py-2 text-[12px] text-zinc-300"
          >
            <span class="truncate">Completed “{{ task.title }}”</span>
            <button
              type="button"
              class="shrink-0 rounded px-1 font-medium text-emerald-300 hover:text-emerald-200"
              (click)="undo()"
            >
              Undo
            </button>
          </div>
        }
      </div>
    </section>

    <ng-template #row let-task>
      <li
        class="group flex min-h-9 items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/4"
      >
        <button
          type="button"
          class="flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border border-white/20 text-transparent transition hover:border-emerald-400/70 hover:text-emerald-400"
          (click)="complete(task)"
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
            class="min-w-0 flex-1 rounded-md border border-white/15 bg-black/30 px-2 py-1 text-[13px] text-zinc-100 focus:border-emerald-400/50 focus:outline-none"
            type="text"
            name="recentEditTitle"
            [attr.aria-label]="'Rename ' + task.title"
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
            class="min-w-0 flex-1 truncate text-left text-[13px] text-zinc-100"
            (click)="startEdit(task)"
          >
            {{ task.title }}
          </button>
        }

        @if (task.kind === 'project' && task.columnId === 'doing') {
          <span
            class="hidden shrink-0 rounded border border-amber-400/25 bg-amber-400/5 px-1 py-0.5 font-mono text-[11px] uppercase tracking-wider text-amber-200 sm:inline"
          >
            Doing
          </span>
        }

        @if (task.dueAt) {
          @let due = describeDue(task.dueAt);
          <span
            class="shrink-0 font-mono text-[11px] tabular-nums"
            [class.text-red-300]="due.tone === 'overdue'"
            [class.text-amber-300]="due.tone === 'today'"
            [class.text-zinc-400]="due.tone === 'upcoming'"
          >
            <span class="sr-only">Due </span>{{ due.label }}
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentTasksPanelComponent {
  readonly viewAllRequested = output<void>();

  protected readonly store = inject(TaskStoreService);
  protected readonly dateExamples = ['today', 'tomorrow', 'fri', 'next week'];

  protected readonly editingId = signal<string | null>(null);
  protected readonly editTitle = signal('');
  protected readonly lastCompleted = signal<Task | null>(null);

  private undoTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearUndoTimer());
  }

  protected complete(task: Task): void {
    void this.store.completeTask(task.id);
    this.clearUndoTimer();
    this.lastCompleted.set(task);
    this.undoTimer = setTimeout(() => this.lastCompleted.set(null), UNDO_WINDOW_MS);
  }

  protected undo(): void {
    const task = this.lastCompleted();
    if (!task) return;
    this.clearUndoTimer();
    this.lastCompleted.set(null);
    void this.store.reopenTask(task.id);
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

  protected describeDue(dueAt: string): DueDescription {
    return describeDue(dueAt, new Date());
  }

  private clearUndoTimer(): void {
    if (this.undoTimer !== null) {
      clearTimeout(this.undoTimer);
      this.undoTimer = null;
    }
  }
}
