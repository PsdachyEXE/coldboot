/** Drill results as data: the round's answers, per-KK tallies and the suggested next step. */
import type { ContentIndex } from '../../content/loader';
import type { KkId } from '../../content/schema';
import { ALL_KK_IDS, kkLabel } from '../../content/studyDesign';
import { drillPath, paths, reviewPath } from '../paths';

export interface DrillAnswer {
  itemId: string;
  kk: KkId[];
  correct: boolean;
  /** False for a question left unanswered when time ran out. */
  answered: boolean;
}

export interface DrillResult {
  answers: DrillAnswer[];
  correct: number;
  /** Questions scored: every question in a timed round, the answered ones otherwise. */
  total: number;
  timed: boolean;
  timedOut: boolean;
  /** Milliseconds left on the clock at the end of a timed round. */
  msLeft: number;
}

export interface KkTally {
  kk: KkId;
  correct: number;
  total: number;
}

const ORDER = new Map(ALL_KK_IDS.map((kk, i) => [kk, i]));

/** Results per KK, weakest first (an item tagged with two KKs counts toward both). */
export function tallyByKk(result: DrillResult): KkTally[] {
  const map = new Map<KkId, KkTally>();
  for (const a of result.answers) {
    for (const kk of a.kk) {
      const t = map.get(kk) ?? { kk, correct: 0, total: 0 };
      t.total += 1;
      if (a.correct) t.correct += 1;
      map.set(kk, t);
    }
  }
  return [...map.values()].sort((a, b) => a.correct / a.total - b.correct / b.total || (ORDER.get(a.kk) ?? 0) - (ORDER.get(b.kk) ?? 0));
}

export interface NextStep {
  text: string;
  label: string;
  to: string;
}

/** What to do after a round: the KK that lost the most, or a harder format when nothing was lost. */
export function suggestNextStep(result: DrillResult, content: ContentIndex): NextStep {
  const worst = tallyByKk(result).find((t) => t.correct < t.total);
  if (worst) {
    const hasCards = (content.byKk.get(worst.kk)?.cards.length ?? 0) > 0;
    return hasCards
      ? {
          text: `Review the flashcards for ${kkLabel(worst.kk)}, where this round went least well.`,
          label: 'Review this key knowledge',
          to: reviewPath({ kk: worst.kk }),
        }
      : {
          text: `Drill ${kkLabel(worst.kk)} again, where this round went least well.`,
          label: 'Drill this key knowledge',
          to: drillPath({ kk: worst.kk }),
        };
  }
  if (result.total === 0) return { text: 'Choose a drill when you are ready to answer some questions.', label: 'Choose a drill', to: paths.drill };
  if (!result.timed) {
    return {
      text: 'Every answer was right. Try a timed round at Section A pace: 20 questions in 24 minutes.',
      label: 'Start a timed drill',
      to: drillPath({ mode: 'random', timed: true }),
    };
  }
  return { text: 'Every answer was right. Practise a written question next.', label: 'Go to Written', to: paths.written };
}

