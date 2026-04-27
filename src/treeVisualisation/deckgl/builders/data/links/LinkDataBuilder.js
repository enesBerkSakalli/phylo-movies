/**
 * LinkDataBuilder - Builds link data objects from D3 hierarchy
 * Handles conversion of D3 links to Deck.gl layer format
 */
import { getLinkKey, getNodeKey } from '../../../../utils/KeyGenerator.js';
import { LinkGeometryBuilder } from '../../geometry/links/LinkGeometryBuilder.js';

export class LinkDataBuilder {
  constructor() {
    this.geometryBuilder = new LinkGeometryBuilder();
  }

  /**
   * Convert links from D3 hierarchy to Deck.gl format
   * @param {Object} tree - D3 hierarchy tree
   * @returns {Array} Array of link data objects
   */
  convertLinks(tree) {
    return tree.links()
      .map(link => this.createLinkData(link))
      .filter(Boolean);
  }

  /**
   * Create link data object from D3 hierarchy link
   * @param {Object} link - D3 hierarchy link with source/target
   * @returns {Object} Link data for Deck.gl
   */
  createLinkData(link) {
    if (!hasFiniteCoordinates(link?.source) || !hasFiniteCoordinates(link?.target)) {
      console.warn('[LinkDataBuilder] Skipping link with invalid layout coordinates:', link?.target?.data?.split_indices);
      return null;
    }

    const linkData = this._extractLinkCoordinates(link);
    const linkPath = this.geometryBuilder.createLinkPath(linkData);
    const linkKey = getLinkKey(link);
    const sourceId = getNodeKey(link.source);
    const targetId = getNodeKey(link.target);
    if (!linkKey || !sourceId || !targetId) {
      console.warn('[LinkDataBuilder] Skipping link without split_indices:', link?.target?.data?.name);
      return null;
    }

    return {
      id: linkKey,
      depth: link.target.depth, // Depth for elongation-based cascade timing
      sourcePosition: [link.source.x, link.source.y, 0],
      targetPosition: [link.target.x, link.target.y, 0],
      path: linkPath,
      source: link.source,
      target: link.target,
      // Stable IDs for endpoints to enable subtree-aware interpolation
      sourceId,
      targetId,
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
        angle: link.source.rotatedAngle != null ? link.source.rotatedAngle : link.source.angle,
        radius: link.source.radius
      },
      target: {
        x: link.target.x,
        y: link.target.y,
        angle: link.target.rotatedAngle != null ? link.target.rotatedAngle : link.target.angle,
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
        angle: link.source.rotatedAngle != null ? link.source.rotatedAngle : link.source.angle,
        radius: link.source.radius
      },
      target: {
        angle: link.target.rotatedAngle != null ? link.target.rotatedAngle : link.target.angle,
        radius: link.target.radius
      }
    };
  }
}

function hasFiniteCoordinates(node) {
  return Number.isFinite(node?.x) && Number.isFinite(node?.y);
}
