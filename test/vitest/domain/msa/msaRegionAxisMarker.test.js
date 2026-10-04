import { describe, expect, it } from 'vitest';
import {
  buildRegionAxisMarker,
  REGION_AXIS_MARKER_HEIGHT_PX,
} from '../../../../src/msaViewer/layers/regionBorderLayer.js';

describe('MSA region axis marker', () => {
  it('spans the current region at the bottom of the ruler in constant screen pixels', () => {
    const [marker] = buildRegionAxisMarker(10, { startCol: 201, endCol: 400 }, 1000, 20, 0.5);

    expect(marker.polygon).toEqual([
      [2000, (20 - REGION_AXIS_MARKER_HEIGHT_PX) / 0.5],
      [4000, (20 - REGION_AXIS_MARKER_HEIGHT_PX) / 0.5],
      [4000, 40],
      [2000, 40],
    ]);
  });

  it('clamps to the alignment and renders nothing without a region', () => {
    const [marker] = buildRegionAxisMarker(10, { startCol: 950, endCol: 1100 }, 1000, 20, 1);
    expect(marker.polygon[1][0]).toBe(10000);
    expect(buildRegionAxisMarker(10, null, 1000, 20, 1)).toEqual([]);
  });
});
