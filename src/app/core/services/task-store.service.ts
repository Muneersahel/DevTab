import { Injectable, computed, inject, signal } from '@angular/core';
import { KANBAN_COLUMNS, KanbanColumnId, type Task, newTaskId } from '../models/task.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class TaskStoreService {
  private readonly storage = inject(StorageService);

  /** All tasks (quick + project). */
  readonly tasks = signal<Task[]>([]);

  readonly quickTasks = computed(() =>
    this.tasks()
      .filter((t) => t.kind === 'quick')
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder),
  );

  /**
   * Up to 5 open tasks across quick + project, prioritized so the board's
   * "Doing" column surfaces first, then the quick list, then the backlog.
   * Completed tasks are excluded so the dashboard preview always shows what
   * is actually in flight.
   */
  readonly recentIncompleteTasks = computed((): Task[] => {
    const open = this.tasks().filter((t) => t.status !== 'done');
    const priority = (t: Task): number => {
      if (t.kind === 'project' && t.columnId === 'doing') return 0;
      if (t.kind === 'quick') return 1;
      if (t.kind === 'project' && t.columnId === 'backlog') return 2;
      return 3;
    };
    return open
      .slice()
      .sort((a, b) => {
        const p = priority(a) - priority(b);
        if (p !== 0) return p;
        return a.sortOrder - b.sortOrder;
      })
      .slice(0, 5);
  });

  readonly openTaskCount = computed(() => this.tasks().filter((t) => t.status !== 'done').length);

  readonly projectTasksByColumn = computed(() => {
    const map: Record<KanbanColumnId, Task[]> = {
      backlog: [],
      doing: [],
      done: [],
    };
    for (const t of this.tasks()) {
      if (t.kind !== 'project' || !t.columnId) continue;
      map[t.columnId].push(t);
    }
    for (const col of KANBAN_COLUMNS) {
      map[col].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  });

  async load(): Promise<void> {
    const raw = await this.storage.getProductivityTasks();
    this.tasks.set(normalizeAllTasks(raw));
  }

  async addQuickTask(title: string): Promise<void> {
    const trimmed = title.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    const nextOrder = nextQuickSortOrder(this.tasks());
    const task: Task = {
      id: newTaskId(),
      kind: 'quick',
      title: trimmed,
      status: 'todo',
      dueAt: null,
      createdAt: now,
      updatedAt: now,
      sortOrder: nextOrder,
      columnId: null,
    };
    this.tasks.update((all) => [...all, task]);
    await this.persist();
  }

  async addProjectTask(title: string): Promise<void> {
    const trimmed = title.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    const col: KanbanColumnId = 'backlog';
    const nextOrder = nextColumnSortOrder(
      this.tasks().filter((t) => t.kind === 'project' && t.columnId === col),
      col,
    );
    const task: Task = {
      id: newTaskId(),
      kind: 'project',
      title: trimmed,
      status: 'todo',
      dueAt: null,
      createdAt: now,
      updatedAt: now,
      sortOrder: nextOrder,
      columnId: col,
    };
    this.tasks.update((all) => [...all, task]);
    await this.persist();
  }

  async deleteTask(id: string): Promise<void> {
    this.tasks.update((all) => all.filter((t) => t.id !== id));
    await this.persist();
  }

  async updateTaskTitle(id: string, title: string): Promise<void> {
    const trimmed = title.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    this.tasks.update((all) =>
      all.map((t) => (t.id === id ? { ...t, title: trimmed, updatedAt: now } : t)),
    );
    await this.persist();
  }

  async updateTaskDue(id: string, dueAt: string | null): Promise<void> {
    const now = new Date().toISOString();
    this.tasks.update((all) => all.map((t) => (t.id === id ? { ...t, dueAt, updatedAt: now } : t)));
    await this.persist();
  }

  /**
   * Marks any task complete regardless of kind. Quick tasks flip their
   * status; project tasks move to the Done column so the board stays in
   * sync. Idempotent: calling on an already-done task is a no-op.
   */
  async completeTask(id: string): Promise<void> {
    const target = this.tasks().find((t) => t.id === id);
    if (!target || target.status === 'done') return;
    if (target.kind === 'project') {
      await this.moveProjectTaskToColumn(id, 'done');
      return;
    }
    const now = new Date().toISOString();
    this.tasks.update((all) =>
      all.map((t) => (t.id === id ? { ...t, status: 'done' as const, updatedAt: now } : t)),
    );
    await this.persist();
  }

  async toggleQuickTaskDone(id: string): Promise<void> {
    const now = new Date().toISOString();
    this.tasks.update((all) =>
      all.map((t) => {
        if (t.id !== id || t.kind !== 'quick') return t;
        const nextStatus = t.status === 'done' ? 'todo' : 'done';
        return { ...t, status: nextStatus, updatedAt: now };
      }),
    );
    await this.persist();
  }

  async promoteQuickToProject(id: string): Promise<void> {
    const now = new Date().toISOString();
    const col: KanbanColumnId = 'backlog';
    this.tasks.update((all) => {
      const others = all.filter((t) => t.id !== id);
      const promoted = all.find((t) => t.id === id && t.kind === 'quick');
      if (!promoted) return all;
      const sortOrder = nextColumnSortOrder(
        others.filter((t) => t.kind === 'project' && t.columnId === col),
        col,
      );
      const upgraded: Task = {
        ...promoted,
        kind: 'project',
        columnId: col,
        status: 'todo',
        sortOrder,
        updatedAt: now,
      };
      return renumberProjectColumns([...others, upgraded]);
    });
    await this.persist();
  }

  async moveProjectTaskToColumn(taskId: string, target: KanbanColumnId): Promise<void> {
    const now = new Date().toISOString();
    this.tasks.update((all) => {
      const next = all.map((t) => {
        if (t.id !== taskId || t.kind !== 'project') return t;
        return {
          ...t,
          columnId: target,
          status: target === 'done' ? ('done' as const) : ('todo' as const),
          updatedAt: now,
        };
      });
      return renumberProjectColumns(next);
    });
    await this.persist();
  }

  /**
   * Called after CDK mutates per-column arrays. Merges with quick tasks and persists.
   */
  async syncProjectBoardFromColumns(columns: Record<KanbanColumnId, Task[]>): Promise<void> {
    const now = new Date().toISOString();
    const quick = this.tasks().filter((t) => t.kind === 'quick');
    const merged: Task[] = [...quick];
    for (const col of KANBAN_COLUMNS) {
      const list = columns[col] ?? [];
      list.forEach((t, index) => {
        merged.push({
          ...t,
          kind: 'project',
          columnId: col,
          status: col === 'done' ? 'done' : 'todo',
          sortOrder: index,
          updatedAt: now,
        });
      });
    }
    this.tasks.set(normalizeAllTasks(merged));
    await this.persist();
  }

  private async persist(): Promise<void> {
    await this.storage.saveProductivityTasks(this.tasks());
  }
}

function nextQuickSortOrder(tasks: Task[]): number {
  const qs = tasks.filter((t) => t.kind === 'quick');
  if (!qs.length) return 0;
  return Math.max(...qs.map((t) => t.sortOrder)) + 1;
}

function nextColumnSortOrder(inColumnTasks: Task[], _col: KanbanColumnId): number {
  if (!inColumnTasks.length) return 0;
  return Math.max(...inColumnTasks.map((t) => t.sortOrder)) + 1;
}

function renumberProjectColumns(tasks: Task[]): Task[] {
  const quick = tasks.filter((t) => t.kind === 'quick');
  const byCol: Record<KanbanColumnId, Task[]> = { backlog: [], doing: [], done: [] };
  for (const t of tasks) {
    if (t.kind === 'project' && t.columnId) {
      byCol[t.columnId].push(t);
    }
  }
  const out: Task[] = [...quick];
  for (const col of KANBAN_COLUMNS) {
    byCol[col]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((t, i) => {
        out.push({
          ...t,
          columnId: col,
          sortOrder: i,
          status: col === 'done' ? 'done' : 'todo',
        });
      });
  }
  return out;
}

function normalizeAllTasks(tasks: Task[]): Task[] {
  const dedup = new Map<string, Task>();
  for (const t of tasks) {
    dedup.set(t.id, t);
  }
  return renumberProjectColumns([...dedup.values()]);
}
