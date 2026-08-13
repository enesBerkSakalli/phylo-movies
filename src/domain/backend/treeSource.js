import { hydrateBinaryTreeAtIndex, hydrateMovieTreeAtIndex } from './treeHydration.js';

/**
 * Uniform read access to a movie's trees, whichever encoding carries them.
 *
 * The store used to hold `interpolated_trees` directly and index it, which ties
 * every consumer to that field being a JS array. The PMB1 container has no such
 * array - it holds one typed-array block per tree inside an ArrayBuffer - so the
 * consumers ask a source for a count and for one tree at a time instead.
 *
 * Both implementations are synchronous. The whole payload is resident either
 * way, so reading tree k never has to wait, and the render loop keeps calling
 * hydration straight through without an await.
 *
 * @typedef {object} TreeSource
 * @property {number} treeCount
 * @property {(index: number) => object} hydrateAt
 *   Expand one tree into the canonical node shape.
 * @property {(index: number) => unknown} payloadAt
 *   The tree in whatever form is cheapest to read. Scale calculation walks this
 *   and accepts either a compact tuple node or an expanded one.
 * @property {(index: number) => boolean} isCompactAt
 *   Whether the stored form is compact, for the hydration-progress readout.
 */

function isCompactTreePayload(tree) {
  if (Array.isArray(tree)) return true;
  if (!tree || typeof tree !== 'object') return false;
  return (
    Object.prototype.hasOwnProperty.call(tree, 'name_ref') ||
    Object.prototype.hasOwnProperty.call(tree, 'split_ref') ||
    Object.prototype.hasOwnProperty.call(tree, 'annotation_values')
  );
}

/**
 * Source over a validated JSON movie payload, where the trees are a plain array
 * of compact nodes.
 *
 * @param {object} movieData
 * @returns {TreeSource}
 */
export function createTreeSource(movieData) {
  const trees = Array.isArray(movieData?.interpolated_trees) ? movieData.interpolated_trees : [];

  return {
    treeCount: trees.length,
    hydrateAt: (index) => hydrateMovieTreeAtIndex(movieData, index),
    payloadAt: (index) => trees[index],
    isCompactAt: (index) => isCompactTreePayload(trees[index]),
  };
}

/**
 * Source over a PMB1 container, where the trees live as typed-array views and
 * only become objects when asked for.
 *
 * payloadAt expands the tree rather than returning a stored node, because the
 * binary form has no per-node object to hand back. Callers that walk payloads
 * only touch a few input frames and cache the result, so this stays cheap.
 *
 * @param {object} binaryPayload Result of parseBinaryMoviePayload.
 * @param {object} movieData Validated metadata carrying the definition tables.
 * @returns {TreeSource}
 */
export function createBinaryTreeSource(binaryPayload, movieData) {
  const hydrateAt = (index) => hydrateBinaryTreeAtIndex(binaryPayload, movieData, index);

  return {
    treeCount: binaryPayload.treeCount,
    hydrateAt,
    payloadAt: hydrateAt,
    isCompactAt: () => true,
  };
}
