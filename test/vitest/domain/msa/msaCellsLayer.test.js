import { describe, expect, it } from 'vitest';
import {
  buildCellData,
  createCellsLayers,
  groupCellDataBySize,
} from '../../../../src/msaViewer/layers/cellsLayer.js';

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
    const [layer] = createCellsLayers(groupCellDataBySize(data), 'dna', null, 'taxa', null, null, {
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
    expect(data[0]).toMatchObject({
      position: [20, 5, 0],
      width: 40,
      height: 10,
    });
    expect(data[1]).toMatchObject({
      position: [20, 15, 0],
      width: 40,
      height: 10,
    });
  });

  it('aggregates identity across every residue in an overview block', () => {
    const sequences = [
      { id: 'taxon-a', seq: 'BA' },
      { id: 'taxon-b', seq: 'BA' },
      { id: 'taxon-c', seq: 'AA' },
    ];
    const data = buildCellData(10, sequences, { r0: 0, r1: 2, c0: 0, c1: 1 }, 1, {
      consensus: 'BA',
    });
    const [layer] = createCellsLayers(groupCellDataBySize(data), 'protein', null, 'identity', 'BA');

    expect(data).toHaveLength(1);
    expect(data[0].identityMatchFraction).toBeCloseTo(5 / 6);
    expect(layer.props.getFillColor(data[0])).toEqual([42, 42, 193, 255]);
  });

  it('does not expose similarity as an identity alias', () => {
    const source = createCellsLayers.toString();
    expect(source).not.toContain('similarity');
  });

  it('uses one instanced rectangle mesh per cell size instead of cell polygons', () => {
    const data = buildCellData(
      10,
      [{ id: 'taxon-a', seq: 'AAA' }],
      { r0: 0, r1: 0, c0: 0, c1: 2 },
      2
    );
    const layers = createCellsLayers(groupCellDataBySize(data), 'dna', null);

    expect(data.every((cell) => !Object.hasOwn(cell, 'polygon'))).toBe(true);
    expect(layers).toHaveLength(2);
    expect(layers.every((layer) => layer.constructor.layerName === 'ColumnLayer')).toBe(true);
    expect(layers.every((layer) => layer.props.diskResolution === 4)).toBe(true);
  });
});
