/** The `threat` game (Section 7.3, P1): weaknesses and controls, and the Essential Eight. */
import { createQuizSession } from '../engine';
import type { Game } from '../types';
import { generateThreatItem, planThreatRound, threatItem } from './items';
import { THREAT_GAME_KK, THREAT_ID, THREAT_MAN, THREAT_TITLE } from './meta';

const game: Game = {
  id: THREAT_ID,
  title: THREAT_TITLE,
  kk: THREAT_GAME_KK,
  man: THREAT_MAN,
  start(ctx, opts) {
    const plan = planThreatRound(opts.seed, opts.difficulty, opts.count ?? 10);
    return createQuizSession({
      gameId: THREAT_ID,
      now: ctx.now,
      count: plan.length,
      generate: (i) => threatItem(plan[i], opts.difficulty),
      summaryExtra: () => [
        {
          kind: 'text',
          text:
            opts.difficulty === 'hard'
              ? 'Type play threat to go again, or play law to practise the Acts.'
              : 'Type play threat --hard for more options and longer lists, or play law next.',
          tone: 'muted',
        },
      ],
    });
  },
  generate: generateThreatItem,
};

export default game;
