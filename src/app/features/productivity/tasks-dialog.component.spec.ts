import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import type { Task } from '../../core/models/task.model';
import { TaskStoreService } from '../../core/services/task-store.service';
import { TasksDialogComponent } from './tasks-dialog.component';

describe('TasksDialogComponent', () => {
  it('sets and clears a task due date from the date picker', async () => {
    await TestBed.configureTestingModule({ imports: [TasksDialogComponent] }).compileComponents();
    const store = TestBed.inject(TaskStoreService);
    store.tasks.set([task('Write release notes')]);
    const fixture = TestBed.createComponent(TasksDialogComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const picker = fixture.nativeElement.querySelector(
      'input[aria-label="Due date for Write release notes"]',
    ) as HTMLInputElement;
    picker.value = '2026-11-05';
    picker.dispatchEvent(new Event('change'));
    expect(store.tasks()[0].dueAt).toBe('2026-11-05');

    picker.value = '';
    picker.dispatchEvent(new Event('change'));
    expect(store.tasks()[0].dueAt).toBeNull();
  });
});

function task(title: string): Task {
  return {
    id: 'task-1',
    kind: 'quick',
    title,
    status: 'todo',
    dueAt: null,
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
    sortOrder: 0,
    columnId: null,
  };
}
