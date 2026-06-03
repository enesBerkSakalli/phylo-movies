import { describe, expect, it } from 'vitest';
import { buildTextData, createLettersLayer } from '../../../src/msaViewer/layers/lettersLayer.js';

describe('MSA letters layer', () => {
  it('keeps sequence id on letter data for row coloring', () => {
    const data = buildTextData(
      10,
      [{ id: 'taxon-a', seq: 'AC' }],
      { r0: 0, r1: 0, c0: 0, c1: 0 },
      true,
      10,
      1
    );

    expect(data[0].seqId).toBe('taxon-a');
    expect(data[0].col).toBe(0);
  });

  it('uses contrasting text for taxa-colored cells', () => {
    const data = buildTextData(
      10,
      [
        { id: 'dark-taxon', seq: 'A' },
        { id: 'light-taxon', seq: 'C' },
      ],
      { r0: 0, r1: 1, c0: 0, c1: 0 },
      true,
      10,
      1
    );
    const layer = createLettersLayer(data, 'taxa', {
      'dark-taxon': '#123456',
      'light-taxon': '#f5f5f5',
    });

    expect(layer.props.getColor(data[0])).toEqual([255, 255, 255, 255]);
    expect(layer.props.getColor(data[1])).toEqual([40, 40, 40, 255]);
  });

  it('uses contrasting text against dimmed taxa-colored cells outside the active window', () => {
    const data = buildTextData(
      10,
      [{ id: 'dark-taxon', seq: 'AA' }],
      { r0: 0, r1: 0, c0: 0, c1: 1 },
      true,
      10,
      1
    );
    const layer = createLettersLayer(
      data,
      'taxa',
      { 'dark-taxon': '#123456' },
      { startCol: 2, endCol: 2 },
      null
    );

    expect(layer.props.getColor(data[0])).toEqual([40, 40, 40, 255]);
    expect(layer.props.getColor(data[1])).toEqual([255, 255, 255, 255]);
  });
});
