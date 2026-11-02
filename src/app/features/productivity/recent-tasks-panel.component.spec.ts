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

  it('adds a task with the due date typed at the end of its title', async () => {
    const { fixture, element, store } = await render([]);

    await type(fixture, element, 'Ship release notes tomorrow');
    expect(element.querySelector('#recent-tasks-input-due')?.textContent).toContain('Due');
    element.querySelector('dt-task-capture form')?.dispatchEvent(new Event('submit'));

    expect(store.tasks()).toEqual([
      expect.objectContaining({ title: 'Ship release notes', dueAt: '2026-11-03' }),
    ]);
  });

  it('keeps the date word in the title when the date chip is dismissed', async () => {
    const { fixture, element, store } = await render([]);

    await type(fixture, element, 'Call with fri');
    (element.querySelector('button[aria-label="Keep “fri” as text"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    element.querySelector('dt-task-capture form')?.dispatchEvent(new Event('submit'));

    expect(store.tasks()).toEqual([
      expect.objectContaining({ title: 'Call with fri', dueAt: null }),
    ]);
  });

  it('offers undo after completing a task', async () => {
    const { fixture, element, store } = await render([task('Write changelog', null)]);

    (
      element.querySelector('button[aria-label="Complete: Write changelog"]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(store.tasks()[0].status).toBe('done');
    expect(element.textContent).toContain('Completed “Write changelog”');

    const undo = Array.from(element.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Undo',
    ) as HTMLButtonElement;
    undo.click();
    fixture.detectChanges();

    expect(store.tasks()[0].status).toBe('todo');
    expect(element.textContent).not.toContain('Completed “Write changelog”');
  });
});

async function render(tasks: Task[]) {
  await TestBed.configureTestingModule({
    imports: [RecentTasksPanelComponent],
  }).compileComponents();
  const store = TestBed.inject(TaskStoreService);
  store.tasks.set(tasks);
  const fixture = TestBed.createComponent(RecentTasksPanelComponent);
  fixture.detectChanges();
  // ngModel registers its control with the form asynchronously.
  await fixture.whenStable();
  return { fixture, element: fixture.nativeElement as HTMLElement, store };
}

async function type(
  fixture: { detectChanges(): void },
  element: HTMLElement,
  text: string,
): Promise<void> {
  const input = element.querySelector('#recent-tasks-input') as HTMLInputElement;
  input.value = text;
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
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
