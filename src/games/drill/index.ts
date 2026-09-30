/**
 * The terminal's Section A drill: content MCQs on the quiz engine. Started by the `drill` command
 * with the KKs to draw from (GameStartOptions.kk); without them it uses the weakest KKs.
 */
import { createQuizSession } from '../engine';
import { mcqItem } from '../mcq';
import { mulberry32 } from '../prng';
import type { Game } from '../types';
import { DRILL_ID, DRILL_MAN, DRILL_TITLE } from './meta';
import { selectDrillMcqs, weakestDrillKks } from './select';

const game: Game = {
  id: DRILL_ID,
  title: DRILL_TITLE,
  kk: [],
  man: DRILL_MAN,
  start(ctx, opts) {
    const content = ctx.content;
    const count = opts.count ?? 10;
    const kks = opts.kk?.length ? opts.kk : content ? weakestDrillKks(content, ctx.mastery, count) : [];
    const mcqs = content ? selectDrillMcqs(content, kks, mulberry32(opts.seed), count) : [];
    return createQuizSession({
      gameId: DRILL_ID,
      now: ctx.now,
      items: mcqs.map(mcqItem),
      summaryExtra: () => [{ kind: 'text', text: 'Type drill to go again, or review to revise the flashcards.', tone: 'muted' }],
    });
  },
};

export default game;
