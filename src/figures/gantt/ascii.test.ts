import { describe, expect, it } from 'vitest';
import { asciiGantt, type AsciiGanttTask } from './ascii';
import { computeSchedule } from './schedule';

const plan: AsciiGanttTask[] = [
  { id: 'A', name: 'Interview stakeholders', duration: 3, dependsOn: [] },
  { id: 'B', name: 'Write the SRS', duration: 4, dependsOn: ['A'] },
  { id: 'C', name: 'Design mock-ups', duration: 2, dependsOn: ['A'] },
  { id: 'D', name: 'Build the booking module', duration: 6, dependsOn: ['B', 'C'] },
  { id: 'E', name: 'Design sign-off', duration: 0, dependsOn: ['C'], milestone: true },
  { id: 'F', name: 'Beta test', duration: 3, dependsOn: ['D'] },
];

describe('asciiGantt', () => {
  it('draws the critical path with symbols, slack as dots and a unit scale', () => {
    expect(asciiGantt(plan, computeSchedule(plan))).toMatchInlineSnapshot(`
      "  Task                      Days  Slack  1   5    10   15
                                               +---+----+----+-
      * A Interview stakeholders     3      0  ###
      * B Write the SRS              4      0     ####
        C Design mock-ups            2      2     ==..
      * D Build the booking m...     6      0         ######
        E Design sign-off            0     11      M...........
      * F Beta test                  3      0               ###

      Scale: 1 column = 1 day. Key: * and # critical task, = other task, . slack, M milestone."
    `);
  });

  it('hides the critical path and slack while a game asks for them', () => {
    const out = asciiGantt(plan, computeSchedule(plan), { showCritical: false, unit: 'week' });
    expect(out).toMatchInlineSnapshot(`
      "Task                      Weeks  1   5    10   15
                                       +---+----+----+-
      A Interview stakeholders      3  ===
      B Write the SRS               4     ====
      C Design mock-ups             2     ==
      D Build the booking m...      6         ======
      E Design sign-off             0      M
      F Beta test                   3               ===

      Scale: 1 column = 1 week. Key: = task, M milestone."
    `);
    expect(out).not.toMatch(/[#*]|Slack|[=M]\./);
  });

  it('puts several units in a column for long projects and says so', () => {
    const long: AsciiGanttTask[] = [
      { id: 'A', name: 'Long task', duration: 90, dependsOn: [] },
      { id: 'B', name: 'Short task', duration: 30, dependsOn: [] },
    ];
    const out = asciiGantt(long, computeSchedule(long));
    expect(out).toContain('Scale: 1 column = 2 days.');
    const rows = out.split('\n');
    expect(rows[2]).toMatch(/#{45}$/);
    expect(rows[3]).toMatch(/={15}\.{30}$/);
  });

  it('stays ASCII whatever the task names contain', () => {
    const tasks: AsciiGanttTask[] = [{ id: 'A', name: 'Café → review', duration: 2, dependsOn: [] }];
    expect(asciiGantt(tasks, computeSchedule(tasks))).toMatch(/^[\x20-\x7e\n]*$/);
  });
});
