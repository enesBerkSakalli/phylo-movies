/**
 * LinkDataBuilder - Builds link data objects from normalized layout links
 */
import { getSplitKey } from '../../../../../domain/tree/splits.js';
import { LinkGeometryBuilder } from '../../geometry/links/LinkGeometryBuilder.js';

export class LinkDataBuilder {
  constructor() {
    this.geometryBuilder = new LinkGeometryBuilder();
  }

  /**
   * Convert normalized layout links to Deck.gl format
   * @param {Array} links - Normalized layout links
   * @returns {Array} Array of link data objects
   */
  convertLinks(links, options = {}) {
    // Runs per layout conversion, so skips are counted and reported once instead of
    // one console line per bad link.
    const skipped = [];
    // Single pass: map().filter() would walk every link twice on a hot path.
    const converted = [];
    for (let index = 0; index < links.length; index += 1) {
      const linkData = this.createLinkData(links[index], options, skipped);
      if (linkData) converted.push(linkData);
    }

    if (skipped.length > 0) {
      console.warn(
        `[LinkDataBuilder] Skipped ${skipped.length}/${links.length} links:`,
        summarizeSkipReasons(skipped),
        '- first:',
        skipped[0]
      );
    }

    return converted;
  }

  /**
   * Create link data object from normalized layout link
   * @param {Array} [skipped] - Optional collector for skip diagnostics
   * @returns {Object} Link data for Deck.gl
   */
  createLinkData(link, options = {}, skipped = null) {
    if (!hasFiniteCoordinates(link.source) || !hasFiniteCoordinates(link.target)) {
      skipped?.push({ reason: 'invalid-coordinates', ref: link.targetSplitIndices });
      return null;
    }

    const linkData = this._extractLinkCoordinates(link);
    const linkPath = this.geometryBuilder.createLinkPath(linkData, {
      geometryMode: options.linkGeometryMode,
    });
    const splitKey =
      link.splitKey ||
      link.targetSplitKey ||
      getSplitKey({ split_indices: link.targetSplitIndices });
    const sourceSplitKey =
      link.sourceSplitKey || getSplitKey({ split_indices: link.sourceSplitIndices });
    const sourceId = link.sourceId;
    const targetId = link.targetId;
    const linkKey = sourceId && targetId ? `link-${sourceId}->${targetId}` : null;
    if (!linkKey || !splitKey || !sourceId || !targetId) {
      skipped?.push({ reason: 'missing-normalized-ids', ref: link.targetName });
      return null;
    }

    return {
      id: linkKey,
      depth: link.depth,
      sourcePosition: link.sourcePosition,
      targetPosition: link.targetPosition,
      path: linkPath,
      name: link.name,
      targetName: link.targetName,
      length: link.length,
      metricBranchLength: link.metricBranchLength,
      visualBranchLength: link.visualBranchLength,
      annotations: link.annotations ?? null,
      isLeaf: link.isLeaf === true,
      isInternal: link.isInternal === true,
      split_indices: link.targetSplitIndices,
      splitKey,
      sourceSplitKey,
      targetSplitKey: splitKey,
      radialLength: this._calculateRadialLength(link),
      sourceId,
      targetId,
      sourceSplitIndices: link.sourceSplitIndices,
      targetSplitIndices: link.targetSplitIndices,
      polarData: this._extractPolarData(link),
    };
  }

  /**
   * Extract link coordinates for path calculation
   * @private
   */
  _extractLinkCoordinates(link) {
    return {
      source: endpointCoordinates(link.source),
      target: endpointCoordinates(link.target),
    };
  }

  /**
   * Extract polar coordinate data for interpolation
   * @private
   */
  _extractPolarData(link) {
    return {
      source: {
        angle: link.source.angle,
        radius: link.source.radius,
      },
      target: {
        angle: link.target.angle,
        radius: link.target.radius,
      },
    };
  }

  _calculateRadialLength(link) {
    const sourceRadius = Number(link.source.radius);
    const targetRadius = Number(link.target.radius);
    if (!Number.isFinite(sourceRadius) || !Number.isFinite(targetRadius)) return 0;
    return Math.max(0, targetRadius - sourceRadius);
  }
}

function hasFiniteCoordinates(node) {
  if (!node) return false;

  const { x, y } = endpointCoordinates(node);
  return Number.isFinite(x) && Number.isFinite(y);
}

/**
 * Resolve the coordinates the geometry builder consumes. A layout node may carry either loose
 * x/y/z or a packed `position` array, so both the validation above and the path builder read
 * through here — otherwise a node validated via `position` reaches geometry as undefined x/y.
 */
function endpointCoordinates(node) {
  const position = readPosition(node);
  return {
    x: Number.isFinite(node.x) ? node.x : position?.[0],
    y: Number.isFinite(node.y) ? node.y : position?.[1],
    z: Number.isFinite(node.z) ? node.z : position?.[2],
    angle: node.angle,
    radius: node.radius,
  };
}

function readPosition(node) {
  const position = node.position;
  return Array.isArray(position) || ArrayBuffer.isView(position) ? position : null;
}

function summarizeSkipReasons(skipped) {
  const counts = {};
  for (const entry of skipped) {
    counts[entry.reason] = (counts[entry.reason] ?? 0) + 1;
  }
  return counts;
}
