import { describe, expect, it } from 'vitest';
import {
  buildMsaWindowStatus,
  buildMsaTreeStatus,
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
    expect(formatMsaTreeStatusTooltip(status)).toBe('Transition from input tree 3 to 4; active MSA window 3');
    expect(formatMsaTreeStatusLabel(status)).toBe('3 -> 4');
  });

  it('returns no status without input-tree context', () => {
    expect(buildMsaTreeStatus(null)).toBeNull();
    expect(buildMsaTreeStatus({ frameIndex: 10 })).toBeNull();
    expect(formatMsaTreeStatusLabel(null)).toBeNull();
  });

  it('models the active MSA window column region', () => {
    const status = buildMsaWindowStatus(
      { msaWindowIndex: 2 },
      50,
      100,
      1000,
    );

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
});
