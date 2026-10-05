import { describe, expect, it } from 'vitest';
import {
  buildMsaWindowOverlapStatus,
  buildMsaWindowStatus,
  formatMsaWindowOverlapLabel,
  formatMsaWindowOverlapTooltip,
  formatMsaWindowStatusLabel,
  formatMsaWindowStatusTooltip,
} from '../../../../src/components/msa/msaViewportStatus.js';

describe('MSA viewport window status', () => {
  it('models the active MSA window column region', () => {
    const status = buildMsaWindowStatus({ sourceInputTreeIndex: 2 }, 50, 100, 1000);

    expect(status).toEqual({
      windowIndex: 2,
      startPosition: 51,
      midPosition: 101,
      endPosition: 150,
    });
    expect(formatMsaWindowStatusLabel(status)).toBe('51-150');
    expect(formatMsaWindowStatusTooltip(status)).toBe('MSA window 3: columns 51-150; center 101');
  });

  it('returns no MSA window status without a discrete window or alignment length', () => {
    expect(buildMsaWindowStatus(null, 50, 100, 1000)).toBeNull();
    expect(buildMsaWindowStatus({ sourceInputTreeIndex: 1.5 }, 50, 100, 1000)).toBeNull();
    expect(buildMsaWindowStatus({ sourceInputTreeIndex: 1 }, 50, 100, 0)).toBeNull();
    expect(formatMsaWindowStatusLabel(null)).toBeNull();
  });

  it('models source-target MSA window overlap for transition frames', () => {
    const status = buildMsaWindowOverlapStatus(
      {
        sourceInputTreeIndex: 2,
        targetInputTreeIndex: 3,
      },
      50,
      100,
      1000
    );

    expect(status).toEqual({
      sourceWindowIndex: 2,
      targetWindowIndex: 3,
      source: {
        startPosition: 51,
        midPosition: 101,
        endPosition: 150,
      },
      target: {
        startPosition: 101,
        midPosition: 151,
        endPosition: 200,
      },
      overlap: {
        startPosition: 101,
        endPosition: 150,
        columnCount: 50,
      },
      leavingRanges: [{ startPosition: 51, endPosition: 100 }],
      enteringRanges: [{ startPosition: 151, endPosition: 200 }],
      totalStartPosition: 51,
      totalEndPosition: 200,
    });
    expect(formatMsaWindowOverlapLabel(status)).toBe('Overlap 101-150');
    expect(formatMsaWindowOverlapTooltip(status)).toBe(
      'Source window 3: columns 51-150; target window 4: columns 101-200; shared overlap 101-150 (50 columns)'
    );
  });

  it('does not build overlap status outside source-target transitions', () => {
    expect(buildMsaWindowOverlapStatus({ sourceInputTreeIndex: 2 }, 50, 100, 1000)).toBeNull();
    expect(
      buildMsaWindowOverlapStatus(
        {
          sourceInputTreeIndex: 2,
          targetInputTreeIndex: 2,
        },
        50,
        100,
        1000
      )
    ).toBeNull();
  });
});
