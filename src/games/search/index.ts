/** The `search` game (Section 7.3, P0): binary and linear search traces, counts and scenarios. */
import { createQuizSession } from '../engine';
import type { Game } from '../types';
import { generateSearchItem, planSearchRound, searchItem } from './items';
import { SEARCH_ID, SEARCH_KK, SEARCH_MAN, SEARCH_TITLE } from './meta';

const game: Game = {
  id: SEARCH_ID,
  title: SEARCH_TITLE,
  kk: SEARCH_KK,
  man: SEARCH_MAN,
  start(ctx, opts) {
    const plan = planSearchRound(opts.seed, opts.count ?? 10);
    return createQuizSession({
      gameId: SEARCH_ID,
      now: ctx.now,
      count: plan.length,
      generate: (i) => searchItem(plan[i], opts.difficulty),
      summaryExtra: () => [
        {
          kind: 'text',
          text: opts.difficulty === 'hard' ? 'Type play search to go again, or play sort for the sorting algorithms.' : 'Type play search --hard for longer arrays, or play sort next.',
          tone: 'muted',
        },
      ],
    });
  },
  generate: generateSearchItem,
};

export default game;
