/**
 * The `types` game (Section 7.3, P1): data types, data structures and data sources. The folder is
 * types-game because src/games/types.ts (the game contract) already answers `./types` imports.
 */
import { createQuizSession } from '../engine';
import type { Game } from '../types';
import { generateTypesItem, planTypesRound, typesItem } from './items';
import { TYPES_GAME_KK, TYPES_ID, TYPES_MAN, TYPES_TITLE } from './meta';

const game: Game = {
  id: TYPES_ID,
  title: TYPES_TITLE,
  kk: TYPES_GAME_KK,
  man: TYPES_MAN,
  start(ctx, opts) {
    const plan = planTypesRound(opts.seed, opts.difficulty, opts.count ?? 10);
    return createQuizSession({
      gameId: TYPES_ID,
      now: ctx.now,
      count: plan.length,
      generate: (i) => typesItem(plan[i], opts.difficulty),
      summaryExtra: () => [
        {
          kind: 'text',
          text:
            opts.difficulty === 'hard'
              ? 'Type play types to go again, or play oop to practise classes and objects.'
              : 'Type play types --hard for the trickier cases, or play oop next.',
          tone: 'muted',
        },
      ],
    });
  },
  generate: generateTypesItem,
};

export default game;
