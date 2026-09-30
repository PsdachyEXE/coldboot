/**
 * The coverage grid on Home: every KK as a cell, one row per area of study, plus Terms and PSM.
 * A seen cell is a solid box with a four-segment gauge lit by mastery band (weak 1, shaky 2,
 * solid 3, strong 4); an unseen cell is a dashed outline with no gauge, so unseen never looks like
 * weak, with or without colour. Each cell is a button named with its KK, title and mastery, and
 * starts a focused drill (Home sends the glossary's cell to Review, through practisePath).
 */
import type { KkId } from '../../content/schema';
import { AREA_IDS } from '../../content/schema';
import { areaById, kkLabel, kksByArea } from '../../content/studyDesign';
import { masteryBand, type MasteryBand, type MasteryMap } from '../../srs/mastery';
import { Tag } from '../../ui/Tag';
import styles from './Coverage.module.css';

const LEVEL: Record<MasteryBand, number> = { unseen: 0, weak: 1, shaky: 2, solid: 3, strong: 4 };

const BAND_LEGEND: { band: MasteryBand; label: string }[] = [
  { band: 'unseen', label: 'Unseen' },
  { band: 'weak', label: 'Weak, below 40%' },
  { band: 'shaky', label: 'Shaky, 40 to 64%' },
  { band: 'solid', label: 'Solid, 65 to 84%' },
  { band: 'strong', label: 'Strong, 85% and over' },
];

/**
 * "U3O1-KK04 Data types, 62% mastery" or "... , unseen". The name always contains the visible
 * label, so speech users can say what they see: "PSM, Problem-solving methodology, unseen".
 */
function cellName(kk: KkId, label: string, value: number | null): string {
  const title = kkLabel(kk);
  const name = title.includes(label) ? title : `${label}, ${title}`;
  return `${name}, ${value === null ? 'unseen' : `${Math.round(value)}% mastery`}`;
}

function Gauge({ band }: { band: MasteryBand }) {
  if (band === 'unseen') return null;
  const level = LEVEL[band];
  return (
    <span className={styles.gauge} aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={styles.seg} data-on={i < level ? 'true' : 'false'} />
      ))}
    </span>
  );
}

function Cell({ kk, label, value, onSelect }: { kk: KkId; label: string; value: number | null; onSelect(kk: KkId): void }) {
  const band = masteryBand(value);
  return (
    <li>
      <button
        type="button"
        className={[styles.cell, kk === 'TERMS' || kk === 'PSM' ? styles.wide : ''].filter(Boolean).join(' ')}
        data-band={band}
        aria-label={cellName(kk, label, value)}
        onClick={() => onSelect(kk)}
      >
        <span className={styles.cellId} aria-hidden="true">
          {label}
        </span>
        <Gauge band={band} />
      </button>
    </li>
  );
}

export function CoverageLegend() {
  return (
    <ul className={styles.legend} aria-label="Key">
      {BAND_LEGEND.map(({ band, label }) => (
        <li key={band}>
          <span className={styles.swatch} data-band={band} aria-hidden="true">
            <Gauge band={band} />
          </span>
          {label}
        </li>
      ))}
    </ul>
  );
}

export function CoverageGrid({ mastery, onSelect }: { mastery: MasteryMap; onSelect(kk: KkId): void }) {
  const value = (kk: KkId) => mastery.get(kk)?.value ?? null;
  return (
    <div className={styles.grid}>
      {AREA_IDS.map((area) => {
        const labelId = `coverage-${area}`;
        return (
          <div key={area} className={styles.row} role="group" aria-labelledby={labelId}>
            <p id={labelId} className={styles.rowLabel}>
              <Tag>{area}</Tag> <span className={styles.rowTitle}>{areaById.get(area)?.title}</span>
            </p>
            <ul className={styles.cells}>
              {kksByArea[area].map((k) => (
                <Cell key={k.id} kk={k.id as KkId} label={k.id.slice(-2)} value={value(k.id as KkId)} onSelect={onSelect} />
              ))}
            </ul>
          </div>
        );
      })}
      <div className={styles.row} role="group" aria-labelledby="coverage-groups">
        <p id="coverage-groups" className={styles.rowLabel}>
          <span className={styles.rowTitle}>Across the course</span>
        </p>
        <ul className={styles.cells}>
          <Cell kk="TERMS" label="Terms" value={value('TERMS')} onSelect={onSelect} />
          <Cell kk="PSM" label="PSM" value={value('PSM')} onSelect={onSelect} />
        </ul>
      </div>
    </div>
  );
}
