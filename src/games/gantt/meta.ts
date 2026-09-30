/** Registry text for `gantt`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const GANTT_ID = 'gantt';
export const GANTT_TITLE = 'Gantt charts and the critical path';
export const GANTT_GAME_KK: KkId[] = ['U3O2-KK03', 'U4O1-KK12'];
export const GANTT_SUMMARY = 'Find the critical path, the project length and how long a task can be delayed';

export const GANTT_MAN = `gantt drills project plans: tasks, durations, dependencies, milestones and the critical path.

Each question shows a plan as a table of 5 to 9 tasks. A task starts as soon as every task it depends on (its After column) has finished, and tasks with none start on day 1. Five questions follow on each plan:
  how many days the whole project takes;
  the critical path: the longest chain of dependent tasks, typed in order, such as A B D F;
  how many days a task can be delayed without delaying the project;
  how far the finish moves when a task finishes some days late (0 if it doesn't move);
  a sensible milestone: a point with no duration that marks a stage or deliverable being finished.

After each answer, a text Gantt chart shows the plan. On it, * and # mark critical tasks, = marks other tasks, and the Spare column and the dots show how many days a task can be delayed. Some textbooks call that time slack or float.

Example: A takes 3 days. B (4 days) and C (2 days) both depend on A, and D (2 days) depends on B and C. The critical path is A B D, the project takes 3 + 4 + 2 = 9 days, and C can be delayed by 2 days.

A round has 10 questions on two plans.

Difficulty: --easy uses 5 or 6 short tasks, normal uses 6 to 8, and --hard uses 8 or 9 tasks. Normal and --hard also ask about critical tasks, which can't be delayed at all.

Usage: play gantt [--easy|--hard]`;
