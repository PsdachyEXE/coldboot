/** The `sort` game (Section 7.3, P0): selection sort passes, quick sort partitions and concepts. */
import { createQuizSession } from '../engine';
import type { Game } from '../types';
import { generateSortItem, planSortRound, sortItem } from './items';
import { SORT_ID, SORT_KK, SORT_MAN, SORT_TITLE } from './meta';

const game: Game = {
  id: SORT_ID,
  title: SORT_TITLE,
  kk: SORT_KK,
  man: SORT_MAN,
  start(ctx, opts) {
    const plan = planSortRound(opts.seed, opts.count ?? 10);
    return createQuizSession({
      gameId: SORT_ID,
      now: ctx.now,
      count: plan.length,
      generate: (i) => sortItem(plan[i], opts.difficulty),
      summaryExtra: () => [
        {
          kind: 'text',
          text: opts.difficulty === 'hard' ? 'Type play sort to go again, or play search for the searching algorithms.' : 'Type play sort --hard for 8 values with repeats, or play search next.',
          tone: 'muted',
        },
      ],
    });
  },
  generate: generateSortItem,
};

export default game;
