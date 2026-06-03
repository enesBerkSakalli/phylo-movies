import { describe, expect, it } from 'vitest';
import { buildCellData, createCellsLayer } from '../../../src/msaViewer/layers/cellsLayer.js';

describe('MSA cells layer data', () => {
  it('uses the dominant residue for zoomed-out aggregate cells', () => {
    const data = buildCellData(
      10,
      [
        { id: 'taxon-a', seq: 'AC' },
        { id: 'taxon-b', seq: 'CC' },
      ],
      { r0: 0, r1: 1, c0: 0, c1: 1 },
      1
    );

    expect(data).toHaveLength(1);
    expect(data[0].ch).toBe('C');
    expect(data[0].seqId).toBe('taxon-a');
  });

  it('colors MSA cells by taxon color in taxa mode', () => {
    const data = buildCellData(
      10,
      [
        { id: 'taxon-a', seq: 'AC' },
        { id: 'taxon-b', seq: 'CC' },
      ],
      { r0: 0, r1: 1, c0: 0, c1: 0 },
      100
    );
    const layer = createCellsLayer(data, 'dna', null, 'taxa', null, null, {
      'taxon-a': '#123456',
      'taxon-b': '#abcdef',
    });

    expect(layer.props.getFillColor(data[0])).toEqual([18, 52, 86, 255]);
    expect(layer.props.getFillColor(data[1])).toEqual([171, 205, 239, 255]);
  });

  it('preserves row identity for taxa-colored aggregate cells', () => {
    const data = buildCellData(
      10,
      [
        { id: 'taxon-a', seq: 'AAAA' },
        { id: 'taxon-b', seq: 'CCCC' },
      ],
      { r0: 0, r1: 1, c0: 0, c1: 3 },
      2,
      { preserveRows: true }
    );

    expect(data).toHaveLength(2);
    expect(data.map((cell) => cell.seqId)).toEqual(['taxon-a', 'taxon-b']);
    expect(data.map((cell) => cell.ch)).toEqual(['A', 'C']);
    expect(data[0].polygon).toEqual([
      [0, 0],
      [40, 0],
      [40, 10],
      [0, 10],
    ]);
    expect(data[1].polygon).toEqual([
      [0, 10],
      [40, 10],
      [40, 20],
      [0, 20],
    ]);
  });
});
