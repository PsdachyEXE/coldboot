/** The `law` game (Section 7.3, P1): which Act applies to a scenario, and why. */
import { createQuizSession } from '../engine';
import type { Game } from '../types';
import { generateLawItem, lawItem, planLawRound } from './items';
import { LAW_GAME_KK, LAW_ID, LAW_MAN, LAW_TITLE } from './meta';

const game: Game = {
  id: LAW_ID,
  title: LAW_TITLE,
  kk: LAW_GAME_KK,
  man: LAW_MAN,
  start(ctx, opts) {
    const plan = planLawRound(opts.seed, opts.difficulty, opts.count ?? 10);
    return createQuizSession({
      gameId: LAW_ID,
      now: ctx.now,
      count: plan.length,
      generate: (i) => lawItem(plan[i], opts.difficulty),
      summaryExtra: () => [
        {
          kind: 'text',
          text:
            opts.difficulty === 'hard'
              ? 'Type play law to go again, or play threat to practise security controls.'
              : 'Type play law --hard for contractors and overlapping Acts, or play threat next.',
          tone: 'muted',
        },
      ],
    });
  },
  generate: generateLawItem,
};

export default game;
