import { describe, expect, it } from 'vitest';
import { buildCellData } from '../../../src/msaViewer/layers/cellsLayer.js';

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
  });
});
