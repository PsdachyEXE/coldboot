/** The `deskcheck` game (Section 7.3, P0): trace generated pseudocode and choose test data. */
import { createQuizSession } from '../engine';
import type { Game } from '../types';
import { deskcheckItem, generateDeskcheckItem, planDeskcheckRound } from './items';
import { DESKCHECK_ID, DESKCHECK_KK, DESKCHECK_MAN, DESKCHECK_TITLE } from './meta';

const game: Game = {
  id: DESKCHECK_ID,
  title: DESKCHECK_TITLE,
  kk: DESKCHECK_KK,
  man: DESKCHECK_MAN,
  start(ctx, opts) {
    const plan = planDeskcheckRound(opts.seed, opts.difficulty, opts.count ?? 10);
    return createQuizSession({
      gameId: DESKCHECK_ID,
      now: ctx.now,
      count: plan.length,
      generate: (i) => deskcheckItem(plan[i], opts.difficulty),
      summaryExtra: () => [
        {
          kind: 'text',
          text:
            opts.difficulty === 'hard'
              ? 'Type play deskcheck to go again, or play triage to practise finding errors.'
              : 'Type play deskcheck --hard for nested loops and off-by-one traps, or play triage next.',
          tone: 'muted',
        },
      ],
    });
  },
  generate: generateDeskcheckItem,
};

export default game;
