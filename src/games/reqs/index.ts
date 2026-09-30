/** The `reqs` game (Section 7.3, P1): functional and non-functional requirements, constraints and scope. */
import { createQuizSession } from '../engine';
import type { Game } from '../types';
import { generateReqsItem, planReqsRound, reqsItem } from './items';
import { REQS_ID, REQS_KK, REQS_MAN, REQS_TITLE } from './meta';

const game: Game = {
  id: REQS_ID,
  title: REQS_TITLE,
  kk: REQS_KK,
  man: REQS_MAN,
  start(ctx, opts) {
    const plan = planReqsRound(opts.seed, opts.difficulty, opts.count ?? 10);
    return createQuizSession({
      gameId: REQS_ID,
      now: ctx.now,
      count: plan.length,
      generate: (i) => reqsItem(plan[i], opts.difficulty),
      summaryExtra: () => [
        {
          kind: 'text',
          text: opts.difficulty === 'hard' ? 'Type play reqs to go again, or play usecase to model what users do.' : 'Type play reqs --hard for the statements that are easiest to mix up.',
          tone: 'muted',
        },
      ],
    });
  },
  generate: generateReqsItem,
};

export default game;
