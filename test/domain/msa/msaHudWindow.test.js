import { describe, expect, it } from 'vitest';
import { buildMsaWindow } from '../../../src/components/HUD/shared/hudShared.js';

describe('HUD MSA window model', () => {
  it('does not build a displayed MSA window without alignment columns', () => {
    expect(buildMsaWindow(true, 0, 50, 100, 0)).toBeNull();
  });

  it('does not build a displayed MSA window for fractional transition positions', () => {
    expect(buildMsaWindow(true, 1.5, 50, 100, 1000)).toBeNull();
  });

  it('builds displayed windows from discrete input-tree window indices', () => {
    expect(buildMsaWindow(true, 1, 50, 100, 1000)).toEqual({
      startPosition: 1,
      midPosition: 51,
      endPosition: 100,
    });
  });
});
