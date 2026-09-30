/**
 * Mock-up wireframes: windows, headings, labels, text boxes, buttons, checkboxes, radio buttons,
 * drop-down lists, list boxes, image placeholders and dividers, each drawn from its box (x, y is
 * the centre). Notes become numbered callouts on the drawing, listed in order below it.
 */
import { useMemo } from 'react';
import type { Mockup } from '../content/schema';
import { mockupNoteNumbers } from './describe';
import { r1, type Shape } from './geometry';
import { Canvas, HighlightRing, ShapeOutline, TextLines } from './svg';
import { textWidth } from './text';
import type { BodyProps } from './types';
import styles from './Figure.module.css';

type Element = Mockup['elements'][number];

const TITLE_BAR = 28;
const LIST_ROW = 24;

function Wireframe({ el }: { el: Element }) {
  const left = el.x - el.w / 2;
  const right = el.x + el.w / 2;
  const top = el.y - el.h / 2;
  const bottom = el.y + el.h / 2;
  const box: Shape = { kind: 'rect', cx: el.x, cy: el.y, w: el.w, h: el.h };
  const text = el.text?.trim() ?? '';
  switch (el.type) {
    case 'window': {
      const cy = top + TITLE_BAR / 2;
      return (
        <>
          <ShapeOutline shape={box} />
          <path className={styles.line} d={`M${r1(left)} ${r1(top + TITLE_BAR)} H${r1(right)}`} />
          {text && <TextLines lines={[text]} x={left + 10} y={cy} anchor="start" className={styles.bold} />}
          <path
            className={styles.hair}
            d={`M${r1(right - 62)} ${r1(cy + 4)} h10 M${r1(right - 42)} ${r1(cy - 5)} h10 v10 h-10 z M${r1(right - 22)} ${r1(cy - 5)} l10 10 M${r1(right - 12)} ${r1(cy - 5)} l-10 10`}
          />
        </>
      );
    }
    case 'heading':
      return text ? <TextLines lines={[text]} x={left} y={el.y} anchor="start" size={20} className={`${styles.big} ${styles.bold}`} /> : null;
    case 'label':
      return text ? <TextLines lines={[text]} x={left} y={el.y} anchor="start" /> : null;
    case 'textbox':
      return (
        <>
          <ShapeOutline shape={box} />
          {text && <TextLines lines={[text]} x={left + 8} y={el.y} anchor="start" className={styles.muted} />}
        </>
      );
    case 'button':
      return (
        <>
          <rect className={styles.shape} x={r1(left)} y={r1(top)} width={r1(el.w)} height={r1(el.h)} rx={2} />
          {text && <TextLines lines={[text]} x={el.x} y={el.y} className={styles.bold} />}
        </>
      );
    case 'checkbox':
      return (
        <>
          <rect className={styles.shape} x={r1(left)} y={r1(el.y - 8)} width={16} height={16} rx={2} />
          {text && <TextLines lines={[text]} x={left + 24} y={el.y} anchor="start" />}
        </>
      );
    case 'radio':
      return (
        <>
          <circle className={styles.shape} cx={r1(left + 8)} cy={r1(el.y)} r={8} />
          {text && <TextLines lines={[text]} x={left + 24} y={el.y} anchor="start" />}
        </>
      );
    case 'dropdown':
      return (
        <>
          <ShapeOutline shape={box} />
          <path className={styles.hair} d={`M${r1(right - 28)} ${r1(top)} V${r1(bottom)}`} />
          <polygon className={styles.head} points={`${r1(right - 19)},${r1(el.y - 3)} ${r1(right - 9)},${r1(el.y - 3)} ${r1(right - 14)},${r1(el.y + 3)}`} />
          {text && <TextLines lines={[text]} x={left + 8} y={el.y} anchor="start" />}
        </>
      );
    case 'list': {
      const items = text ? text.split('\n').map((s) => s.trim()) : [];
      const fits = Math.max(0, Math.floor(el.h / LIST_ROW));
      return (
        <>
          <ShapeOutline shape={box} />
          {items.slice(0, fits).map((item, i) => (
            <g key={i}>
              {i > 0 && <path className={styles.hair} d={`M${r1(left)} ${r1(top + i * LIST_ROW)} H${r1(right)}`} />}
              <TextLines lines={[item]} x={left + 8} y={top + (i + 0.5) * LIST_ROW} anchor="start" />
            </g>
          ))}
        </>
      );
    }
    case 'image':
      return (
        <>
          <rect className={styles.fillVoid} x={r1(left)} y={r1(top)} width={r1(el.w)} height={r1(el.h)} />
          <path
            className={styles.hair}
            d={`M${r1(left)} ${r1(top)} H${r1(right)} V${r1(bottom)} H${r1(left)} Z M${r1(left)} ${r1(top)} L${r1(right)} ${r1(bottom)} M${r1(right)} ${r1(top)} L${r1(left)} ${r1(bottom)}`}
          />
          {text && (
            <>
              <rect className={styles.backing} x={r1(el.x - textWidth(text) / 2 - 6)} y={r1(el.y - 11)} width={r1(textWidth(text) + 12)} height={22} />
              <TextLines lines={[text]} x={el.x} y={el.y} />
            </>
          )}
        </>
      );
    case 'divider':
      return <path className={styles.hair} d={`M${r1(left)} ${r1(el.y)} H${r1(right)}`} />;
  }
}

function Callout({ el, n, canvas }: { el: Element; n: number; canvas: { width: number; height: number } }) {
  const r = 11;
  const x = Math.min(Math.max(r + 1, el.x + el.w / 2), canvas.width - r - 1);
  const y = Math.min(Math.max(r + 1, el.y - el.h / 2), canvas.height - r - 1);
  return (
    <g data-note={n}>
      <circle className={styles.callout} cx={r1(x)} cy={r1(y)} r={r} />
      <TextLines lines={[String(n)]} x={x} y={y} className={styles.calloutText} />
    </g>
  );
}

export function MockupFigureView({ figure: f, markers, title, desc }: BodyProps<Mockup>) {
  const numbers = useMemo(() => mockupNoteNumbers(f), [f]);
  return (
    <>
      <Canvas width={f.width} height={f.height} title={title} desc={desc}>
        {f.elements.map((el, i) => (
          <g key={i} data-element={el.type}>
            <Wireframe el={el} />
          </g>
        ))}
        {f.elements.map((el, i) => {
          const n = numbers.get(i);
          return n ? <Callout key={i} el={el} n={n} canvas={f} /> : null;
        })}
        {f.elements.map((el, i) => {
          const marker = markers.get(`e${i + 1}`);
          return marker ? <HighlightRing key={i} shape={{ kind: 'rect', cx: el.x, cy: el.y, w: el.w, h: el.h }} marker={marker} canvas={f} /> : null;
        })}
      </Canvas>
      {numbers.size > 0 && (
        <ol className={styles.notes} aria-label="Notes">
          {f.elements.map((el, i) => (numbers.has(i) ? <li key={i}>{el.note!.trim()}</li> : null))}
        </ol>
      )}
    </>
  );
}
