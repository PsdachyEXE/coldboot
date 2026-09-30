/** Registry text for `psm`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const PSM_ID = 'psm';
export const PSM_TITLE = 'Problem-solving methodology';
export const PSM_KK: KkId[] = ['PSM'];
export const PSM_SUMMARY = 'Sort activities into the four stages of the problem-solving methodology';

export const PSM_MAN = `psm drills the problem-solving methodology: its four stages, what happens in each, and their order.

The stages, in order:
  1 analysis: what the solution must do, and the limits it works within;
  2 design: how the solution will look and work, and the criteria for evaluating it;
  3 development: building, validating, testing and documenting the solution;
  4 evaluation: judging how well the finished solution meets the need.

Most questions name an activity, or describe what someone is doing, and ask which stage it belongs to. Type the stage name or its number. Others ask which of two activities comes first (type A or B), which stage's documentation shows a specification note, or the order of three activities (type the letters in order, such as C A B).

Watch for the traps: setting evaluation criteria happens in design, not evaluation, and validating input data is part of development.

Example: "Identifying constraints" is part of analysis, so type analysis or 1.

A round has 10 questions. On a phone, tap a stage below the prompt.

Difficulty: --easy names every activity and asks which of two comes first. Normal also describes activities, adds specification notes and asks for the order of three activities once, and --hard has more of each.

Usage: play psm [--easy|--hard]`;
