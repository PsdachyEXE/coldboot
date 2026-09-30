/** The `validate` game (Section 7.3, P0): existence, type and range checks, and boundary values. */
import { createQuizSession } from '../engine';
import type { Game } from '../types';
import { generateValidateItem, planValidateRound, validateItem } from './items';
import { VALIDATE_ID, VALIDATE_KK, VALIDATE_MAN, VALIDATE_TITLE } from './meta';

const game: Game = {
  id: VALIDATE_ID,
  title: VALIDATE_TITLE,
  kk: VALIDATE_KK,
  man: VALIDATE_MAN,
  start(ctx, opts) {
    const plan = planValidateRound(opts.seed, opts.difficulty, opts.count ?? 10);
    return createQuizSession({
      gameId: VALIDATE_ID,
      now: ctx.now,
      count: plan.length,
      generate: (i) => validateItem(plan[i], opts.difficulty),
      summaryExtra: () => [
        {
          kind: 'text',
          text: opts.difficulty === 'hard' ? 'Type play validate to go again, or play deskcheck to build test tables.' : 'Type play validate --hard for more dates and decimals, or play deskcheck next.',
          tone: 'muted',
        },
      ],
    });
  },
  generate: generateValidateItem,
};

export default game;
