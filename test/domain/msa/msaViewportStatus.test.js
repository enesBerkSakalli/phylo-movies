import { describe, expect, it } from 'vitest';
import {
  buildMsaWindowOverlapStatus,
  buildMsaWindowStatus,
  buildMsaTreeStatus,
  formatMsaWindowOverlapLabel,
  formatMsaWindowOverlapTooltip,
  formatMsaWindowStatusLabel,
  formatMsaWindowStatusTooltip,
  formatMsaTreeStatusLabel,
  formatMsaTreeStatusTooltip,
} from '../../../src/components/msa/msaViewportStatus.js';

describe('MSA viewport tree status', () => {
  it('models an observed input tree as one active tree icon', () => {
    const status = buildMsaTreeStatus({
      isObservedInput: true,
      inputTreeIndex: 3,
      msaWindowIndex: 3,
    });

    expect(status).toEqual({
      kind: 'input',
      activeInputTreeIndex: 3,
      sourceInputTreeIndex: 3,
      targetInputTreeIndex: null,
    });
    expect(formatMsaTreeStatusTooltip(status)).toBe('Input tree 4; active MSA window 4');
    expect(formatMsaTreeStatusLabel(status)).toBe('4');
  });

  it('models transition frames as source and target tree icons with source window active', () => {
    const status = buildMsaTreeStatus({
      isObservedInput: false,
      sourceInputTreeIndex: 2,
      targetInputTreeIndex: 3,
      msaWindowIndex: 2,
    });

    expect(status).toEqual({
      kind: 'transition',
      activeInputTreeIndex: 2,
      sourceInputTreeIndex: 2,
      targetInputTreeIndex: 3,
    });
    expect(formatMsaTreeStatusTooltip(status)).toBe(
      'Transition from input tree 3 to 4; active MSA window 3'
    );
    expect(formatMsaTreeStatusLabel(status)).toBe('3 -> 4');
  });

  it('returns no status without input-tree context', () => {
    expect(buildMsaTreeStatus(null)).toBeNull();
    expect(buildMsaTreeStatus({ frameIndex: 10 })).toBeNull();
    expect(formatMsaTreeStatusLabel(null)).toBeNull();
  });

  it('models the active MSA window column region', () => {
    const status = buildMsaWindowStatus({ msaWindowIndex: 2 }, 50, 100, 1000);

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
    expect(buildMsaWindowStatus({ msaWindowIndex: 1.5 }, 50, 100, 1000)).toBeNull();
    expect(buildMsaWindowStatus({ msaWindowIndex: 1 }, 50, 100, 0)).toBeNull();
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
