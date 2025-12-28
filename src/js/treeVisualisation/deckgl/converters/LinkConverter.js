import { getLinkKey, getNodeKey } from '../../utils/KeyGenerator.js';
import { calculateBranchCoordinates } from '../../layout/RadialTreeGeometry.js';
import { ARC_SEGMENT_COUNT } from '../interpolation/PathInterpolator.js';

/**
 * Handles conversion of D3 hierarchy links to Deck.gl layer format
 * Manages link path generation and polar coordinate extraction
 */
export class LinkConverter {
  constructor() {
    // Cache removed - was not being used effectively
  }

  /**
   * Convert links from D3 hierarchy to Deck.gl format
   */
  convertLinks(tree) {
    return tree.links().map(link => this.createLinkData(link));
  }

  /**
   * Create link data object from D3 hierarchy link
   */
  createLinkData(link) {
    if (this._hasInvalidLinkCoordinates(link)) {
      console.warn('[LinkConverter] Found NaN link coordinates:', link);
      return this._createInvalidLinkData(link);
    }

    const linkData = this._extractLinkCoordinates(link);
    const linkPath = this.createLinkPath(linkData);

    return {
      id: getLinkKey(link),
      sourcePosition: [link.source.x, link.source.y, 0],
      targetPosition: [link.target.x, link.target.y, 0],
      path: linkPath,
      source: link.source,
      target: link.target,
      // Stable IDs for endpoints to enable subtree-aware interpolation
      sourceId: getNodeKey(link.source),
      targetId: getNodeKey(link.target),
      sourceGlobalId: (link.source?.data?.guid || link.source?.data?.id || link.source?.data?.name) ?
        `stable-${String(link.source.data.guid || link.source.data.id || link.source.data.name).replace(/[^a-zA-Z0-9-_]/g, '_')}` : getNodeKey(link.source),
      targetGlobalId: (link.target?.data?.guid || link.target?.data?.id || link.target?.data?.name) ?
        `stable-${String(link.target.data.guid || link.target.data.id || link.target.data.name).replace(/[^a-zA-Z0-9-_]/g, '_')}` : getNodeKey(link.target),
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

  /**
   * Create link data for invalid coordinates
   * @private
   */
  _createInvalidLinkData(link) {
    return {
      id: getLinkKey(link),
      sourcePosition: [0, 0, 0],
      targetPosition: [0, 0, 0],
      path: [[0, 0, 0], [0, 0, 0]],
      source: link.source,
      target: link.target,
      hasInvalidPosition: true
    };
  }

  /**
   * Check if link has invalid coordinates
   * @private
   */
  _hasInvalidLinkCoordinates(link) {
    return isNaN(link.source.x) || isNaN(link.source.y) ||
           isNaN(link.target.x) || isNaN(link.target.y);
  }

  /**
   * Create link path using radialTreeGeometry.js for proper curved branches.
   * This version generates a smooth arc by sampling points.
   */
  createLinkPath(link, segmentCount = ARC_SEGMENT_COUNT) {
    const branchCoords = calculateBranchCoordinates(link);

    if (branchCoords.arcProperties === null) {
      return this._createStraightPath(branchCoords);
    }

    return this._createCurvedPath(branchCoords, segmentCount);
  }

  /**
   * Create straight line path
   * @private
   */
  _createStraightPath(branchCoords) {
    return [
      [branchCoords.movePoint.x, branchCoords.movePoint.y, 0],
      [branchCoords.lineEndPoint.x, branchCoords.lineEndPoint.y, 0]
    ];
  }

  /**
   * Create curved path with arc segments
   * @private
   */
  _createCurvedPath(branchCoords, segmentCount) {
    const points = [];
    const { radius, startAngle, endAngle, center } = branchCoords.arcProperties;

    // Start with move point (source position)
    points.push([branchCoords.movePoint.x, branchCoords.movePoint.y, 0]);

    // Generate arc segment points
    points.push(...this._generateArcPoints(radius, startAngle, endAngle, center, segmentCount));

    // Add the final line endpoint
    points.push([branchCoords.lineEndPoint.x, branchCoords.lineEndPoint.y, 0]);

    return points;
  }

  /**
   * Generate points along an arc
   * @private
   */
  _generateArcPoints(radius, startAngle, endAngle, center, segmentCount) {
    const points = [];

    for (let i = 0; i <= segmentCount; i++) {
      const t = i / segmentCount;
      const angle = startAngle + (endAngle - startAngle) * t;
      const x = center.x + radius * Math.cos(angle);
      const y = center.y + radius * Math.sin(angle);
      points.push([x, y, 0]);
    }

    return points;
  }
}
