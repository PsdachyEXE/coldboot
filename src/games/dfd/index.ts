/** The `dfd` game (Section 7.3, P1): convention errors in context diagrams and DFDs, and labelling a Level 1 DFD. */
import { createQuizSession } from '../engine';
import type { Game } from '../types';
import { dfdItem, generateDfdItem, planDfdRound } from './items';
import { DFD_GAME_KK, DFD_ID, DFD_MAN, DFD_TITLE } from './meta';

const game: Game = {
  id: DFD_ID,
  title: DFD_TITLE,
  kk: DFD_GAME_KK,
  man: DFD_MAN,
  start(ctx, opts) {
    const plan = planDfdRound(opts.seed, opts.difficulty, opts.count ?? 10);
    return createQuizSession({
      gameId: DFD_ID,
      now: ctx.now,
      count: plan.length,
      generate: (i) => dfdItem(plan[i], opts.difficulty),
      summaryExtra: () => [
        {
          kind: 'text',
          text: opts.difficulty === 'hard' ? 'Type play dfd to go again, or play usecase for use case diagrams.' : 'Type play dfd --hard for more data flow diagrams and more marked elements.',
          tone: 'muted',
        },
      ],
    });
  },
  generate: generateDfdItem,
};

export default game;
