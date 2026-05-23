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
    return links
      .map(link => this.createLinkData(link, options))
      .filter(Boolean);
  }

  /**
   * Create link data object from normalized layout link
   * @returns {Object} Link data for Deck.gl
   */
  createLinkData(link, options = {}) {
    if (!hasFiniteCoordinates(link.source) || !hasFiniteCoordinates(link.target)) {
      console.warn('[LinkDataBuilder] Skipping link with invalid layout coordinates:', link.targetSplitIndices);
      return null;
    }

    const linkData = this._extractLinkCoordinates(link);
    const linkPath = this.geometryBuilder.createLinkPath(linkData, {
      geometryMode: options.linkGeometryMode
    });
    const splitKey = getSplitKey({ split_indices: link.targetSplitIndices });
    const linkKey = splitKey ? `link-${splitKey}` : null;
    const sourceId = link.sourceId;
    const targetId = link.targetId;
    if (!linkKey || !sourceId || !targetId) {
      console.warn('[LinkDataBuilder] Skipping link without normalized ids:', link.targetName);
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
      annotations: link.annotations ?? null,
      isLeaf: link.isLeaf === true,
      isInternal: link.isInternal === true,
      split_indices: link.targetSplitIndices,
      splitKey,
      radialLength: this._calculateRadialLength(link),
      sourceId,
      targetId,
      sourceSplitIndices: link.sourceSplitIndices,
      targetSplitIndices: link.targetSplitIndices,
      polarData: this._extractPolarData(link)
    };
  }

  /**
   * Extract link coordinates for path calculation
   * @private
   */
  _extractLinkCoordinates(link) {
    return {
      source: {
        x: link.source.x,
        y: link.source.y,
        angle: link.source.angle,
        radius: link.source.radius
      },
      target: {
        x: link.target.x,
        y: link.target.y,
        angle: link.target.angle,
        radius: link.target.radius
      }
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
        radius: link.source.radius
      },
      target: {
        angle: link.target.angle,
        radius: link.target.radius
      }
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
  return Number.isFinite(node.x) && Number.isFinite(node.y);
}
