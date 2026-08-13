import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readMoviePayload } from '../../../../src/services/data/dataService.js';
import { hydrateMovieTreeAtIndex } from '../../../../src/domain/backend/treeHydration.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const fixtureDir = path.join(repoRoot, 'test/fixtures/binary');

function toArrayBuffer(bytes) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

const alignUp = (value) => (value % 8 === 0 ? value : value + (8 - (value % 8)));

/**
 * Rewrite a container's header, keeping the body byte-for-byte and 8-byte
 * aligned. Without the padding the blocks shift and the reader reports a
 * truncated container rather than the contract violation under test.
 */
function tamperHeader(buffer, mutate) {
  const headerLength = new DataView(buffer).getUint32(4, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 8, headerLength)));
  mutate(header);

  const rewritten = new TextEncoder().encode(JSON.stringify(header));
  const body = new Uint8Array(buffer, 8 + alignUp(headerLength));
  const bodyStart = 8 + alignUp(rewritten.length);

  const out = new Uint8Array(bodyStart + body.length);
  out.set(new Uint8Array(buffer, 0, 8));
  out.set(rewritten, 8);
  out.set(body, bodyStart);
  new DataView(out.buffer).setUint32(4, rewritten.length, true);
  return out.buffer;
}

// The same payload in both encodings, written together by
// scripts/generate-binary-payload-fixture.py.
const jsonBuffer = toArrayBuffer(readFileSync(path.join(fixtureDir, 'movie_payload.json')));
const binaryBuffer = toArrayBuffer(readFileSync(path.join(fixtureDir, 'movie_payload.pmb')));

describe('readMoviePayload encoding dispatch', () => {
  it('reads a JSON payload into a tree array', () => {
    const payload = readMoviePayload(jsonBuffer);

    expect(payload.interpolated_trees).toHaveLength(3);
    expect(payload.treeSource).toBeUndefined();
    expect(payload.file_name).toBe('binary_payload_fixture.trees');
  });

  it('reads a PMB1 payload into a tree source, leaving the trees in the buffer', () => {
    const payload = readMoviePayload(binaryBuffer);

    expect(payload.interpolated_trees).toBeUndefined();
    expect(payload.treeSource.treeCount).toBe(3);
    expect(payload.file_name).toBe('binary_payload_fixture.trees');
  });

  it('validates both encodings to the same metadata', () => {
    const fromJson = readMoviePayload(jsonBuffer);
    const fromBinary = readMoviePayload(binaryBuffer);

    for (const field of [
      'frames',
      'pairs',
      'temporal_events',
      'subtree_highlight_tracking',
      'pair_metrics',
      'msa',
      'file_name',
      'dataset_provenance',
      'annotation_definitions',
      'tree_name_definitions',
      'split_definitions',
    ]) {
      expect(fromBinary[field]).toEqual(fromJson[field]);
    }
  });

  it('hydrates the same trees from either encoding', () => {
    const fromJson = readMoviePayload(jsonBuffer);
    const fromBinary = readMoviePayload(binaryBuffer);

    for (const treeIndex of [0, 1, 2]) {
      expect(fromBinary.treeSource.hydrateAt(treeIndex)).toEqual(
        hydrateMovieTreeAtIndex(fromJson, treeIndex)
      );
    }
  });

  it('applies the same contract checks to a PMB1 header as to a JSON payload', () => {
    // A container whose tree count disagrees with its frame rows must be
    // rejected, not silently trusted because it arrived as bytes.
    const tampered = tamperHeader(binaryBuffer, (header) => {
      header.tree_count = 2;
      header.trees = header.trees.slice(0, 2);
    });

    expect(() => readMoviePayload(tampered)).toThrow(/frames length \(3\) must match/);
  });

  it('rejects a PMB1 header carrying a key outside the backend contract', () => {
    const tampered = tamperHeader(binaryBuffer, (header) => {
      header.metadata.pivot_edge_tracking = [];
    });

    expect(() => readMoviePayload(tampered)).toThrow(
      /pivot_edge_tracking is not part of the backend contract/
    );
  });
});
