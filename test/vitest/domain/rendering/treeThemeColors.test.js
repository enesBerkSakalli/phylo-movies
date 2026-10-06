// The tree's system colours are theme tokens. The literals in source are what the tokens resolve
// to where no theme is loaded (these tests, workers): they must be the tokens to the byte, or the
// app and the goldens would draw different trees.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { colorToRgb } from '../../../../src/services/ui/colorUtils.js';
import { SYSTEM_COLOR_DEFAULTS } from '../../../../src/constants/TreeColors.js';
import {
  COLLAPSING_LIFECYCLE_COLOR,
  EXPANDING_LIFECYCLE_COLOR,
} from '../../../../src/treeVisualisation/deckgl/layers/styles/links/linkUtils.js';
import { HOVER_HIGHLIGHT_COLOR } from '../../../../src/treeVisualisation/deckgl/layers/config/layerConfigs.js';

const css = readFileSync('src/css/index.css', 'utf8');
const light = css.slice(css.indexOf(':root {')).split('}')[0];
const token = (name) => colorToRgb(light.match(new RegExp(`\\s${name}:\\s*([^;]+);`))[1]);

describe('tree colour defaults', () => {
  it('are the light theme tokens, to the byte', () => {
    expect(colorToRgb(SYSTEM_COLOR_DEFAULTS.subtreeHighlightColor)).toEqual(token('--moved'));
    expect(colorToRgb(SYSTEM_COLOR_DEFAULTS.pivotEdgeColor)).toEqual(token('--change'));
    expect(EXPANDING_LIFECYCLE_COLOR).toEqual(token('--expand'));
    expect(COLLAPSING_LIFECYCLE_COLOR).toEqual(token('--collapse'));
    expect(HOVER_HIGHLIGHT_COLOR).toEqual([...token('--signal'), 150]);
  });

  it('keep the values users and published figures know', () => {
    expect(SYSTEM_COLOR_DEFAULTS.subtreeHighlightColor).toBe('#10b981');
    expect(SYSTEM_COLOR_DEFAULTS.pivotEdgeColor).toBe('#2196f3');
    expect(EXPANDING_LIFECYCLE_COLOR).toEqual([34, 197, 94]);
    expect(COLLAPSING_LIFECYCLE_COLOR).toEqual([245, 158, 11]);
  });
});
