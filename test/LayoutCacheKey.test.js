import { describe, expect, it } from 'vitest';
import { createLayoutCacheKey } from '../src/treeVisualisation/utils/layoutCacheKey.js';

describe('layout cache key', () => {
  const baseState = {
    treeList: [{ id: 'tree-0' }],
    datasetVersion: 1,
    branchTransformation: 'none',
    layoutAngleDegrees: 360,
    layoutRotationDegrees: 0,
    styleConfig: { labelOffsets: { DEFAULT: 20, EXTENSION: 5 } }
  };

  const baseOptions = {
    state: baseState,
    treeIndex: 0,
    width: 800,
    height: 600,
    maxGlobalScale: 12
  };

  it('changes for each layout-affecting input', () => {
    const baseKey = createLayoutCacheKey(baseOptions);

    expect(createLayoutCacheKey({ ...baseOptions, state: { ...baseState, datasetVersion: 2 } })).not.toBe(baseKey);
    expect(createLayoutCacheKey({ ...baseOptions, treeIndex: 1 })).not.toBe(baseKey);
    expect(createLayoutCacheKey({ ...baseOptions, state: { ...baseState, branchTransformation: 'log' } })).not.toBe(baseKey);
    expect(createLayoutCacheKey({ ...baseOptions, width: 900 })).not.toBe(baseKey);
    expect(createLayoutCacheKey({ ...baseOptions, height: 700 })).not.toBe(baseKey);
    expect(createLayoutCacheKey({ ...baseOptions, state: { ...baseState, layoutAngleDegrees: 180 } })).not.toBe(baseKey);
    expect(createLayoutCacheKey({ ...baseOptions, state: { ...baseState, layoutRotationDegrees: 45 } })).not.toBe(baseKey);
    expect(createLayoutCacheKey({
      ...baseOptions,
      state: { ...baseState, subtreeTracking: [[[2, 3]]] }
    })).not.toBe(baseKey);
    expect(createLayoutCacheKey({
      ...baseOptions,
      state: { ...baseState, linkGeometryMode: 'straight' }
    })).not.toBe(baseKey);
    expect(createLayoutCacheKey({
      ...baseOptions,
      state: { ...baseState, styleConfig: { labelOffsets: { DEFAULT: 30, EXTENSION: 5 } } }
    })).not.toBe(baseKey);
    expect(createLayoutCacheKey({
      ...baseOptions,
      state: { ...baseState, styleConfig: { labelOffsets: { DEFAULT: 20, EXTENSION: 10 } } }
    })).not.toBe(baseKey);
    expect(createLayoutCacheKey({ ...baseOptions, maxGlobalScale: 20 })).not.toBe(baseKey);
  });

  it('distinguishes intentional zero scale from missing scale', () => {
    const zeroScaleKey = createLayoutCacheKey({ ...baseOptions, maxGlobalScale: 0 });
    const missingScaleKey = createLayoutCacheKey({ ...baseOptions, maxGlobalScale: null });

    expect(zeroScaleKey).toContain('maxGlobalScale=0');
    expect(missingScaleKey).toContain('maxGlobalScale=none');
    expect(zeroScaleKey).not.toBe(missingScaleKey);
  });

  it('uses source-frame subtree tracking when transition frames omit their own highlight group', () => {
    const key = createLayoutCacheKey({
      ...baseOptions,
      treeIndex: 1,
      state: {
        ...baseState,
        treeList: [{ id: 'tree-0' }, { id: 'tree-1' }],
        subtreeTracking: [[[5], [3]], null],
        transitionResolver: {
          getSourceTreeIndex: () => 0
        }
      }
    });

    expect(key).toContain('rotationAlignmentExcludeTaxa=3,5');
  });
});
