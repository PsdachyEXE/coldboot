/** Registry text for `psm`, kept apart from the game code so `ls` and `man` load nothing extra. */
import type { KkId } from '../../content/schema';

export const PSM_ID = 'psm';
export const PSM_TITLE = 'Problem-solving methodology';
export const PSM_KK: KkId[] = ['PSM'];
export const PSM_SUMMARY = 'Sort activities into the four stages of the problem-solving methodology';

export const PSM_MAN = `psm drills the problem-solving methodology: its four stages, the activities in each, and their order.

The stages, in order:
  1 analysis: solution requirements, solution constraints and solution scope (what the solution must do and the qualities it needs, the limits it must work within, and what it will and won't address);
  2 design: solution design (how the solution will look and work), and the evaluation criteria that judge the designs and, later, the finished solution;
  3 development: manipulation (coding), validation, testing and documentation;
  4 evaluation: the evaluation strategy (the criteria, the data to collect and how, the time frame, and who collects it) and the solution evaluation (applying those criteria to judge how well the finished solution meets its requirements).
Each stage also has skills underpinning it, such as collecting data in analysis.

Most questions name an activity, or describe what someone is doing, and ask which stage it belongs to. Type the stage name or its number. Others ask which of two activities comes first (type A or B), which stage's documentation shows a specification note, or the order of three activities (type the letters in order, such as C A B). An activity whose name gives its stage away, such as solution design or a stage's underpinning skills, is always described rather than named.

Watch for the traps: setting evaluation criteria happens in design, not evaluation, and validating input data is part of development.

Example: "Solution constraints" is part of analysis, so type analysis or 1.

A round has 10 questions. On a phone, tap a stage below the prompt.

Difficulty: --easy names every activity whose name doesn't give its stage away, and asks which of two comes first. Normal also describes activities, adds specification notes and asks for the order of three activities once, and --hard has more of each.

Usage: play psm [--easy|--hard]`;
