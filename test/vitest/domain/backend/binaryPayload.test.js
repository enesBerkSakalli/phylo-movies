import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BINARY_PAYLOAD_FORMAT_VERSION,
  isBinaryMoviePayload,
  parseBinaryMoviePayload,
} from '../../../../src/domain/backend/binaryPayload.ts';
import {
  hydrateBinaryTreeAtIndex,
  hydrateMovieTreeAtIndex,
} from '../../../../src/domain/backend/treeHydration.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const fixtureDir = path.join(repoRoot, 'test/fixtures/binary');

// Written by scripts/generate-binary-payload-fixture.py. The point of reading a
// Python-produced buffer here is that a round-trip test inside either language
// cannot catch the two disagreeing on endianness, block offsets or alignment.
const jsonPayload = JSON.parse(readFileSync(path.join(fixtureDir, 'movie_payload.json'), 'utf8'));
const binaryBytes = readFileSync(path.join(fixtureDir, 'movie_payload.pmb'));
const binaryBuffer = binaryBytes.buffer.slice(
  binaryBytes.byteOffset,
  binaryBytes.byteOffset + binaryBytes.byteLength
);

describe('PMB1 container', () => {
  it('recognises the magic and rejects anything else', () => {
    expect(isBinaryMoviePayload(binaryBuffer)).toBe(true);
    expect(isBinaryMoviePayload(new TextEncoder().encode('{"a":1}').buffer)).toBe(false);
    expect(isBinaryMoviePayload(new ArrayBuffer(2))).toBe(false);
  });

  it('reads the header the Python writer produced', () => {
    const payload = parseBinaryMoviePayload(binaryBuffer);

    expect(payload.treeCount).toBe(jsonPayload.interpolated_trees.length);
    expect(payload.metadata.file_name).toBe(jsonPayload.file_name);
    expect(payload.metadata.tree_name_definitions).toEqual(jsonPayload.tree_name_definitions);
    expect(payload.metadata.split_definitions).toEqual(jsonPayload.split_definitions);
    expect('interpolated_trees' in payload.metadata).toBe(false);
  });

  it('interns each distinct annotation value once', () => {
    const payload = parseBinaryMoviePayload(binaryBuffer);
    // 100.0 appears on two nodes of the annotated tree, which itself appears twice.
    expect(payload.annotationValueDefinitions).toEqual([
      88.5,
      'internal-1',
      100.0,
      true,
      'internal-2',
      [1, 2, 3],
    ]);
  });

  it('exposes each tree as typed-array views, not copies', () => {
    const block = parseBinaryMoviePayload(binaryBuffer).readTreeBlock(0);

    expect(block.length).toBeInstanceOf(Float64Array);
    expect(block.parent).toBeInstanceOf(Int32Array);
    expect(block.nameRef).toBeInstanceOf(Uint32Array);
    expect(block.splitRef).toBeInstanceOf(Uint32Array);
    expect(block.length.buffer).toBe(binaryBuffer);
    expect(block.nodeCount).toBe(5);
    expect(block.parent[0]).toBe(-1);
    expect(block.annotationOffset).toHaveLength(block.nodeCount + 1);
  });

  it('rejects an unsupported format version', () => {
    const tampered = binaryBuffer.slice(0);
    const view = new DataView(tampered);
    const headerLength = view.getUint32(4, true);
    const headerText = new TextDecoder().decode(new Uint8Array(tampered, 8, headerLength));
    const header = JSON.parse(headerText);
    header.payload_format_version = 99;

    const rewritten = new TextEncoder().encode(JSON.stringify(header));
    const out = new Uint8Array(8 + rewritten.length);
    out.set(new Uint8Array(tampered, 0, 8));
    out.set(rewritten, 8);
    new DataView(out.buffer).setUint32(4, rewritten.length, true);

    expect(() => parseBinaryMoviePayload(out.buffer)).toThrow(
      /unsupported payload_format_version 99/
    );
    expect(BINARY_PAYLOAD_FORMAT_VERSION).toBe(3);
  });

  it('rejects a truncated container instead of reading past the buffer', () => {
    const truncated = binaryBuffer.slice(0, binaryBuffer.byteLength - 64);
    expect(() => parseBinaryMoviePayload(truncated)).toThrow(/runs past the buffer/);
  });
});

describe('binary hydration matches the JSON path', () => {
  const binaryPayload = parseBinaryMoviePayload(binaryBuffer);

  it.each([0, 1, 2])('hydrates tree %i identically to the compact JSON payload', (treeIndex) => {
    const fromJson = hydrateMovieTreeAtIndex(jsonPayload, treeIndex);
    const fromBinary = hydrateBinaryTreeAtIndex(binaryPayload, jsonPayload, treeIndex);

    expect(fromBinary).toEqual(fromJson);
  });

  it('preserves child order on an unbalanced tree', () => {
    const fromBinary = hydrateBinaryTreeAtIndex(binaryPayload, jsonPayload, 0);
    expect(fromBinary.children.map((child) => child.name)).toEqual(['A', '']);
    expect(fromBinary.children[1].children.map((child) => child.name)).toEqual(['B', 'C']);
  });

  it('carries every annotation value type through unchanged', () => {
    const root = hydrateBinaryTreeAtIndex(binaryPayload, jsonPayload, 0);
    const fields = root.children[0].annotations.fields;

    expect(fields['support.iqtree.sh_alrt'].value).toBe(100);
    expect(fields['metadata.verified'].value).toBe(true);

    const arrayField = root.children[1].children[0].annotations.fields['metadata.samples'];
    expect(arrayField.value).toEqual([1, 2, 3]);
  });

  it('leaves nodes without annotations free of an annotations key', () => {
    const plainTree = hydrateBinaryTreeAtIndex(binaryPayload, jsonPayload, 1);
    expect('annotations' in plainTree).toBe(false);
    expect(plainTree.children.every((child) => !('annotations' in child))).toBe(true);
  });

  it('reports an unavailable tree index rather than returning a partial tree', () => {
    expect(() => hydrateBinaryTreeAtIndex(binaryPayload, jsonPayload, 99)).toThrow(
      /interpolated_trees\[99\] is not available/
    );
  });
});
