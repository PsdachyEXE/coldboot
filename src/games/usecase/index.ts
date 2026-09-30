/** The `usecase` game (Section 7.3, P1): actors, includes and extends, and use case diagram errors. */
import { createQuizSession } from '../engine';
import type { Game } from '../types';
import { generateUsecaseItem, planUsecaseRound, usecaseItem } from './items';
import { USECASE_GAME_KK, USECASE_ID, USECASE_MAN, USECASE_TITLE } from './meta';

const game: Game = {
  id: USECASE_ID,
  title: USECASE_TITLE,
  kk: USECASE_GAME_KK,
  man: USECASE_MAN,
  start(ctx, opts) {
    const plan = planUsecaseRound(opts.seed, opts.difficulty, opts.count ?? 10);
    return createQuizSession({
      gameId: USECASE_ID,
      now: ctx.now,
      count: plan.length,
      generate: (i) => usecaseItem(plan[i], opts.difficulty),
      summaryExtra: () => [
        {
          kind: 'text',
          text: opts.difficulty === 'hard' ? 'Type play usecase to go again, or play dfd to find errors in data flow diagrams.' : 'Type play usecase --hard for more diagrams to check.',
          tone: 'muted',
        },
      ],
    });
  },
  generate: generateUsecaseItem,
};

export default game;
