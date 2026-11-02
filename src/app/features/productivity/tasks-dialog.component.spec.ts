import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '../../core/models/task.model';
import { TaskStoreService } from '../../core/services/task-store.service';
import { TasksDialogComponent } from './tasks-dialog.component';

describe('TasksDialogComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 2, 10));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets and clears a task due date from the date control', async () => {
    const { fixture, element, store } = await render([task('Write release notes', null)]);

    const dateButton = element.querySelector(
      'button[aria-label="Set due date for Write release notes"]',
    ) as HTMLButtonElement;
    const picker = dateButton.parentElement?.querySelector(
      'input[type="date"]',
    ) as HTMLInputElement;
    picker.value = '2026-11-05';
    picker.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(store.tasks()[0].dueAt).toBe('2026-11-05');

    // The task moved to Upcoming, so its row (and date input) was re-rendered.
    const dueButton = element.querySelector(
      'button[aria-label^="Due Thu. Change due date for Write release notes"]',
    ) as HTMLButtonElement;
    expect(dueButton).not.toBeNull();
    const movedPicker = dueButton.parentElement?.querySelector(
      'input[type="date"]',
    ) as HTMLInputElement;
    movedPicker.value = '';
    movedPicker.dispatchEvent(new Event('change'));
    expect(store.tasks()[0].dueAt).toBeNull();
  });

  it('groups open tasks by due date and collapses done tasks', async () => {
    const done = { ...task('Shipped', null), status: 'done' as const };
    const { element } = await render([
      task('Someday', null),
      task('Next week', '2026-11-10'),
      task('Late', '2026-10-30'),
      done,
    ]);

    const group = (key: string) =>
      Array.from(element.querySelectorAll(`[aria-labelledby="tasks-group-${key}"] li`)).map((li) =>
        li.querySelector('button + button')?.textContent?.trim(),
      );

    expect(group('today')).toEqual(['Late']);
    expect(group('upcoming')).toEqual(['Next week']);
    expect(group('someday')).toEqual(['Someday']);
    expect(element.querySelector('details')?.open).toBe(false);
    expect(element.querySelector('details')?.textContent).toContain('Shipped');
  });
});

async function render(tasks: Task[]) {
  await TestBed.configureTestingModule({ imports: [TasksDialogComponent] }).compileComponents();
  const store = TestBed.inject(TaskStoreService);
  store.tasks.set(tasks);
  const fixture = TestBed.createComponent(TasksDialogComponent);
  fixture.componentRef.setInput('open', true);
  fixture.detectChanges();
  return { fixture, element: fixture.nativeElement as HTMLElement, store };
}

function task(title: string, dueAt: string | null): Task {
  return {
    id: title,
    kind: 'quick',
    title,
    status: 'todo',
    dueAt,
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
    sortOrder: 0,
    columnId: null,
  };
}
