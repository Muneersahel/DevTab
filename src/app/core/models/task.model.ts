export type TaskKind = 'quick' | 'project';

export type KanbanColumnId = 'backlog' | 'doing' | 'done';

export type TaskStatus = 'todo' | 'done';

export const KANBAN_COLUMNS: readonly KanbanColumnId[] = ['backlog', 'doing', 'done'] as const;

export interface Task {
  id: string;
  kind: TaskKind;
  title: string;
  status: TaskStatus;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  sortOrder: number;
  /** Set for `project` tasks only; `null` for quick tasks. */
  columnId: KanbanColumnId | null;
}

export function newTaskId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
