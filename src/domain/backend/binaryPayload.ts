/**
 * Reader for the PMB1 binary movie payload written by
 * webapp/services/trees/binary_payload.py.
 *
 * The JSON payload parses into one JS array per tree node. Measured on the
 * shipped datasets that is about 237 bytes of heap per node, and norovirus
 * carries 4,232,120 of them, so the parsed graph costs close to a gigabyte
 * before anything renders. The binary container instead stays an ArrayBuffer:
 * every tree is a set of typed-array views over it, costing 24 bytes per node
 * plus 8 per annotation, and only the tree being displayed is expanded into
 * objects.
 *
 * Container layout, little-endian throughout:
 *
 *   magic          4 bytes   "PMB1"
 *   header_length  uint32
 *   header         header_length bytes of UTF-8 JSON, zero padded to 8 bytes
 *   body           one block per tree, each starting 8-byte aligned
 *
 * Per-tree block, for n nodes and m annotation entries:
 *
 *   length         float64 * n
 *   parent         int32   * n        parent node index, -1 for the root
 *   name_ref       uint32  * n        index into tree_name_definitions
 *   split_ref      uint32  * n        index into split_definitions
 *   ann_offset     uint32  * (n + 1)  CSR row offsets into the two arrays below
 *   ann_def        uint32  * m        index into annotation_definitions
 *   ann_value      uint32  * m        index into annotation_value_definitions
 *
 * Validation is structural rather than per-node: the magic, the version and
 * each tree block's extent are checked once when the container is opened, which
 * is a handful of comparisons per tree instead of a walk over every node.
 * Reference bounds are checked while a tree is hydrated, so that cost lands on
 * the one tree being read rather than on the whole payload.
 */

const MAGIC = 'PMB1';
const HEADER_ALIGNMENT = 8;
export const BINARY_PAYLOAD_FORMAT_VERSION = 3;

interface BinaryTreeBlock {
  nodeCount: number;
  annotationCount: number;
  length: Float64Array;
  parent: Int32Array;
  nameRef: Uint32Array;
  splitRef: Uint32Array;
  annotationOffset: Uint32Array;
  annotationDefinition: Uint32Array;
  annotationValue: Uint32Array;
}

interface TreeDirectoryEntry {
  node_count: number;
  annotation_count: number;
  offset: number;
}

export interface BinaryMoviePayload {
  metadata: Record<string, unknown>;
  annotationValueDefinitions: unknown[];
  treeCount: number;
  readTreeBlock(treeIndex: number): BinaryTreeBlock;
}

function alignUp(value: number): number {
  const remainder = value % HEADER_ALIGNMENT;
  return remainder === 0 ? value : value + (HEADER_ALIGNMENT - remainder);
}

/** Block size in bytes for a tree with the given node and annotation counts. */
function blockByteLength(nodeCount: number, annotationCount: number): number {
  return alignUp(
    nodeCount * 8 + // length, float64
      nodeCount * 4 + // parent, int32
      nodeCount * 4 + // name_ref, uint32
      nodeCount * 4 + // split_ref, uint32
      (nodeCount + 1) * 4 + // ann_offset, uint32
      annotationCount * 4 + // ann_def, uint32
      annotationCount * 4 // ann_value, uint32
  );
}

/** True when the buffer opens with the PMB1 magic. */
export function isBinaryMoviePayload(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < MAGIC.length) return false;
  const magic = new Uint8Array(buffer, 0, MAGIC.length);
  for (let index = 0; index < MAGIC.length; index += 1) {
    if (magic[index] !== MAGIC.charCodeAt(index)) return false;
  }
  return true;
}

export function parseBinaryMoviePayload(buffer: ArrayBuffer): BinaryMoviePayload {
  if (!isBinaryMoviePayload(buffer)) {
    throw new Error('Invalid phyloMovieData payload: not a PMB1 container');
  }

  const view = new DataView(buffer);
  const headerLength = view.getUint32(4, true);
  const headerStart = 8;
  if (headerStart + headerLength > buffer.byteLength) {
    throw new Error('Invalid phyloMovieData payload: PMB1 header runs past the buffer');
  }

  const headerText = new TextDecoder('utf-8').decode(
    new Uint8Array(buffer, headerStart, headerLength)
  );
  const header = JSON.parse(headerText) as {
    payload_format_version?: number;
    tree_count?: number;
    annotation_value_definitions?: unknown[];
    trees?: TreeDirectoryEntry[];
    metadata?: Record<string, unknown>;
  };

  if (header.payload_format_version !== BINARY_PAYLOAD_FORMAT_VERSION) {
    throw new Error(
      `Invalid phyloMovieData payload: unsupported payload_format_version ${String(
        header.payload_format_version
      )}`
    );
  }

  const directory = header.trees ?? [];
  const bodyStart = headerStart + alignUp(headerLength);

  // One extent check per tree, so a truncated or mislabelled container fails
  // here rather than handing out views that read into a neighbouring block.
  directory.forEach((entry, treeIndex) => {
    const expected = blockByteLength(entry.node_count, entry.annotation_count);
    if (bodyStart + entry.offset + expected > buffer.byteLength) {
      throw new Error(
        `Invalid phyloMovieData payload: PMB1 block for tree ${treeIndex} runs past the buffer`
      );
    }
  });

  function readTreeBlock(treeIndex: number): BinaryTreeBlock {
    const entry = directory[treeIndex];
    if (!entry) {
      throw new Error(
        `Invalid phyloMovieData payload: interpolated_trees[${treeIndex}] is not available`
      );
    }

    const nodeCount = entry.node_count;
    const annotationCount = entry.annotation_count;
    let cursor = bodyStart + entry.offset;

    const length = new Float64Array(buffer, cursor, nodeCount);
    cursor += nodeCount * 8;
    const parent = new Int32Array(buffer, cursor, nodeCount);
    cursor += nodeCount * 4;
    const nameRef = new Uint32Array(buffer, cursor, nodeCount);
    cursor += nodeCount * 4;
    const splitRef = new Uint32Array(buffer, cursor, nodeCount);
    cursor += nodeCount * 4;
    const annotationOffset = new Uint32Array(buffer, cursor, nodeCount + 1);
    cursor += (nodeCount + 1) * 4;
    const annotationDefinition = new Uint32Array(buffer, cursor, annotationCount);
    cursor += annotationCount * 4;
    const annotationValue = new Uint32Array(buffer, cursor, annotationCount);

    return {
      nodeCount,
      annotationCount,
      length,
      parent,
      nameRef,
      splitRef,
      annotationOffset,
      annotationDefinition,
      annotationValue,
    };
  }

  return {
    metadata: header.metadata ?? {},
    annotationValueDefinitions: header.annotation_value_definitions ?? [],
    treeCount: header.tree_count ?? directory.length,
    readTreeBlock,
  };
}
