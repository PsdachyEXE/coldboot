/**
 * Learn's matching game (docs/LEARN.md, D-225): terms down the left, their definitions shuffled
 * down the right, and a line from each term to its definition, like wiring a panel. Three ways to
 * connect a pair, all through the same round logic (match.ts):
 *
 * - drag from a term (or its dot) to a definition, with a mouse, a pen or a finger (let go anywhere
 *   else and the line is dropped; let go over the term itself and the term is chosen);
 * - tap or click a term, then a definition;
 * - Tab to a term, Enter, Tab to a definition, Enter. Escape cancels.
 *
 * A correct pair keeps its line and says "Matched"; a wrong one says "Not this one" for a moment,
 * counts a miss and brings that pair back next round. Nothing is saved or scored: the game never
 * touches the review schedule or mastery. The panel is a labelled group, not a landmark: a page
 * holds several of them, each inside its area's own region.
 *
 * The lines live in one SVG layer over the board. Their ends are read from the dots' positions
 * (getBoundingClientRect, relative to the board) and written straight to the line elements, after
 * every render and whenever the board or the window resizes or scrolls, so dragging never
 * re-renders the board. Nothing animates; a drag held near the top or bottom of the page scrolls it.
 */
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import { announce } from '../../ui/announce';
import { Button } from '../../ui/Button';
import { useNarrow } from '../../ui/useMediaQuery';
import { connect, isDeckCleared, isRoundDone, nextRound, ROUND_SIZE, ROUND_SIZE_NARROW, roundSummary, startGame, type MatchGame as Game, type MatchPair, type Rng } from './match';
import styles from './MatchGame.module.css';

/** A press becomes a drag once the pointer has moved this far; less than that is a tap. */
const DRAG_START_PX = 6;
/** How long "Not this one" stays on a definition. */
const WRONG_MS = 1600;
/** A drag this close to the top or bottom of the visible page scrolls it, this far for each movement. */
const EDGE_PX = 32;
const SCROLL_STEP_PX = 10;

/**
 * Scrolls the page when a drag nears the top or bottom of what can be seen, so a definition that is
 * out of view (a short phone screen, a board below the fold) can still be reached. The visible band
 * is the window less the fixed bars, which the page's scroll padding already measures (global.css).
 */
function scrollAtEdge(y: number): void {
  if (typeof window.scrollBy !== 'function') return;
  const root = getComputedStyle(document.documentElement);
  const top = parseFloat(root.scrollPaddingTop) || 0;
  const bottom = window.innerHeight - (parseFloat(root.scrollPaddingBottom) || 0);
  if (y > bottom - EDGE_PX) window.scrollBy(0, SCROLL_STEP_PX);
  else if (y < top + EDGE_PX) window.scrollBy(0, -SCROLL_STEP_PX);
}

export interface MatchGameProps {
  /** What the pairs cover, as it reads after "Match:" and "Every pair in": "Programming", "all five areas". */
  title: string;
  pairs: readonly MatchPair[];
  /** "Back to the list": returns to the definitions this game draws from. */
  onBack(): void;
  /** Pairs in a round. Defaults to five, or four below 720 px. */
  size?: number;
  /** Shuffles the deck and each round; tests pass a fixed one. */
  rng?: Rng;
}

interface Press {
  termId: string;
  pointerId: number;
  x: number;
  y: number;
  moved: boolean;
}

export function MatchGame({ title, pairs, onBack, size, rng = Math.random }: MatchGameProps) {
  const uid = useId();
  const narrow = useNarrow();
  const roundSize = size ?? (narrow ? ROUND_SIZE_NARROW : ROUND_SIZE);
  const byId = useMemo(() => new Map(pairs.map((p) => [p.id, p])), [pairs]);

  const [game, setGame] = useState<Game | null>(null);
  /** The term chosen by a tap, a click or Enter, waiting for its definition. */
  const [selected, setSelected] = useState<string | null>(null);
  /** The term a line is being dragged from. */
  const [dragging, setDragging] = useState<string | null>(null);
  /** The definition under the dragged line. */
  const [over, setOver] = useState<string | null>(null);
  /** The definition showing "Not this one". */
  const [wrong, setWrong] = useState<string | null>(null);
  /** Where keyboard focus goes after the next render: a term's id, or "next" for the Next round button. */
  const [focus, setFocus] = useState<{ to: string } | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const press = useRef<Press | null>(null);
  /** Where the pointer is during a drag, in viewport coordinates. */
  const point = useRef<{ x: number; y: number } | null>(null);
  /** A drag's release is followed by a click on the term it started from; that click selects nothing. */
  const skipClick = useRef(false);
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Puts each line's ends on its dots (or, for the line being dragged, on the pointer). */
  const redraw = useCallback(() => {
    const board = boardRef.current;
    const svg = svgRef.current;
    if (!board || !svg) return;
    const box = board.getBoundingClientRect();
    const left = box.left + board.clientLeft;
    const top = box.top + board.clientTop;
    const centre = (key: string): { x: number; y: number } | null => {
      const dot = board.querySelector<HTMLElement>(`[data-dot="${key}"]`);
      if (!dot) return null;
      const r = dot.getBoundingClientRect();
      return { x: r.left + r.width / 2 - left, y: r.top + r.height / 2 - top };
    };
    for (const line of svg.querySelectorAll<SVGLineElement>('line')) {
      const from = centre(`term:${line.dataset.from}`);
      const to = line.dataset.to ? centre(`definition:${line.dataset.to}`) : point.current ? { x: point.current.x - left, y: point.current.y - top } : from;
      if (!from || !to) continue;
      line.setAttribute('x1', from.x.toFixed(1));
      line.setAttribute('y1', from.y.toFixed(1));
      line.setAttribute('x2', to.x.toFixed(1));
      line.setAttribute('y2', to.y.toFixed(1));
    }
  }, []);

  useLayoutEffect(() => {
    redraw();
  });

  const roundKey = game ? game.finished : -1;
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(redraw);
    observer?.observe(board);
    for (const item of board.querySelectorAll('[data-item]')) observer?.observe(item);
    window.addEventListener('resize', redraw);
    window.addEventListener('scroll', redraw, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', redraw);
      window.removeEventListener('scroll', redraw, true);
    };
  }, [redraw, roundKey]);

  useEffect(() => {
    if (!focus) return;
    const target = focus.to === 'next' ? nextRef.current : boardRef.current?.querySelector<HTMLElement>(`[data-term-id="${focus.to}"]`);
    target?.focus();
  }, [focus]);

  useEffect(
    () => () => {
      if (wrongTimer.current) clearTimeout(wrongTimer.current);
    },
    [],
  );

  function clearWrong() {
    if (wrongTimer.current) clearTimeout(wrongTimer.current);
    wrongTimer.current = null;
    setWrong(null);
  }

  function showWrong(definitionId: string) {
    if (wrongTimer.current) clearTimeout(wrongTimer.current);
    setWrong(definitionId);
    wrongTimer.current = setTimeout(() => {
      wrongTimer.current = null;
      setWrong(null);
    }, WRONG_MS);
  }

  function endDrag() {
    press.current = null;
    point.current = null;
    setDragging(null);
    setOver(null);
  }

  /** `keyboard` moves focus on to the next thing to do, so Enter and Tab are all a round needs. */
  function attempt(termId: string, definitionId: string, keyboard: boolean) {
    if (!game) return;
    const { game: next, result } = connect(game, termId, definitionId);
    if (result === 'ignored') return;
    setGame(next);
    const term = byId.get(termId)?.term ?? 'That term';
    if (result === 'miss') {
      showWrong(definitionId);
      announce(`Not this one. ${term} is still unmatched.`);
      return;
    }
    clearWrong();
    setSelected(null);
    if (isRoundDone(next.round)) {
      announce(`Matched: ${term}. Round finished: ${roundSummary(next.round)}.${isDeckCleared(next) ? ` Every pair in ${title} has now been matched without a miss.` : ''}`);
      if (keyboard) setFocus({ to: 'next' });
      return;
    }
    announce(`Matched: ${term}. ${next.round.matched.length} of ${next.round.terms.length}.`);
    const waiting = next.round.terms.find((id) => !next.round.matched.includes(id));
    if (keyboard && waiting) setFocus({ to: waiting });
  }

  function start(e: MouseEvent) {
    const fresh = startGame(
      pairs.map((p) => p.id),
      roundSize,
      rng,
    );
    setGame(fresh);
    announce(`Round 1: ${fresh.round.terms.length} pairs.`);
    if (e.detail === 0) setFocus({ to: fresh.round.terms[0] });
  }

  function next(e: MouseEvent) {
    if (!game) return;
    const dealt = nextRound(game, roundSize, rng);
    clearWrong();
    setSelected(null);
    setGame(dealt);
    announce(`Round ${dealt.finished + 1}: ${dealt.round.terms.length} pairs.`);
    if (e.detail === 0) setFocus({ to: dealt.round.terms[0] });
  }

  /** The definition under a point of the viewport, if it belongs to this board. */
  function definitionAt(x: number, y: number): string | null {
    const el = typeof document.elementFromPoint === 'function' ? document.elementFromPoint(x, y) : null;
    const hit = el?.closest<HTMLElement>('[data-definition-id]');
    return hit && boardRef.current?.contains(hit) ? (hit.dataset.definitionId ?? null) : null;
  }

  function onTermPointerDown(e: PointerEvent<HTMLButtonElement>, id: string) {
    if (!game || game.round.matched.includes(id) || (e.pointerType === 'mouse' && e.button !== 0)) return;
    press.current = { termId: id, pointerId: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // A pointer that can't be captured still drags while it stays over the board.
    }
  }

  function onTermPointerMove(e: PointerEvent<HTMLButtonElement>) {
    const p = press.current;
    if (!p || p.pointerId !== e.pointerId) return;
    if (!p.moved && Math.hypot(e.clientX - p.x, e.clientY - p.y) < DRAG_START_PX) return;
    p.moved = true;
    point.current = { x: e.clientX, y: e.clientY };
    if (dragging !== p.termId) {
      setDragging(p.termId);
      setSelected(null);
    }
    const target = definitionAt(e.clientX, e.clientY);
    const open = target && game && !game.round.matched.includes(target) ? target : null;
    if (open !== over) setOver(open);
    scrollAtEdge(e.clientY);
    redraw();
  }

  function onTermPointerUp(e: PointerEvent<HTMLButtonElement>) {
    const p = press.current;
    if (!p || p.pointerId !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      // Already released.
    }
    if (!p.moved) {
      // A tap or a click: the click event that follows selects the term.
      press.current = null;
      return;
    }
    skipClick.current = true;
    setTimeout(() => {
      skipClick.current = false;
    }, 0);
    const target = definitionAt(e.clientX, e.clientY);
    const under = typeof document.elementFromPoint === 'function' ? document.elementFromPoint(e.clientX, e.clientY) : null;
    const backHome = !target && under !== null && e.currentTarget.contains(under);
    endDrag();
    if (target) {
      // Released over a definition: connect.
      attempt(p.termId, target, false);
    } else if (backHome) {
      // Let go over the term it started from: a tap that wobbled, so the term is chosen as a tap chooses it.
      clearWrong();
      setSelected(p.termId);
    }
    // Released anywhere else: the drag is cancelled.
  }

  function onTermClick(id: string) {
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
    if (!game || game.round.matched.includes(id)) return;
    clearWrong();
    setSelected((current) => (current === id ? null : id));
  }

  function onDefinitionClick(e: MouseEvent, id: string) {
    if (!game || game.round.matched.includes(id)) return;
    if (!selected) {
      announce('Select a term first, then its definition.');
      return;
    }
    attempt(selected, id, e.detail === 0);
  }

  function onBoardKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Escape' || (!selected && !dragging)) return;
    e.stopPropagation();
    endDrag();
    setSelected(null);
    announce('Cancelled.');
  }

  const round = game?.round;
  const done = round ? isRoundDone(round) : false;

  return (
    <div className={styles.panel} role="group" aria-labelledby={`${uid}-title`}>
      <h3 id={`${uid}-title`} className={styles.title}>
        Match: {title}
      </h3>
      {!game || !round ? (
        <>
          <p className={styles.how}>
            {pairs.length} pairs, {roundSize} at a time. Drag a line from each term to its definition, or select a term and then its definition. A miss brings that pair back in the
            next round.
          </p>
          <Button variant="primary" onClick={start}>
            Start matching
          </Button>
        </>
      ) : (
        <>
          <p className={styles.status}>
            Round {game.finished + 1}. {roundSummary(round)}.
          </p>
          <p className={styles.progress}>
            {game.cleared.length} of {pairs.length} pairs matched without a miss so far.
          </p>
          {/* The board itself only listens for Escape; every action is on a button inside it. */}
          <div ref={boardRef} className={styles.board} onKeyDown={onBoardKeyDown}>
            <svg ref={svgRef} className={styles.wires} aria-hidden="true" focusable="false">
              {round.matched.map((id) => (
                <line key={id} data-from={id} data-to={id} className={styles.wireMatched} />
              ))}
              {dragging ? <line data-from={dragging} className={styles.wireDrag} /> : null}
            </svg>
            <ul className={styles.column} aria-label="Terms">
              {round.terms.map((id) => {
                const matched = round.matched.includes(id);
                const active = !matched && (selected === id || dragging === id);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      data-item=""
                      data-term-id={id}
                      className={[styles.item, styles.term, matched ? styles.matched : '', active ? styles.active : ''].filter(Boolean).join(' ')}
                      aria-pressed={matched ? undefined : selected === id}
                      aria-disabled={matched || undefined}
                      onClick={() => onTermClick(id)}
                      onPointerDown={(e) => onTermPointerDown(e, id)}
                      onPointerMove={onTermPointerMove}
                      onPointerUp={onTermPointerUp}
                      onPointerCancel={endDrag}
                    >
                      <span className={styles.text}>{byId.get(id)?.term}</span>
                      {matched ? <Verdict matched /> : null}
                      <span className={styles.dot} data-dot={`term:${id}`} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
            <ul className={styles.column} aria-label="Definitions">
              {round.definitions.map((id) => {
                const matched = round.matched.includes(id);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      data-item=""
                      data-definition-id={id}
                      className={[styles.item, styles.definition, matched ? styles.matched : '', !matched && over === id ? styles.over : ''].filter(Boolean).join(' ')}
                      aria-disabled={matched || undefined}
                      onClick={(e) => onDefinitionClick(e, id)}
                    >
                      <span className={styles.dot} data-dot={`definition:${id}`} aria-hidden="true" />
                      <span className={styles.text}>{byId.get(id)?.definition}</span>
                      {matched ? <Verdict matched /> : wrong === id ? <Verdict /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          {done ? (
            <div className={styles.summary}>
              <p className={styles.result}>{roundSummary(round)}.</p>
              {isDeckCleared(game) ? <p>Every pair in {title} has now been matched without a miss. The next round starts the set again.</p> : null}
              <div className={styles.actions}>
                <Button ref={nextRef} variant="primary" onClick={next}>
                  Next round
                </Button>
                <Button onClick={onBack}>Back to the list</Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

/** "Matched" or "Not this one": a glyph and words, so the state never rests on colour alone. */
function Verdict({ matched = false }: { matched?: boolean }) {
  return (
    <span className={matched ? styles.verdictMatched : styles.verdictWrong}>
      <span aria-hidden="true">{matched ? '✓ ' : '✗ '}</span>
      {matched ? 'Matched' : 'Not this one'}
    </span>
  );
}
