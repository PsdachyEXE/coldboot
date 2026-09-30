/**
 * Text measurement for SVG figures. Figures are laid out from explicit coordinates, but labels still
 * need a width: to wrap inside shapes and to size the --void backing behind flow labels. A browser
 * can only measure text after layout, and not at all in tests, so widths come from the advance
 * widths of Atkinson Hyperlegible Next, measured once in Chromium (per mille of the font size, for
 * printable ASCII). Anything else is estimated generously.
 */

/** Label size in SVG user units. Canvases never scale below MIN_LABEL_PX / LABEL_SIZE. */
export const LABEL_SIZE = 14;
/** Line advance for wrapped labels. */
export const LINE_HEIGHT = 18;
/** The smallest on-screen label size the scroll container allows (Section 9 legibility floor). */
export const MIN_LABEL_PX = 12;

// Advance widths for characters 32 (space) to 126 (~), in thousandths of an em.
// prettier-ignore
const REGULAR = [
  280, 286, 301, 651, 592, 919, 731, 160, 299, 299, 485, 606, 210, 362, 210, 387, 648, 407, 548, 576, 614, 588, 598, 510,
  615, 595, 210, 210, 553, 628, 553, 480, 778, 626, 613, 645, 669, 569, 552, 694, 694, 392, 512, 631, 541, 824, 693, 714,
  592, 724, 614, 592, 558, 690, 593, 856, 623, 575, 607, 317, 387, 344, 552, 372, 243, 525, 566, 485, 564, 538, 314, 558,
  550, 252, 245, 492, 262, 845, 550, 548, 566, 574, 349, 471, 326, 540, 461, 684, 481, 449, 460, 344, 237, 344, 555,
];
// prettier-ignore
const BOLD = [
  313, 303, 390, 765, 610, 969, 725, 210, 335, 335, 485, 595, 271, 373, 272, 440, 659, 440, 579, 600, 624, 608, 626, 537,
  624, 571, 272, 272, 569, 612, 569, 547, 781, 678, 643, 658, 689, 597, 566, 718, 701, 425, 561, 664, 552, 858, 717, 747,
  629, 757, 650, 610, 607, 686, 644, 886, 685, 650, 618, 340, 440, 344, 582, 400, 288, 552, 596, 510, 596, 563, 365, 593,
  571, 300, 259, 555, 318, 882, 571, 576, 596, 599, 376, 508, 376, 567, 530, 740, 540, 521, 506, 381, 254, 381, 537,
];
/** Width assumed for characters outside printable ASCII (arrows, accents, symbols). */
const FALLBACK = 700;
/** Headroom for kerning, hinting and a fallback font that loads before the web font. */
const SAFETY = 1.04;

/** Estimated rendered width of `text` at `size` user units. */
export function textWidth(text: string, size: number = LABEL_SIZE, bold = false): number {
  const table = bold ? BOLD : REGULAR;
  let total = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    total += code >= 32 && code < 127 ? table[code - 32] : FALLBACK;
  }
  return (total / 1000) * size * SAFETY;
}

export interface WrapOptions {
  size?: number;
  bold?: boolean;
  /** Also break after underscores, for long snake_case flow labels. */
  breakUnderscores?: boolean;
}

/**
 * Greedy word wrap to `maxWidth`. A single word wider than the limit keeps its own line (it
 * overflows rather than being hyphenated). Returns at least one line, which may be empty.
 */
export function wrapText(text: string, maxWidth: number, opts: WrapOptions = {}): string[] {
  const size = opts.size ?? LABEL_SIZE;
  const bold = opts.bold ?? false;
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const pieces: { text: string; joiner: string }[] = [];
  for (const word of words) {
    if (opts.breakUnderscores && textWidth(word, size, bold) > maxWidth && word.includes('_')) {
      const parts = word.split(/(?<=_)/);
      parts.forEach((p, i) => pieces.push({ text: p, joiner: i === 0 ? ' ' : '' }));
    } else {
      pieces.push({ text: word, joiner: ' ' });
    }
  }
  const lines: string[] = [];
  let line = '';
  for (const piece of pieces) {
    const candidate = line ? line + piece.joiner + piece.text : piece.text;
    if (line && textWidth(candidate, size, bold) > maxWidth) {
      lines.push(line);
      line = piece.text;
    } else {
      line = candidate;
    }
  }
  lines.push(line);
  return lines;
}

/** Width of the widest line. */
export function linesWidth(lines: readonly string[], size: number = LABEL_SIZE, bold = false): number {
  return lines.reduce((w, l) => Math.max(w, textWidth(l, size, bold)), 0);
}

/** Baseline offset that centres a line of mixed-case text vertically on a point. */
export function baselineOffset(size: number = LABEL_SIZE): number {
  return size * 0.36;
}
