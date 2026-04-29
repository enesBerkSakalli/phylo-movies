import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { selectActiveTreeList } from '../src/state/phyloStore/store.js';

const repoRoot = path.resolve(__dirname, '..');

describe('active tree list selector', () => {
  it('uses treeList as the canonical active tree sequence', () => {
    const treeList = [{ id: 'tree-list-0' }];
    const movieTrees = [{ id: 'movie-tree-0' }, { id: 'movie-tree-1' }];

    expect(selectActiveTreeList({ treeList, movieData: { interpolated_trees: movieTrees } })).toBe(treeList);
  });

  it('keeps active tree source selection out of visualization callers', () => {
    const files = [
      'src/treeVisualisation/utils/layoutCacheKey.js',
      'src/treeVisualisation/DeckGLTreeAnimationController.js',
      'src/treeVisualisation/systems/InterpolationRenderer.js',
      'src/treeVisualisation/systems/AnimationRunner.js',
    ];

    const forbidden = [
      /movieData\??\.\s*interpolated_trees\s*\|\|\s*state\??\.\s*treeList/,
      /state\??\.\s*treeList\s*\|\|\s*state\??\.\s*movieData\??\.\s*interpolated_trees/,
      /state\??\.\s*movieData\??\.\s*interpolated_trees\s*\|\|\s*state\??\.\s*treeList/,
    ];

    const violations = files.flatMap((file) => {
      const text = fs.readFileSync(path.join(repoRoot, file), 'utf8');
      return forbidden
        .filter((pattern) => pattern.test(text))
        .map((pattern) => `${file}: ${pattern}`);
    });

    expect(violations).toEqual([]);
  });
});
