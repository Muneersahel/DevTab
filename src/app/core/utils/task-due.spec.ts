import { describe, expect, it } from 'vitest';
import { parseTaskInput } from './task-due';

// Monday 2 November 2026, local time.
const now = new Date(2026, 10, 2, 10);

describe('parseTaskInput', () => {
  it.each([
    ['Ship notes tomorrow', 'Ship notes', '2026-11-03'],
    ['Call the bank today', 'Call the bank', '2026-11-02'],
    ['Review PR fri', 'Review PR', '2026-11-06'],
    ['Call vendor Thurs', 'Call vendor', '2026-11-05'],
    ['Plan sprint monday', 'Plan sprint', '2026-11-09'],
    ['Retro next week', 'Retro', '2026-11-09'],
    ['Fix friday deploy bug', 'Fix friday deploy bug', null],
    ['tomorrow', 'tomorrow', null],
    ['  Write tests  ', 'Write tests', null],
  ])('parses "%s"', (text, title, dueAt) => {
    expect(parseTaskInput(text, now)).toMatchObject({ title, dueAt });
  });
});
