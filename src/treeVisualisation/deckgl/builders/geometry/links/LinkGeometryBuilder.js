/**
 * LinkGeometryBuilder - Generates path geometry for tree branches
 * Handles arc + radial line paths for phylogenetic tree visualization
 */
import { calculateBranchCoordinates } from '../../../../layout/RadialTreeGeometry.js';

/** Default number of segments for arc generation */
export const ARC_SEGMENT_COUNT = 15;

export class LinkGeometryBuilder {
  constructor(segmentCount = ARC_SEGMENT_COUNT) {
    this.segmentCount = segmentCount;
  }

  /**
   * Create link path using radialTreeGeometry.js for proper curved branches.
   * Generates a smooth arc by sampling points.
   * @param {Object} linkData - Link data with source/target coordinates
   * @param {number} segmentCount - Number of arc segments
   * @returns {Array} Path points array
   */
  createLinkPath(linkData, segmentCount = this.segmentCount) {
    const branchCoords = calculateBranchCoordinates(linkData);

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
    const { radius, startAngle, endAngle, angleDiff, center } = branchCoords.arcProperties;

    // Start with move point (source position)
    points.push([branchCoords.movePoint.x, branchCoords.movePoint.y, 0]);

    // Generate arc segment points
    points.push(...this._generateArcPoints(radius, startAngle, endAngle, angleDiff, center, segmentCount));

    // Add the final line endpoint
    points.push([branchCoords.lineEndPoint.x, branchCoords.lineEndPoint.y, 0]);

    return points;
  }

  /**
   * Generate points along an arc
   * @private
   */
  _generateArcPoints(radius, startAngle, endAngle, angleDiff, center, segmentCount) {
    const points = [];
    const delta = Number.isFinite(angleDiff) ? angleDiff : (endAngle - startAngle);

    for (let i = 0; i <= segmentCount; i++) {
      const t = i / segmentCount;
      const angle = startAngle + delta * t;
      const x = center.x + radius * Math.cos(angle);
      const y = center.y + radius * Math.sin(angle);
      points.push([x, y, 0]);
    }

    return points;
  }

  /**
   * Set segment count for arc generation
   * @param {number} count - Number of segments
   */
  setSegmentCount(count) {
    this.segmentCount = Math.max(1, Math.floor(count));
  }

}
