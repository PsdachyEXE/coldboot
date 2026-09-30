/** The `ux` game (Section 7.3, P2): the weakest user experience characteristic in a mock-up, and why. */
import { createQuizSession } from '../engine';
import type { Game } from '../types';
import { generateUxItem, planUxRound, uxItem } from './items';
import { UX_GAME_KK, UX_ID, UX_MAN, UX_TITLE } from './meta';

const game: Game = {
  id: UX_ID,
  title: UX_TITLE,
  kk: UX_GAME_KK,
  man: UX_MAN,
  start(ctx, opts) {
    const plan = planUxRound(opts.seed, opts.difficulty, opts.count ?? 10);
    return createQuizSession({
      gameId: UX_ID,
      now: ctx.now,
      count: plan.length,
      generate: (i) => uxItem(plan[i], opts.difficulty),
      summaryExtra: () => [
        {
          kind: 'text',
          text: opts.difficulty === 'hard' ? 'Type play ux to go again with new mock-ups.' : 'Type play ux --hard for more reasons to choose from.',
          tone: 'muted',
        },
      ],
    });
  },
  generate: generateUxItem,
};

export default game;
