import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  validateTreeList,
  validateTreePayloadList,
} from '../../../../src/domain/backend/treePayloadValidators.ts';
import { flattenTreeAnnotationValues } from '../../../../src/domain/backend/annotationValueLayout.ts';
import { hydrateMovieTreeAtIndex } from '../../../../src/domain/backend/treeHydration.js';
import { parseBinaryMoviePayload } from '../../../../src/domain/backend/binaryPayload.ts';
import calculateScales from '../../../../src/domain/tree/scaleUtils.js';

// Deep enough that the previous recursive walkers exhaust the call stack, so
// each case below pins the iterative rewrite rather than restating a passing
// behaviour.
const DEPTH = 100000;

const DEFINITIONS = [
  {
    key: 'label.raw_internal',
    path: ['label', 'raw_internal'],
    label: 'Raw Internal Label',
    value_type: 'string',
    role: 'source_annotation',
  },
];
const DICTIONARIES = {
  treeNameDefinitions: ['', 'tip'],
  splitDefinitions: [[0, 1], [0]],
};

/** A caterpillar of DEPTH internal nodes over one annotated leaf. */
function makeCaterpillar(depth) {
  let node = [1, 1, 1, [[0, 'leaf-note']], []];
  for (let level = 0; level < depth; level += 1) {
    node = [0.5, 0, 0, null, [node]];
  }
  return node;
}

function measureDepth(root) {
  let max = 0;
  const stack = [[root, 1]];
  while (stack.length > 0) {
    const [node, depth] = stack.pop();
    if (depth > max) max = depth;
    const children = Array.isArray(node) ? node[4] : node.children;
    for (const child of children) stack.push([child, depth + 1]);
  }
  return max;
}

describe('tree walkers survive depths that overflow a call stack', () => {
  it('validates the transport path', () => {
    const trees = validateTreePayloadList([makeCaterpillar(DEPTH)], DEFINITIONS, DICTIONARIES);
    expect(trees).toHaveLength(1);
  });

  it('validates the hydrating path and preserves the structure', () => {
    const [validated] = validateTreeList([makeCaterpillar(DEPTH)], DEFINITIONS, DICTIONARIES);
    expect(measureDepth(validated)).toBe(DEPTH + 1);

    let node = validated;
    while (node.children.length > 0) node = node.children[0];
    expect(node.name).toBe('tip');
    expect(node.annotations.fields['label.raw_internal'].value).toBe('leaf-note');
  });

  it('flattens annotation values in place', () => {
    const [flattened] = flattenTreeAnnotationValues([makeCaterpillar(DEPTH)]);
    let node = flattened;
    while (node[4].length > 0) node = node[4][0];
    expect(node[3]).toEqual([0, 'leaf-note']);
  });

  it('hydrates through the movie payload entry point', () => {
    const movieData = {
      interpolated_trees: [makeCaterpillar(DEPTH)],
      annotation_definitions: DEFINITIONS,
      tree_name_definitions: DICTIONARIES.treeNameDefinitions,
      split_definitions: DICTIONARIES.splitDefinitions,
    };
    const hydrated = hydrateMovieTreeAtIndex(movieData, 0);
    expect(measureDepth(hydrated)).toBe(DEPTH + 1);
  });

  it('calculates the scale', () => {
    const [scale] = calculateScales([makeCaterpillar(DEPTH)], [0]);
    // Root length excluded: DEPTH - 1 internals at 0.5 plus the leaf at 1.
    expect(scale.value).toBe((DEPTH - 1) * 0.5 + 1);
  });
});

describe('scale from a PMB1 block matches the hydrated walk', () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
  const fixtureDir = path.join(repoRoot, 'test/fixtures/binary');
  const jsonPayload = JSON.parse(readFileSync(path.join(fixtureDir, 'movie_payload.json'), 'utf8'));
  const bytes = readFileSync(path.join(fixtureDir, 'movie_payload.pmb'));
  const binary = parseBinaryMoviePayload(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  );

  it.each([0, 1, 2])('tree %i scales identically from block and nodes', (treeIndex) => {
    const [fromBlock] = calculateScales([binary.readTreeBlock(treeIndex)], [0]);
    const [fromNodes] = calculateScales([hydrateMovieTreeAtIndex(jsonPayload, treeIndex)], [0]);

    expect(fromBlock.value).toBeCloseTo(fromNodes.value, 12);
    expect(fromBlock.value).toBeGreaterThan(0);
  });
});
