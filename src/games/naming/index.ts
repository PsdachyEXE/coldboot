/** The `naming` game (Section 7.3, P1): camel case, snake case and Hungarian notation. */
import { createQuizSession } from '../engine';
import type { Game } from '../types';
import { generateNamingItem, namingItem, planNamingRound } from './items';
import { NAMING_GAME_KK, NAMING_ID, NAMING_MAN, NAMING_TITLE } from './meta';

const game: Game = {
  id: NAMING_ID,
  title: NAMING_TITLE,
  kk: NAMING_GAME_KK,
  man: NAMING_MAN,
  start(ctx, opts) {
    const plan = planNamingRound(opts.seed, opts.difficulty, opts.count ?? 10);
    return createQuizSession({
      gameId: NAMING_ID,
      now: ctx.now,
      count: plan.length,
      generate: (i) => namingItem(plan[i], opts.difficulty),
      summaryExtra: () => [
        {
          kind: 'text',
          text:
            opts.difficulty === 'hard'
              ? 'Type play naming to go again, or play types to choose data types.'
              : 'Type play naming --hard for longer names and lookalikes, or play types next.',
          tone: 'muted',
        },
      ],
    });
  },
  generate: generateNamingItem,
};

export default game;
