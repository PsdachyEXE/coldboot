/**
 * Syllabus map (Section 6.8): every KK in four area columns, then the Terms and PSM groups. Each row
 * shows the KK's id, title and summary, a mastery meter (unseen shown distinctly from zero), what
 * there is to practise and when it was last practised. A row starts a focused drill.
 */
import { Link } from 'react-router';
import type { ContentIndex } from '../../content/loader';
import { useContent, useContentIndex } from '../../content/store';
import { AREA_IDS, type KkId } from '../../content/schema';
import { areaById, kksByArea, studyDesign } from '../../content/studyDesign';
import { useNow } from '../../lib/useNow';
import { useMastery } from '../../srs/hooks';
import type { KkMastery, MasteryMap } from '../../srs/mastery';
import { Meter } from '../../ui/Meter';
import { Tag } from '../../ui/Tag';
import { VisuallyHidden } from '../../ui/VisuallyHidden';
import { drillPath } from '../paths';
import { lastPractised, plural } from '../study/format';
import styles from '../study/Map.module.css';

export default function SyllabusMap() {
  const content = useContentIndex();
  const status = useContent((s) => s.status);
  const mastery = useMastery();
  const now = useNow(60_000);
  const allIds = [...studyDesign.kks.map((k) => k.id as KkId), 'TERMS', 'PSM'] as KkId[];
  const seen = allIds.filter((kk) => mastery.has(kk)).length;

  return (
    <div>
      <h1>Syllabus map</h1>
      <div className={styles.intro}>
        <p>Every key knowledge point, with your mastery, what there is to practise and when you last practised it. Select one to drill it.</p>
        <p>
          You've practised {seen} of {plural(allIds.length, 'key knowledge point')}.
          {status === 'loading' || status === 'idle' ? ' Counting the questions for each one.' : null}
          {status === 'error' ? " Question counts aren't available because study content didn't load." : null}
        </p>
      </div>
      <div className={styles.areas}>
        {AREA_IDS.map((area) => {
          const kks = kksByArea[area];
          const practised = kks.filter((k) => mastery.has(k.id as KkId)).length;
          const titleId = `map-${area}`;
          return (
            <section key={area} className={styles.area} aria-labelledby={titleId}>
              <h2 id={titleId} className={styles.areaHead}>
                <Tag>{area}</Tag>
                <span>{areaById.get(area)?.title}</span>
              </h2>
              <p className={styles.areaMeta}>
                {practised} of {kks.length} practised
              </p>
              <ol className={styles.list}>
                {kks.map((k) => (
                  <KkRow key={k.id} kk={k.id as KkId} title={k.title} summary={k.summary} mastery={mastery} content={content} now={now} />
                ))}
              </ol>
            </section>
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

function counts(content: ContentIndex | null, kk: KkId): string | null {
  const items = content?.byKk.get(kk);
  if (!content) return null;
  if (!items) return 'Nothing to practise yet';
  return `${plural(items.cards.length, 'card')}, ${plural(items.mcq.length, 'question')}, ${plural(items.short.length, 'short answer')}`;
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
      <Meter
        label={
          <>
            Mastery <VisuallyHidden>{`of ${group ? title : kk}`}</VisuallyHidden>
          </>
        }
        value={m ? m.value : null}
      />
      <p className={styles.facts}>
        {itemCounts ? <span>{itemCounts}</span> : null}
        <span>Last practised: {lastPractised(m?.last, now, m !== undefined)}</span>
      </p>
    </li>
  );
}
