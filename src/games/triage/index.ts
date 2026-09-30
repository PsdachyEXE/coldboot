/** The `triage` game (Section 7.3, P0): classify errors and choose debugging techniques. */
import { createQuizSession } from '../engine';
import type { Game } from '../types';
import { generateTriageItem, planTriageRound, triageItem } from './items';
import { TRIAGE_ID, TRIAGE_KK, TRIAGE_MAN, TRIAGE_TITLE } from './meta';

const game: Game = {
  id: TRIAGE_ID,
  title: TRIAGE_TITLE,
  kk: TRIAGE_KK,
  man: TRIAGE_MAN,
  start(ctx, opts) {
    const plan = planTriageRound(opts.seed, opts.difficulty, opts.count ?? 10);
    return createQuizSession({
      gameId: TRIAGE_ID,
      now: ctx.now,
      count: plan.length,
      generate: (i) => triageItem(plan[i], opts.difficulty),
      summaryExtra: () => [
        {
          kind: 'text',
          text: opts.difficulty === 'hard' ? 'Type play triage to go again, or play validate to practise validation checks.' : 'Type play triage --hard for more listings, or play validate next.',
          tone: 'muted',
        },
      ],
    });
  },
  generate: generateTriageItem,
};

export default game;
