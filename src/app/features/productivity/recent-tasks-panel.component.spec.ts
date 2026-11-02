import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '../../core/models/task.model';
import { TaskStoreService } from '../../core/services/task-store.service';
import { RecentTasksPanelComponent } from './recent-tasks-panel.component';

describe('RecentTasksPanelComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 2, 10));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('groups overdue and due-today tasks under Today with relative due labels', async () => {
    await TestBed.configureTestingModule({
      imports: [RecentTasksPanelComponent],
    }).compileComponents();
    TestBed.inject(TaskStoreService).tasks.set([
      task('undated', null),
      task('tomorrow', '2026-11-03'),
      task('today', '2026-11-02'),
      task('overdue', '2026-10-30'),
    ]);
    const fixture = TestBed.createComponent(RecentTasksPanelComponent);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const rows = (labelledBy: string) =>
      Array.from(element.querySelectorAll(`ul[aria-labelledby="${labelledBy}"] li`)).map((li) =>
        li.textContent?.replace(/\s+/g, ' ').trim(),
      );

    expect(rows('up-next-today')).toEqual([
      expect.stringMatching(/^overdue .*Due overdue/),
      expect.stringMatching(/^today .*Due today/),
    ]);
    expect(rows('up-next-later')).toEqual([
      expect.stringMatching(/^tomorrow .*Due tomorrow/),
      expect.not.stringContaining('Due'),
    ]);
  });
});

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
