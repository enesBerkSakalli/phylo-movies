import { describe, expect, it } from 'vitest';
import { buildRowLabels } from '../../../../src/msaViewer/layers/rowLabelsLayer.js';

const SEQUENCES = [{ id: 'taxon-a' }, { id: 'taxon-b' }];
const VISIBLE_RANGE = { r0: 0, r1: 1 };
const VIEW_STATE = { zoom: 0 };

function build(rowColorMap) {
  return buildRowLabels(10, SEQUENCES, VISIBLE_RANGE, VIEW_STATE, 1, 120, rowColorMap);
}

describe('MSA row label colors', () => {
  it('renders every taxon as black text on white when none is assigned a color', () => {
    // The default mode. A dense color map that spelled out the system default
    // for every taxon used to reach this layer, which took the assigned-color
    // branch and produced white-on-black for taxa nobody had colored.
    const labels = build({});

    expect(labels).toHaveLength(2);
    for (const label of labels) {
      expect(label.backgroundColor).toEqual([255, 255, 255, 255]);
      expect(label.textColor).toEqual([0, 0, 0, 255]);
    }
  });

  it('uses an assigned color as the background and leaves unassigned rows alone', () => {
    const [assigned, unassigned] = build({ 'taxon-a': '#123456' });

    expect(assigned.backgroundColor.slice(0, 3)).not.toEqual([255, 255, 255]);
    expect(assigned.backgroundColor[3]).toBe(255);

    expect(unassigned.backgroundColor).toEqual([255, 255, 255, 255]);
    expect(unassigned.textColor).toEqual([0, 0, 0, 255]);
  });

  it('treats an explicitly assigned black as a chosen color, not as the default', () => {
    // Distinguishes "absent" from "chose black": a user who picks black still
    // gets the assigned-color branch, with readable light text over it.
    const [label] = build({ 'taxon-a': '#000000' });

    expect(label.backgroundColor).toEqual([0, 0, 0, 255]);
    expect(label.textColor).toEqual([255, 255, 255, 255]);
  });
});

describe('MSA row label names', () => {
  it('draws the shortened display name and keeps the row for anything without one', () => {
    const long = 'Bacteria_Proteobacteria_Gammaproteobacteria_Chromatiales_Thiohalospira_halophila_HL3';
    const displayNames = new Map([[long, '…Thiohalospira_halophila_HL3']]);
    const [shortened, plain] = buildRowLabels(
      10,
      [{ id: long }, { id: 'taxon-b' }],
      VISIBLE_RANGE,
      VIEW_STATE,
      1,
      120,
      {},
      displayNames
    );
    expect(shortened.text).toBe('…Thiohalospira_halophila_HL3');
    expect(plain.text).toBe('taxon-b');
  });
});

describe('MSA row label glyphs', () => {
  it('draws the shortening ellipsis from a fixed character set', async () => {
    const { createRowLabelsLayer } = await import('../../../../src/msaViewer/layers/rowLabelsLayer.js');
    const layer = createRowLabelsLayer([{ text: '…halophila_HL3', position: [0, 0, 0] }]);
    // Fixed, not 'auto': an atlas rebuilt per row set misplaces end-anchored names.
    expect(typeof layer.props.characterSet).toBe('string');
    expect(layer.props.characterSet).toContain('…');
    expect(layer.props.characterSet).toContain('A');
    expect(layer.props.characterSet).toContain('_');
  });
});
