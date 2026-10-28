// Fonts that replace the UI sans stack run about this much wider than the advances below, so
// every drawn-width measure (bounds, fits, collisions) takes this share more room than the text
// needs. Name budgets (`textWidthEm`) are not padded: they bound the text itself.
export const LABEL_WIDTH_SAFETY = 1.1;

// Advances in em of the UI sans stack at medium weight; no canvas, so tests and workers agree.
const NARROW = new Set("iIjl.,:;'|!");
const SLIM = new Set('tfr()[]- ');
const WIDE = new Set('mwMW@');

function charWidthEm(char) {
  if (NARROW.has(char)) return 0.3;
  if (SLIM.has(char)) return 0.4;
  if (WIDE.has(char)) return 0.9;
  if (char >= 'A' && char <= 'Z') return 0.66;
  if (char >= '0' && char <= '9') return 0.58;
  return 0.56;
}

/** Width of `text` in em. */
export function textWidthEm(text = '') {
  let width = 0;
  for (const char of text) width += charWidthEm(char);
  return width;
}

/** Room `text` needs on screen at `sizePx`, with the safety margin for a wider real font. */
export const textWidthPx = (text, sizePx) => textWidthEm(text) * sizePx * LABEL_WIDTH_SAFETY;
