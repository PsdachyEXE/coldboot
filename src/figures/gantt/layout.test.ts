import { describe, expect, it } from 'vitest';
import { ganttFixture } from '../fixtures';
import { layoutGantt } from './layout';
import { computeSchedule } from './schedule';

const schedule = computeSchedule(ganttFixture.tasks);

describe('Gantt layout', () => {
  it('puts the task columns beside the bars in the full layout', () => {
    const full = layoutGantt(ganttFixture, schedule);
    expect(full.compact).toBe(false);
    expect(full.plotX).toBeGreaterThan(full.depsX);
    expect(full.rows[0].nameLines).toEqual(['Interview stakeholders']);
  });

  it('keeps only the ids beside the bars and fits a phone in the compact layout', () => {
    const full = layoutGantt(ganttFixture, schedule);
    const compact = layoutGantt(ganttFixture, schedule, { compact: true, fitWidth: 320 });
    expect(compact.compact).toBe(true);
    expect(compact.plotX).toBeLessThan(full.plotX);
    expect(compact.width).toBeLessThanOrEqual(320);
    expect(compact.rows.every((r) => r.nameLines.length === 0 && r.depsLines.length === 0)).toBe(true);
    // The bars keep their schedule: B starts when A (3 days) ends.
    const a = compact.rows.find((r) => r.task.id === 'A')!.bar!;
    const b = compact.rows.find((r) => r.task.id === 'B')!.bar!;
    expect(b.x).toBeCloseTo(a.x + a.w);
  });

  it('never makes a column narrower than 8 px, scrolling instead', () => {
    const compact = layoutGantt(ganttFixture, schedule, { compact: true, fitWidth: 120 });
    expect(compact.unitW).toBe(8);
    expect(compact.width).toBeGreaterThan(120);
  });
});
