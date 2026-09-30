/**
 * Syllabus map (Section 6.8): every KK in four area columns, then the Terms and PSM groups. Each row
 * shows the KK's id, title and summary, a mastery meter (unseen shown distinctly from zero), what
 * there is to practise and when it was last practised. A row starts a focused drill.
 *
 * Below 720 px each area folds behind a disclosure button, with the area holding the weakest key
 * knowledge open, so the page is a few screens long instead of seventeen.
 */
import { useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { ContentIndex } from '../../content/loader';
import { useContent, useContentIndex } from '../../content/store';
import { AREA_IDS, type AreaId, type KkId } from '../../content/schema';
import { areaById, kksByArea, studyDesign } from '../../content/studyDesign';
import { useNow } from '../../lib/useNow';
import { useMastery } from '../../srs/hooks';
import type { KkMastery, MasteryMap } from '../../srs/mastery';
import { Meter } from '../../ui/Meter';
import { Tag } from '../../ui/Tag';
import { useNarrow } from '../../ui/useMediaQuery';
import { VisuallyHidden } from '../../ui/VisuallyHidden';
import { drillPath } from '../paths';
import { ContentErrorNotice } from '../study/ContentGate';
import { lastPractised, plural } from '../study/format';
import { rankWeakest } from '../study/select';
import styles from '../study/Map.module.css';

export default function SyllabusMap() {
  const content = useContentIndex();
  const status = useContent((s) => s.status);
  const mastery = useMastery();
  const now = useNow(60_000);
  const allIds = [...studyDesign.kks.map((k) => k.id as KkId), 'TERMS', 'PSM'] as KkId[];
  const seen = allIds.filter((kk) => mastery.has(kk)).length;
  const narrow = useNarrow();
  // Phones open the area holding the weakest key knowledge (the first area before any practice).
  const [open, setOpen] = useState<ReadonlySet<AreaId>>(() => {
    const weakest = rankWeakest(
      studyDesign.kks.map((k) => k.id as KkId),
      mastery,
    )[0];
    return new Set(weakest ? [weakest.slice(0, 4) as AreaId] : []);
  });
  const toggle = (area: AreaId) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });

  return (
    <div>
      <h1>Syllabus map</h1>
      <div className={styles.intro}>
        <p>Every key knowledge point, with your mastery, what there is to practise and when you last practised it. Select one to drill it.</p>
        <p>
          You've practised {seen} of {plural(allIds.length, 'key knowledge point')}.
          {status === 'loading' || status === 'idle' ? ' Counting the questions for each one.' : null}
        </p>
      </div>
      <ContentErrorNotice />
      <div className={styles.areas}>
        {AREA_IDS.map((area) => {
          const kks = kksByArea[area];
          const practised = kks.filter((k) => mastery.has(k.id as KkId)).length;
          const expanded = !narrow || open.has(area);
          return (
            <Area key={area} area={area} narrow={narrow} expanded={expanded} onToggle={() => toggle(area)} meta={`${practised} of ${kks.length} practised`}>
              {/* A folded area renders no rows at all, which keeps the phone page light. */}
              {expanded ? (
                <ol className={styles.list}>
                  {kks.map((k) => (
                    <KkRow key={k.id} kk={k.id as KkId} title={k.title} summary={k.summary} mastery={mastery} content={content} now={now} />
                  ))}
                </ol>
              ) : null}
            </Area>
          );
        })}
      </div>
      <section aria-labelledby="map-groups">
        <h2 id="map-groups">Across the course</h2>
        <div className={styles.groups}>
          {studyDesign.groups.map((g) => (
            <ul key={g.id} className={styles.list}>
              <KkRow kk={g.id} title={g.title} summary={g.summary} mastery={mastery} content={content} now={now} />
            </ul>
          ))}
        </div>
      </section>
    </div>
  );
}

/** One area column; on phones its heading is a disclosure button. */
function Area({
  area,
  narrow,
  expanded,
  onToggle,
  meta,
  children,
}: {
  area: AreaId;
  narrow: boolean;
  expanded: boolean;
  onToggle(): void;
  meta: string;
  children: ReactNode;
}) {
  const titleId = `map-${area}`;
  const listId = useId();
  const heading = (
    <>
      <Tag>{area}</Tag> {areaById.get(area)?.title}
    </>
  );
  return (
    <section className={styles.area} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.areaHead}>
        {narrow ? (
          <button type="button" className={styles.areaToggle} aria-expanded={expanded} aria-controls={expanded ? listId : undefined} onClick={onToggle}>
            <span>{heading}</span>
          </button>
        ) : (
          heading
        )}
      </h2>
      <p className={styles.areaMeta}>{meta}</p>
      <div id={listId}>{children}</div>
    </section>
  );
}

/** "11 cards, 5 MCQs, 2 short answers", or null before the content has loaded. */
function counts(content: ContentIndex | null, kk: KkId): string | null {
  const items = content?.byKk.get(kk);
  if (!content) return null;
  if (!items) return 'Nothing to practise yet';
  return `${plural(items.cards.length, 'card')}, ${plural(items.mcq.length, 'MCQ')}, ${plural(items.short.length, 'short answer')}`;
}

/** "Practised 3 days ago", "Practised today" or "Never practised". */
function practisedText(last: number | null | undefined, now: number, seen: boolean): string {
  const when = lastPractised(last, now, seen);
  return when === 'Never' ? 'Never practised' : `Practised ${when.charAt(0).toLowerCase()}${when.slice(1)}`;
}

function KkRow({
  kk,
  title,
  summary,
  mastery,
  content,
  now,
}: {
  kk: KkId;
  title: string;
  summary: string;
  mastery: MasteryMap;
  content: ContentIndex | null;
  now: number;
}) {
  const m: KkMastery | undefined = mastery.get(kk);
  const group = kk === 'TERMS' || kk === 'PSM';
  const itemCounts = counts(content, kk);
  return (
    <li className={styles.row} data-kk={kk}>
      <Link to={drillPath({ kk })} className={styles.rowLink}>
        <VisuallyHidden>Drill</VisuallyHidden>{' '}
        {group ? null : <span className={styles.rowId}>{kk}</span>}{' '}
        <span className={styles.rowTitle}>{title}</span>
      </Link>
      <p className={styles.summary}>{summary}</p>
      {/* The meter prints its value, so "Mastery" is for screen readers only. */}
      <Meter label={`Mastery of ${group ? title : kk}`} hideLabel value={m ? m.value : null} />
      <p className={styles.facts}>
        {itemCounts ? `${itemCounts}. ` : null}
        {practisedText(m?.last, now, m !== undefined)}.
      </p>
    </li>
  );
}
