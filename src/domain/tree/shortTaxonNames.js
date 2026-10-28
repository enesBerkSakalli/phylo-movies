import { textWidthEm } from './textWidth.js';

// Characters a shortened name keeps after its ellipsis.
export const SHORT_TAXON_NAME_LENGTH = 32;
const ELLIPSIS = '…';

// Alternating parts and separators: ['Bacteria', '_', 'Proteobacteria', ...].
const splitName = (name) => name.split(/([_\s|]+)/);
const partCount = (pieces) => Math.ceil(pieces.length / 2);
// The last `keep` parts with the separators between them.
const tailOf = (pieces, keep) => pieces.slice(Math.max(0, pieces.length - (2 * keep - 1))).join('');

function shorten(name, pieces, keep, maxChars) {
  // A name that fits, or one that needs all of its parts to stay distinct, is kept whole.
  if (name.length <= maxChars || (keep > 1 && keep >= partCount(pieces))) return name;
  const tail = tailOf(pieces, keep);
  // One part longer than the limit keeps its own end.
  return ELLIPSIS + (keep === 1 && tail.length > maxChars ? tail.slice(-maxChars) : tail);
}

/**
 * Display names for long taxon names, keyed by the full name. A name longer than `maxChars`
 * keeps its trailing parts, where genus, species and strain usually sit (taxonomy paths such as
 * Bacteria_Proteobacteria_..._Thiohalospira_halophila_HL3 run from domain to strain). Different
 * names that would shorten alike each keep one more part until they differ.
 */
export function shortTaxonNames(names = [], maxChars = SHORT_TAXON_NAME_LENGTH) {
  const unique = [...new Set(names.filter((name) => typeof name === 'string'))];
  const pieces = unique.map(splitName);
  const keep = pieces.map((parts) => {
    let count = 1;
    while (count < partCount(parts) && tailOf(parts, count + 1).length <= maxChars) count += 1;
    return count;
  });
  const shortened = () => unique.map((name, i) => shorten(name, pieces[i], keep[i], maxChars));

  for (let grew = true; grew;) {
    grew = false;
    const byText = new Map();
    shortened().forEach((text, i) => byText.set(text, [...(byText.get(text) ?? []), i]));
    for (const group of byText.values()) {
      if (group.length < 2) continue;
      for (const i of group) {
        if (keep[i] < partCount(pieces[i])) {
          keep[i] += 1;
          grew = true;
        }
      }
    }
  }
  const texts = shortened();
  return new Map(unique.map((name, i) => [name, texts[i]]));
}

const lastOf = (items) => items[items.length - 1];

// The widest cut of `name` within `maxEm`: its first part, an ellipsis and as many trailing
// parts as fit (Bacteria_…_Thiohalospira_halophila_HL3). A single part, or one too wide even with
// one trailing part, keeps its own end instead.
function cutToWidth(name, maxEm) {
  if (textWidthEm(name) <= maxEm) return name;
  const pieces = splitName(name);
  const parts = partCount(pieces);
  const forms = [];
  for (let keep = 1; keep <= parts - 2; keep += 1) {
    const first = 2 * (parts - keep);
    forms.push(pieces[0] + pieces[1] + ELLIPSIS + pieces[first - 1] + pieces.slice(first).join(''));
  }
  const fitting = forms.filter((text) => textWidthEm(text) <= maxEm);
  return fitting.length > 0 ? lastOf(fitting) : windowAt(name, name.length, maxEm, true);
}

// An ellipsis and the longest run of `name` within `maxEm`: ending at `at` when `backwards`
// (the end of the name for `at` = its length), starting at `at` otherwise. At least one character.
function windowAt(name, at, maxEm, backwards) {
  const chars = [...name];
  const run = (count) =>
    ELLIPSIS +
    (backwards ? chars.slice(Math.max(0, at - count), at) : chars.slice(at, at + count)).join('');
  const limit = backwards ? at : chars.length - at;
  let count = 1;
  while (count < limit && textWidthEm(run(count + 1)) <= maxEm) count += 1;
  return run(count);
}

// Names whose cuts came out alike each show an ellipsis and the stretch from the first part
// where the group differs, kept within the same width, so they stay apart without growing.
function tellApart(names, maxEm) {
  const first = names[0];
  let common = 0;
  while (names.every((name) => name[common] === first[common] && common < first.length)) {
    common += 1;
  }
  const from = Math.max(0, first.slice(0, common).search(/[^_\s|]*$/));
  return names.map((name) => windowAt(name, from, maxEm, false));
}

const MAX_CACHED_NAME_SETS = 8;
const fitted = new Map();

/**
 * Display names cut to `maxEm` of text width (em of the drawn size), keyed by the full name. A
 * long name keeps its first part and as many trailing parts as fit, with an ellipsis between;
 * one that cannot fit even so keeps the end of its last parts. Names that would be cut alike
 * show the stretch where they differ instead; no display name is wider than `maxEm`. The
 * result is cached per set of names and budget, since the labels are rebuilt on every render.
 */
export function fitTaxonNames(names = [], maxEm) {
  const unique = [...new Set(names.filter((name) => typeof name === 'string'))];
  const key = `${maxEm}|${unique.join('\n')}`;
  const cached = fitted.get(key);
  if (cached) return cached;

  const texts = unique.map((name) => cutToWidth(name, maxEm));
  const byText = new Map();
  texts.forEach((text, i) => {
    const group = byText.get(text);
    if (group) group.push(i);
    else byText.set(text, [i]);
  });
  for (const group of byText.values()) {
    if (group.length < 2) continue;
    const apart = tellApart(
      group.map((i) => unique[i]),
      maxEm
    );
    group.forEach((i, n) => {
      texts[i] = apart[n];
    });
  }

  const result = new Map(unique.map((name, i) => [name, texts[i]]));
  if (fitted.size >= MAX_CACHED_NAME_SETS) fitted.delete(fitted.keys().next().value);
  fitted.set(key, result);
  return result;
}
