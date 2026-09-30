/** The `oop` game (Section 7.3, P1): OOP principles, object descriptions and access modifiers. */
import { createQuizSession } from '../engine';
import type { Game } from '../types';
import { generateOopItem, oopItem, planOopRound } from './items';
import { OOP_GAME_KK, OOP_ID, OOP_MAN, OOP_TITLE } from './meta';

const game: Game = {
  id: OOP_ID,
  title: OOP_TITLE,
  kk: OOP_GAME_KK,
  man: OOP_MAN,
  start(ctx, opts) {
    const plan = planOopRound(opts.seed, opts.difficulty, opts.count ?? 10);
    return createQuizSession({
      gameId: OOP_ID,
      now: ctx.now,
      count: plan.length,
      generate: (i) => oopItem(plan[i], opts.difficulty),
      summaryExtra: () => [
        {
          kind: 'text',
          text:
            opts.difficulty === 'hard'
              ? 'Type play oop to go again, or play naming to practise naming conventions.'
              : 'Type play oop --hard for harder scenarios, or play naming next.',
          tone: 'muted',
        },
      ],
    });
  },
  generate: generateOopItem,
};

export default game;
