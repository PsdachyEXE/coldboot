/** The `gantt` game (Section 7.3, P1): critical path, project length, delays and milestones. */
import { createQuizSession } from '../engine';
import type { Game } from '../types';
import { ganttItem, generateGanttItem, planGanttRound } from './items';
import { GANTT_GAME_KK, GANTT_ID, GANTT_MAN, GANTT_TITLE } from './meta';

const game: Game = {
  id: GANTT_ID,
  title: GANTT_TITLE,
  kk: GANTT_GAME_KK,
  man: GANTT_MAN,
  start(ctx, opts) {
    const plan = planGanttRound(opts.seed, opts.count ?? 10);
    return createQuizSession({
      gameId: GANTT_ID,
      now: ctx.now,
      count: plan.length,
      generate: (i) => ganttItem(plan[i], opts.difficulty),
      summaryExtra: () => [
        {
          kind: 'text',
          text: opts.difficulty === 'hard' ? 'Type play gantt to go again, or play psm to practise the problem-solving methodology.' : 'Type play gantt --hard for bigger plans.',
          tone: 'muted',
        },
      ],
    });
  },
  generate: generateGanttItem,
};

export default game;
