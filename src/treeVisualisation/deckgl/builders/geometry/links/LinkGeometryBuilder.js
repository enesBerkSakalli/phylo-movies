/**
 * LinkGeometryBuilder - Generates path geometry for tree branches
 * Handles arc + radial line paths for phylogenetic tree visualization
 */
import { calculateBranchCoordinates } from '../../../../layout/RadialTreeGeometry.js';
import { twoPointFloat32Path } from '../../../utils/pathFormat.js';

/** Default number of segments for arc generation */
export const ARC_SEGMENT_COUNT = 15;
export const LINK_GEOMETRY_MODES = Object.freeze({
  RADIAL_ELBOW: 'radial-elbow',
  STRAIGHT: 'straight',
});

export function normalizeLinkGeometryMode(mode) {
  return mode === LINK_GEOMETRY_MODES.STRAIGHT
    ? LINK_GEOMETRY_MODES.STRAIGHT
    : LINK_GEOMETRY_MODES.RADIAL_ELBOW;
}

export class LinkGeometryBuilder {
  constructor(options = {}) {
    const config = typeof options === 'number' ? { segmentCount: options } : options;
    this.segmentCount = Number.isFinite(config.segmentCount)
      ? Math.max(1, Math.floor(config.segmentCount))
      : ARC_SEGMENT_COUNT;
    this.geometryMode = normalizeLinkGeometryMode(config.geometryMode);
  }

  /**
   * Create link path using radialTreeGeometry.js for proper curved branches.
   * Generates a smooth arc by sampling points.
   * @param {Object} linkData - Link data with source/target coordinates
   * @param {number} segmentCount - Number of arc segments
   * @returns {Float32Array} Flat XYZ path points
   */
  createLinkPath(linkData, options = {}) {
    const config = typeof options === 'number' ? { segmentCount: options } : options;
    const segmentCount = Number.isFinite(config.segmentCount)
      ? Math.max(1, Math.floor(config.segmentCount))
      : this.segmentCount;
    const geometryMode = normalizeLinkGeometryMode(config.geometryMode || this.geometryMode);

    if (geometryMode === LINK_GEOMETRY_MODES.STRAIGHT) {
      return this._createDirectPath(linkData);
    }

    if (!hasFinitePolarEndpoint(linkData.source) || !hasFinitePolarEndpoint(linkData.target)) {
      return new Float32Array(0);
    }

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
    return twoPointFloat32Path(
      [branchCoords.movePoint.x, branchCoords.movePoint.y, 0],
      [branchCoords.lineEndPoint.x, branchCoords.lineEndPoint.y, 0]
    );
  }

  _createDirectPath(linkData) {
    const source = linkData?.source || {};
    const target = linkData?.target || {};
    return twoPointFloat32Path(
      [
        finiteCoordinate(source.x, source.radius * Math.cos(source.angle)),
        finiteCoordinate(source.y, source.radius * Math.sin(source.angle)),
        0,
      ],
      [
        finiteCoordinate(target.x, target.radius * Math.cos(target.angle)),
        finiteCoordinate(target.y, target.radius * Math.sin(target.angle)),
        0,
      ]
    );
  }

  /**
   * Create curved path with arc segments
   * @private
   */
  _createCurvedPath(branchCoords, segmentCount) {
    const { radius, startAngle, endAngle, angleDiff, center } = branchCoords.arcProperties;
    const path = new Float32Array((segmentCount + 3) * 3);
    let offset = 0;

    path[offset++] = branchCoords.movePoint.x;
    path[offset++] = branchCoords.movePoint.y;
    path[offset++] = 0;

    const delta = Number.isFinite(angleDiff) ? angleDiff : endAngle - startAngle;

    for (let i = 0; i <= segmentCount; i++) {
      const t = i / segmentCount;
      const angle = startAngle + delta * t;
      path[offset++] = center.x + radius * Math.cos(angle);
      path[offset++] = center.y + radius * Math.sin(angle);
      path[offset++] = 0;
    }

    path[offset++] = branchCoords.lineEndPoint.x;
    path[offset++] = branchCoords.lineEndPoint.y;
    path[offset] = 0;

    return path;
  }

  /**
   * Set segment count for arc generation
   * @param {number} count - Number of segments
   */
  setSegmentCount(count) {
    this.segmentCount = Math.max(1, Math.floor(count));
  }
}

function finiteCoordinate(value, fallback = 0) {
  return Number.isFinite(value) ? value : Number.isFinite(fallback) ? fallback : 0;
}

function hasFinitePolarEndpoint(endpoint) {
  return Number.isFinite(endpoint?.angle) && Number.isFinite(endpoint?.radius);
}
