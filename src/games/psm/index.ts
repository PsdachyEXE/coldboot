/**
 * The `psm` game (Section 7.3, P1): sort activities into the four stages of the problem-solving
 * methodology, and put activities in order. It draws on the stages, activities and specification
 * notes in content/psm.json (GameContext.content), so it has no generate(): Game.generate takes
 * no content.
 */
import { createQuizSession, unavailableSession } from '../engine';
import type { Game } from '../types';
import { planPsmRound, psmBank, psmItem } from './items';
import { PSM_ID, PSM_KK, PSM_MAN, PSM_TITLE } from './meta';

const game: Game = {
  id: PSM_ID,
  title: PSM_TITLE,
  kk: PSM_KK,
  man: PSM_MAN,
  start(ctx, opts) {
    const bank = psmBank(ctx.content?.psm);
    if (!bank) {
      return unavailableSession(PSM_ID, [
        { kind: 'text', text: "The problem-solving methodology content isn't installed, so psm has no activities to ask about.", tone: 'warning' },
        { kind: 'text', text: 'Type play gantt or play reqs instead: they make their own questions.', tone: 'muted' },
      ]);
    }
    const plan = planPsmRound(bank, opts.seed, opts.difficulty, opts.count ?? 10);
    return createQuizSession({
      gameId: PSM_ID,
      now: ctx.now,
      count: plan.length,
      generate: (i) => psmItem(bank, plan[i], opts.difficulty),
      summaryExtra: () => [
        {
          kind: 'text',
          text: opts.difficulty === 'hard' ? 'Type play psm to go again, or drill PSM for Section A questions on it.' : 'Type play psm --hard to order activities and match specification notes.',
          tone: 'muted',
        },
      ],
    });
  },
};

export default game;
