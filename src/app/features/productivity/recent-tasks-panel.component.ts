import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Task } from '../../core/models/task.model';
import { TaskStoreService } from '../../core/services/task-store.service';

/**
 * Right-column preview of in-flight tasks with quick capture. Full list lives
 * in {@link TasksDialogComponent}; "View all" only opens that modal.
 */
@Component({
  selector: 'dt-recent-tasks-panel',
  imports: [FormsModule, DatePipe, NgTemplateOutlet],
  template: `
    <section
      id="recent-tasks"
      class="flex min-h-0 flex-col overflow-hidden rounded-md border border-white/8 bg-neutral-950"
      aria-labelledby="recent-tasks-heading"
      tabindex="-1"
    >
      <header class="border-b border-white/6 px-4 py-3.5">
        <p class="font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-400/90">/ tasks</p>
        <h2
          id="recent-tasks-heading"
          class="mt-1 text-[15px] font-semibold tracking-tight text-zinc-50"
        >
          Recent
        </h2>
        <p class="mt-1 text-[12px] text-zinc-500">
          <span class="font-mono tabular-nums text-zinc-300">{{ store.openTaskCount() }}</span>
          open
          @if (store.completedTodayCount() > 0) {
            <span class="mx-1.5 text-zinc-700">·</span>
            <span class="font-mono tabular-nums text-zinc-400">{{
              store.completedTodayCount()
            }}</span>
            completed today
          }
        </p>
      </header>

      <form
        class="flex items-center gap-2 border-b border-white/6 px-4 py-2.5"
        (ngSubmit)="onFormSubmit()"
      >
        <span class="font-mono text-emerald-400/70" aria-hidden="true">+</span>
        <label class="sr-only" for="recent-tasks-input">Capture a task</label>
        <input
          id="recent-tasks-input"
          name="recentNewTitle"
          class="min-w-0 flex-1 bg-transparent py-1 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
          type="text"
          placeholder="Capture a quick task…"
          [ngModel]="newTitle()"
          (ngModelChange)="newTitle.set($event)"
          autocomplete="off"
        />
      </form>

      <ul
        class="max-h-[min(24rem,calc(100vh-14rem))] divide-y divide-white/5 overflow-y-auto overflow-x-hidden px-2"
      >
        @for (task of store.recentIncompleteTasks(); track task.id) {
          <ng-container *ngTemplateOutlet="row; context: { $implicit: task }" />
        } @empty {
          <li class="list-none px-2 py-8 text-center" role="presentation">
            <p class="font-serif-italic text-[15px] text-zinc-500">Nothing in flight.</p>
            <p class="mt-1 text-[12px] text-zinc-600">Add something above.</p>
          </li>
        }
      </ul>

      <footer class="border-t border-white/6 px-4 py-2.5">
        <button
          type="button"
          class="w-full rounded-md border border-white/8 bg-white/3 py-2 text-center font-mono text-[11px] uppercase tracking-wider text-zinc-400 transition-colors hover:border-white/12 hover:bg-white/5 hover:text-zinc-200"
          (click)="viewAllRequested.emit()"
        >
          View all
        </button>
      </footer>
    </section>

    <ng-template #row let-task>
      <li class="group flex items-center gap-2.5 py-2.5">
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
            class="min-w-0 flex-1 rounded border border-white/15 bg-black/30 px-2 py-1 text-[13px] text-zinc-100 focus:outline-none"
            type="text"
            name="recentEditTitle"
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

        <span
          class="hidden shrink-0 rounded border px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider sm:inline"
          [class]="kindClasses(task)"
        >
          {{ kindLabel(task) }}
        </span>

        @if (task.dueAt) {
          <span class="hidden shrink-0 font-mono text-[10px] tabular-nums text-zinc-500 md:inline">
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentTasksPanelComponent {
  readonly viewAllRequested = output<void>();

  protected readonly store = inject(TaskStoreService);

  protected readonly newTitle = signal('');

  protected readonly editingId = signal<string | null>(null);
  protected readonly editTitle = signal('');

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
}
