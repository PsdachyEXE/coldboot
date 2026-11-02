/**
 * Learn (docs/LEARN.md): reading before testing. `/learn` lists every topic with its mastery and
 * when its page was last read; `/learn?kk=U3O1-KK04` is one key knowledge point's page, and
 * `?kk=TERMS` and `?kk=PSM` are the glossary's and the problem-solving methodology's. A point with
 * an authored lesson (content/<area>/lessons.json, src/content/lessons.ts) shows it, with its
 * flashcards kept as notes below; the others show study notes assembled from checked content
 * (src/app/learn/notes.ts). Reading is never scored:
 * reaching a page's Practise section, or using any button in it, only records the page as read.
 */
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { ContentIndex } from '../../content/loader';
import { useLessons } from '../../content/lessons';
import { AREA_IDS, type Card, type KkId, type Lesson, type WorkedExample } from '../../content/schema';
import { areaById, kkById, kkLabel, kksByArea, studyDesign } from '../../content/studyDesign';
import { useNow } from '../../lib/useNow';
import { useMastery } from '../../srs/hooks';
import type { MasteryMap } from '../../srs/mastery';
import { useLearn } from '../../state/learn';
import { useTerminal } from '../../terminal/useTerminal';
import { Button, ButtonLink } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { Markdown } from '../../ui/Markdown';
import { KkTag, Tag } from '../../ui/Tag';
import {
  assembleNotes,
  firstUnstarted,
  gamesFor,
  isLearnKk,
  masteryText,
  neighbours,
  psmNotes,
  psmTraps,
  readText,
  revealCloze,
  termsByArea,
  termTraps,
  topicTitle,
  type KkNotes,
  type NoteGame,
} from '../learn/notes';
import { drillPath, learnPath, reviewPath, writtenPath } from '../paths';
import { ContentGate } from '../study/ContentGate';
import { plural } from '../study/format';
import { ItemFigures } from '../study/ItemFigures';
import styles from '../study/Learn.module.css';
import study from '../study/study.module.css';

export default function Learn() {
  const [params] = useSearchParams();
  const typed = params.get('kk');
  if (typed === null) return <LearnIndex />;
  const kk = typed.toUpperCase();
  if (!isLearnKk(kk)) return <UnknownTopic typed={typed} />;
  return (
    <div className={study.page}>
      <ContentGate heading={topicTitle(kk)}>{(content) => <TopicPage key={kk} kk={kk} content={content} />}</ContentGate>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The topic list
// ---------------------------------------------------------------------------

function LearnIndex() {
  const mastery = useMastery();
  const read = useLearn((s) => s.read);
  const now = useNow(60_000);
  const start = firstUnstarted(mastery, read);
  const { lessons } = useLessons();
  return (
    <div className={study.page}>
      <h1>Learn</h1>
      <p className={styles.lead}>
        Read about a topic before you practise it. Each page explains what the study design asks, with examples, the official terms and the common mistakes, then links to the
        practice for it.
      </p>
      <p className={styles.note}>
        {lessons.size
          ? `${plural(lessons.size, 'topic')} ${lessons.size === 1 ? 'has' : 'have'} a written lesson; the rest are study notes assembled from COLDBOOT's checked cards. Reading isn't scored.`
          : "The pages are study notes assembled from COLDBOOT's checked cards and the study design map. Reading isn't scored."}
      </p>
      {start ? (
        <div className={styles.start}>
          <p>
            Not sure where to begin? Start with <Link to={learnPath({ kk: start })}>{kkLabel(start)}</Link>, the first topic you haven't practised or read.
          </p>
        </div>
      ) : null}
      {AREA_IDS.map((area) => (
        <section key={area} className={styles.area} aria-labelledby={`learn-${area}`}>
          <h2 id={`learn-${area}`} className={styles.areaHead}>
            <Tag>{area}</Tag> {areaById.get(area)?.title}
          </h2>
          <ol className={styles.topics}>
            {kksByArea[area].map((k) => (
              <TopicRow key={k.id} kk={k.id as KkId} title={k.title} mastery={mastery} readAt={read[k.id as KkId]} now={now} lesson={lessons.has(k.id as KkId)} />
            ))}
          </ol>
        </section>
      ))}
      <section className={styles.area} aria-labelledby="learn-groups">
        <h2 id="learn-groups">Across the course</h2>
        <ul className={styles.topics}>
          {studyDesign.groups.map((g) => (
            <TopicRow key={g.id} kk={g.id} title={g.title} mastery={mastery} readAt={read[g.id]} now={now} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function TopicRow({
  kk,
  title,
  mastery,
  readAt,
  now,
  lesson = false,
}: {
  kk: KkId;
  title: string;
  mastery: MasteryMap;
  readAt: number | undefined;
  now: number;
  /** The point has a written lesson rather than study notes. */
  lesson?: boolean;
}) {
  const group = kk === 'TERMS' || kk === 'PSM';
  return (
    <li className={styles.topic}>
      <Link to={learnPath({ kk })} className={styles.topicLink}>
        {group ? null : <span className={styles.topicId}>{kk}</span>}
        <span>{title}</span>
      </Link>
      <span className={styles.topicMeta}>
        {lesson ? <span className={styles.lessonTag}>Lesson</span> : null}
        {masteryText(mastery, kk)}. {readText(readAt, now)}.
      </span>
    </li>
  );
}

function UnknownTopic({ typed }: { typed: string }) {
  return (
    <div className={study.page}>
      <h1>Learn</h1>
      <EmptyState
        title="That topic isn't in the study design"
        action={
          <ButtonLink variant="primary" to={learnPath()}>
            See every topic
          </ButtonLink>
        }
      >
        <p>COLDBOOT has no page for "{typed.slice(0, 40)}". Topics are key knowledge points such as U3O1-KK04, the Terms and the PSM.</p>
      </EmptyState>
    </div>
  );
}

// ---------------------------------------------------------------------------
// A topic's page
// ---------------------------------------------------------------------------

/**
 * The page's section heading level: 2 on the Learn route (under the topic's h1), 4 inside Today's
 * run (under the run's h1, the step's h2 and the topic's h3).
 */
const Level = createContext<2 | 4>(2);

/** A heading at the page's section level, or `sub` levels below it (true is one). */
function H({ sub = false, id, className, children }: { sub?: boolean | 1 | 2; id?: string; className?: string; children: ReactNode }) {
  const level = Math.min(6, useContext(Level) + (sub === true ? 1 : sub || 0));
  const Tag = `h${level}` as 'h2';
  return (
    <Tag id={id} className={className}>
      {children}
    </Tag>
  );
}

interface TopicPageProps {
  kk: KkId;
  content: ContentIndex;
  /**
   * Inside Today's run: no crumb or pager, and the run supplies its own actions in place of
   * Practise. Reaching the end still counts as reading it; the run also records a read when the
   * student starts the drill from here, but not when they skip it.
   */
  embedded?: { actions: ReactNode };
}

export function TopicPage({ kk, content, embedded }: TopicPageProps) {
  const mastery = useMastery();
  const readAt = useLearn((s) => s.read[kk]);
  const now = useNow(60_000);
  const markRead = useCallback(() => useLearn.getState().markRead(kk), [kk]);
  // Wait for the lessons rather than show the notes and swap them out.
  const { settled, lessons } = useLessons();
  const lesson = lessons.get(kk);

  // Reaching the Practise section counts as reading the page. Browsers without
  // IntersectionObserver record a read when a Practise action is used instead.
  const endRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = endRef.current;
    if (!settled || !el || typeof IntersectionObserver !== 'function') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          markRead();
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [markRead, settled]);

  const group = kk === 'TERMS' || kk === 'PSM';
  const area = group ? null : kkById.get(kk)?.area;
  const items = content.byKk.get(kk);
  const practice = {
    cards: items?.cards.length ?? 0,
    mcq: items?.mcq.length ?? 0,
    short: items?.short.length ?? 0,
  };
  const { prev, next } = neighbours(kk);

  const Title = embedded ? 'h3' : 'h1';
  return (
    <Level.Provider value={embedded ? 4 : 2}>
      <article aria-labelledby="learn-title">
        {embedded ? null : (
          <p className={styles.crumb}>
            <Link to={learnPath()}>Learn</Link>
            {area ? ` / ${area} ${areaById.get(area)?.title ?? ''}` : null}
          </p>
        )}
        {group ? null : <KkTag kk={kk} />}
        <Title id="learn-title">{topicTitle(kk)}</Title>
        <p className={styles.state}>
          {masteryText(mastery, kk)}. {readText(readAt, now)}.
        </p>
        {kk === 'TERMS' ? (
          <TermsBody content={content} />
        ) : kk === 'PSM' ? (
          <PsmBody content={content} />
        ) : !settled ? (
          <p className={styles.note} role="status">
            Loading the lesson.
          </p>
        ) : lesson ? (
          <LessonBody kk={kk} lesson={lesson} content={content} />
        ) : (
          <KkBody kk={kk} content={content} />
        )}
        {settled || group ? (
          <section ref={endRef} className={styles.practise} aria-labelledby="learn-practise">
            {embedded ? (
              <>
                <H id="learn-practise">Ready?</H>
                <div className={study.actions}>{embedded.actions}</div>
              </>
            ) : (
              <>
                <H id="learn-practise">Practise</H>
                <PractiseActions kk={kk} practice={practice} games={gamesFor(kk)} onAct={markRead} />
              </>
            )}
          </section>
        ) : null}
        {embedded ? null : (
          <nav className={styles.pager} aria-label="Other topics">
            {prev ? <Link to={learnPath({ kk: prev })}>Previous: {kkLabel(prev)}</Link> : null}
            {next ? (
              <Link className={styles.pagerNext} to={learnPath({ kk: next })}>
                Next: {kkLabel(next)}
              </Link>
            ) : null}
          </nav>
        )}
      </article>
    </Level.Provider>
  );
}

function PractiseActions({ kk, practice, games, onAct }: { kk: KkId; practice: { cards: number; mcq: number; short: number }; games: NoteGame[]; onAct(): void }) {
  const drillFirst = practice.mcq > 0;
  return (
    <div className={study.actions}>
      {drillFirst ? (
        <ButtonLink variant="primary" to={drillPath({ kk })} onClick={onAct}>
          Drill this topic
        </ButtonLink>
      ) : null}
      {practice.cards > 0 ? (
        <ButtonLink variant={drillFirst ? 'secondary' : 'primary'} to={reviewPath({ kk })} onClick={onAct}>
          Review its flashcards
        </ButtonLink>
      ) : null}
      {practice.short > 0 ? (
        <ButtonLink to={writtenPath({ kk })} onClick={onAct}>
          Written questions
        </ButtonLink>
      ) : null}
      {games.map((g) => (
        <Button
          key={g.id}
          onClick={() => {
            onAct();
            useTerminal.getState().run(`play ${g.id}`);
          }}
          aria-label={`Play ${g.id} in the terminal: ${g.title}`}
        >
          Play {g.id}
        </Button>
      ))}
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className={styles.section} aria-labelledby={id}>
      <H id={id}>{title}</H>
      {children}
    </section>
  );
}

function Definitions({ cards }: { cards: readonly Card[] }) {
  return (
    <dl className={styles.defs}>
      {cards.map((c) => (
        <div key={c.id}>
          <dt>
            {c.front}
            {c.aliases?.length ? <span className={styles.aliases}> (also {c.aliases.join(', ')})</span> : null}
          </dt>
          <dd>
            <Markdown text={c.back} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Traps({ traps }: { traps: readonly string[] }) {
  if (!traps.length) return null;
  return (
    <Section id="learn-traps" title="Common mistakes">
      <ul className={styles.traps}>
        {traps.map((t) => (
          <li key={t}>
            <Markdown text={t} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** The study design's summary and examples for a point. */
function StudyDesignSection({ notes }: { notes: KkNotes }) {
  return (
    <Section id="learn-sd" title="In the study design">
      <p>{notes.summary}</p>
      {notes.examples.length ? (
        <>
          <p className={styles.examples}>For example:</p>
          <ul>
            {notes.examples.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </>
      ) : null}
    </Section>
  );
}

/** One part of the flashcard notes: its own section, or one heading level down inside a lesson's disclosure. */
function NotesPart({ nested, id, title, children }: { nested: boolean; id: string; title: string; children: ReactNode }) {
  return nested ? (
    <div className={styles.section} role="group" aria-labelledby={id}>
      <H sub id={id}>
        {title}
      </H>
      {children}
    </div>
  ) : (
    <Section id={id} title={title}>
      {children}
    </Section>
  );
}

/** A point's flashcards as reading: definitions, comparisons, then key points. `nested` puts them one heading level down. */
function FlashcardNotes({ notes, nested = false }: { notes: KkNotes; nested?: boolean }) {
  return (
    <>
      {notes.definitions.length ? (
        <NotesPart nested={nested} id="learn-defs" title="Definitions">
          <Definitions cards={notes.definitions} />
        </NotesPart>
      ) : null}
      {notes.comparisons.length ? (
        <NotesPart nested={nested} id="learn-compare" title="Comparisons">
          <ul className={styles.items}>
            {notes.comparisons.map((c) => (
              <li key={c.id}>
                <H sub={nested ? 2 : 1} className={styles.prompt}>
                  <Markdown inline text={c.front} />
                </H>
                <Markdown text={c.back} />
              </li>
            ))}
          </ul>
        </NotesPart>
      ) : null}
      {notes.points.length ? (
        <NotesPart nested={nested} id="learn-points" title="Key points">
          <ul className={styles.items}>
            {notes.points.map((c) => (
              <li key={c.id}>
                <p className={styles.prompt}>
                  <Markdown inline text={c.type === 'cloze' ? revealCloze(c.front) : c.front} />
                </p>
                <Markdown text={c.back} />
              </li>
            ))}
          </ul>
        </NotesPart>
      ) : null}
    </>
  );
}

function TermsSection({ notes }: { notes: KkNotes }) {
  if (!notes.terms.length) return null;
  return (
    <Section id="learn-terms" title="Terms used in this study">
      <p className={styles.note}>The exam uses these definitions, and every term is examinable.</p>
      <Definitions cards={notes.terms} />
    </Section>
  );
}

function KkBody({ kk, content }: { kk: KkId; content: ContentIndex }) {
  const notes = assembleNotes(kk, content);
  if (!notes) return null;
  return (
    <>
      <StudyDesignSection notes={notes} />
      <FlashcardNotes notes={notes} />
      <TermsSection notes={notes} />
      <Traps traps={notes.traps} />
      <p className={styles.closing}>Study notes, assembled from this topic's flashcards and the study design map.</p>
    </>
  );
}

/** "Explain (3 marks)": a worked example's prompt, its model answer and how it is marked, shown open. */
function Worked({ worked }: { worked: WorkedExample }) {
  const term = worked.commandTerm.charAt(0).toUpperCase() + worked.commandTerm.slice(1);
  return (
    <Section id="learn-worked" title="Worked example">
      <div className={styles.worked}>
        <p className={styles.workedMeta}>
          {term}, {plural(worked.marks, 'mark')}
        </p>
        <Markdown text={worked.prompt} />
      </div>
      <H sub id="learn-model">
        Model answer
      </H>
      <div className={styles.model}>
        <Markdown text={worked.model} />
      </div>
      <H sub id="learn-marking">
        How it is marked
      </H>
      <ul className={styles.marking}>
        {worked.points.map((p, i) => (
          <li key={i}>
            <Markdown inline text={p.text} /> <span className={styles.pointMarks}>({plural(p.marks, 'mark')})</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/**
 * A point's authored lesson: the study design's words, the lesson's ideas, its worked example, the
 * official terms, what the 2025 examiners saw, the cards' common mistakes, and the flashcards
 * folded away as notes, so nothing the notes page showed is lost.
 */
function LessonBody({ kk, lesson, content }: { kk: KkId; lesson: Lesson; content: ContentIndex }) {
  const notes = assembleNotes(kk, content);
  if (!notes) return null;
  const cards = notes.definitions.length + notes.comparisons.length + notes.points.length;
  return (
    <>
      <StudyDesignSection notes={notes} />
      <Section id="learn-ideas" title="The ideas">
        <div className={styles.intro}>
          <Markdown text={lesson.intro} />
        </div>
        {lesson.sections.map((s, i) => (
          <section key={i} className={styles.lessonSection} aria-labelledby={`learn-idea-${i}`}>
            <H sub id={`learn-idea-${i}`}>
              {s.heading}
            </H>
            <Markdown text={s.body} />
            <ItemFigures figures={s.figures} />
          </section>
        ))}
      </Section>
      {lesson.worked ? <Worked worked={lesson.worked} /> : null}
      <TermsSection notes={notes} />
      {lesson.traps?.length ? (
        <Section id="learn-examiners" title="What the examiners saw">
          <p className={styles.note}>From the 2025 examiners' report, in our words.</p>
          <ul className={styles.traps}>
            {lesson.traps.map((t) => (
              <li key={t}>
                <Markdown text={t} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      <Traps traps={notes.traps} />
      {cards ? (
        <Section id="learn-cards" title="From the flashcards">
          <details className={styles.more}>
            <summary>Show {plural(cards, 'flashcard')} on this topic as notes</summary>
            <FlashcardNotes notes={notes} nested />
          </details>
        </Section>
      ) : null}
      <p className={styles.closing}>A COLDBOOT lesson, written from the study design and the 2025 examiners' report and checked against them.</p>
    </>
  );
}

function TermsBody({ content }: { content: ContentIndex }) {
  const groups = termsByArea(content);
  return (
    <>
      <p>{studyDesign.groups.find((g) => g.id === 'TERMS')?.summary}</p>
      {groups.map((g) => (
        <Section key={g.area ?? 'other'} id={`learn-terms-${g.area ?? 'other'}`} title={g.heading}>
          <Definitions cards={g.terms} />
        </Section>
      ))}
      <Traps traps={termTraps(content)} />
    </>
  );
}

function PsmBody({ content }: { content: ContentIndex }) {
  const stages = psmNotes(content.psm);
  return (
    <>
      <p>{studyDesign.groups.find((g) => g.id === 'PSM')?.summary}</p>
      {stages.map((s) => (
        <section key={s.id} className={styles.stage} aria-labelledby={`learn-psm-${s.id}`}>
          <H id={`learn-psm-${s.id}`}>{s.name}</H>
          <Markdown text={s.summary} />
          <H sub>Activities</H>
          <dl className={styles.defs}>
            {s.activities.map((a) => (
              <div key={a.id}>
                <dt>{a.name}</dt>
                <dd>
                  <Markdown text={a.summary} />
                </dd>
              </div>
            ))}
          </dl>
          {s.specifications.length ? (
            <>
              <H sub>In the specifications</H>
              <ul>
                {s.specifications.map((n) => (
                  <li key={n}>
                    <Markdown inline text={n} />
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ))}
      <Traps traps={psmTraps(content.psm)} />
    </>
  );
}
