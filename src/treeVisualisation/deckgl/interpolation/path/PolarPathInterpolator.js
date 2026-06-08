/**
 * PolarPathInterpolator - Interpolates paths using polar coordinates
 * Used for animating tree branches and extensions in radial layouts
 */
import { crossesAngle, longArcDelta } from '../../../../domain/math/mathUtils.js';
import {
  LINK_GEOMETRY_MODES,
  normalizeLinkGeometryMode,
} from '../../builders/geometry/links/LinkGeometryBuilder.js';
import { rootAwareAngleDelta } from '../../../utils/polarGeometry.js';
import { measureFrameStep } from '../../../performance/frameInstrumentation.js';

const ANIMATED_ARC_SEGMENT_COUNT = 10;
const ANGLE_TOLERANCE = 0.001; // ~0.06 degrees

export class PolarPathInterpolator {
  constructor() {
    this.segmentCount = ANIMATED_ARC_SEGMENT_COUNT;
    // Root angle (where tree root is positioned) - default 0
    this._rootAngle = 0;
    // Optional per-key Float32Array pool. When a caller passes a stable
    // `pathPoolKey` (e.g. a link/extension id), the path buffer for that key is
    // reused across frames instead of reallocated, cutting per-frame garbage.
    //
    // Safety: each key owns a distinct buffer, so paths within one frame never
    // alias. deck.gl PathLayer repacks paths into its own GPU buffer during the
    // synchronous layer update (getPath updateTrigger fires every frame because
    // the `links` array identity changes), so the previous frame's contents are
    // already consumed before we overwrite them on the next frame.
    this._pathBufferPool = new Map();
  }

  /**
   * Clear the path buffer pool. Call when the dataset/tree set changes so stale
   * keys do not retain buffers.
   */
  resetPathBufferPool() {
    this._pathBufferPool.clear();
  }

  /**
   * Get a pooled Float32Array of exactly `length` for `key`, or null if pooling
   * is disabled (no key). Reallocates if the cached buffer length differs.
   * @private
   */
  _acquirePathBuffer(key, length) {
    if (key === undefined || key === null) return null;
    const existing = this._pathBufferPool.get(key);
    if (existing && existing.length === length) return existing;
    const buffer = new Float32Array(length);
    this._pathBufferPool.set(key, buffer);
    return buffer;
  }

  /**
   * Set the root angle for crossing detection
   * @param {number} angle - Root angle in radians (default 0)
   */
  setRootAngle(angle) {
    this._rootAngle = angle ?? 0;
  }

  /**
   * Interpolate between two link states using polar coordinates
   * @param {Object} fromLink - Source link data with polarData
   * @param {Object} toLink - Target link data with polarData
   * @param {number} timeFactor - Interpolation factor (0-1)
   * @returns {Float32Array} Interpolated path points
   * @throws {Error} If polarData is missing
   */
  interpolatePath(fromLink, toLink, timeFactor, options = {}) {
    return this.createPathFromPolarData(
      this.interpolatePolarData(fromLink, toLink, timeFactor, options),
      options
    );
  }

  /**
   * Interpolate endpoint polar metadata without writing path geometry.
   * @param {Object} fromLink - Source link data with polarData
   * @param {Object} toLink - Target link data with polarData
   * @param {number} timeFactor - Interpolation factor (0-1)
   * @param {Object} options - { velocityEntry, targetRadiusOverride }
   * @returns {{source: {angle: number, radius: number}, target: {angle: number, radius: number}}}
   */
  interpolatePolarData(fromLink, toLink, timeFactor, options = {}) {
    // Fail-fast: polar data is required
    if (!fromLink?.polarData || !toLink?.polarData) {
      throw new Error(`Missing polarData for link interpolation: ${toLink?.id ?? fromLink?.id}`);
    }

    const t = Math.max(0, Math.min(1, timeFactor));
    const velocityEntry = options?.velocityEntry ?? null;
    const angularT = velocityEntry?.angularT ?? t;

    // Get source angles
    const fromSourceAngle = fromLink.polarData.source.angle;
    const toSourceAngle = toLink.polarData.source.angle;

    // Get target angles
    const fromTargetAngle = fromLink.polarData.target.angle;
    const toTargetAngle = toLink.polarData.target.angle;

    // Calculate deltas that avoid crossing the root
    const sourceDelta = rootAwareAngleDelta(fromSourceAngle, toSourceAngle, this._rootAngle);
    const targetDelta = rootAwareAngleDelta(fromTargetAngle, toTargetAngle, this._rootAngle);

    // Calculate interpolated angles (use angularT)
    const interpSourceAngle = fromSourceAngle + sourceDelta * angularT;
    const interpTargetAngle = fromTargetAngle + targetDelta * angularT;

    // Interpolate radii on the base eased timeline.
    const interpSourceRadius =
      fromLink.polarData.source.radius +
      (toLink.polarData.source.radius - fromLink.polarData.source.radius) * t;
    const interpTargetRadius =
      fromLink.polarData.target.radius +
      (toLink.polarData.target.radius - fromLink.polarData.target.radius) * t;

    return {
      source: {
        angle: interpSourceAngle,
        radius: interpSourceRadius,
      },
      target: {
        angle: interpTargetAngle,
        radius: Number.isFinite(options?.targetRadiusOverride)
          ? options.targetRadiusOverride
          : interpTargetRadius,
      },
    };
  }

  /**
   * Create a path from already-resolved polar endpoints.
   * Use this when the caller has already interpolated source/target positions,
   * avoiding the full from/to interpolation setup in interpolatePath().
   *
   * @param {Object} polarData - { source: {angle, radius}, target: {angle, radius} }
   * @param {Object} options - { linkGeometryMode, pathPoolKey }
   * @returns {Float32Array} Flat XYZ path points
   */
  createPathFromPolarData(polarData, options = {}) {
    if (!polarData?.source || !polarData?.target) {
      throw new Error('Missing polarData for resolved path creation');
    }

    const pathPoolKey = options.pathPoolKey ?? null;
    const sourceAngle = polarData.source.angle;
    const sourceRadius = polarData.source.radius;
    const targetAngle = polarData.target.angle;
    const targetRadius = polarData.target.radius;

    if (normalizeLinkGeometryMode(options.linkGeometryMode) === LINK_GEOMETRY_MODES.STRAIGHT) {
      return this._writePolarStraightPath(
        pathPoolKey,
        sourceAngle,
        sourceRadius,
        targetAngle,
        targetRadius
      );
    }

    return measureFrameStep('path.coordinatesToPath', () =>
      this._writeRadialElbowPath(pathPoolKey, sourceAngle, sourceRadius, targetAngle, targetRadius)
    );
  }

  /**
   * Write a direct source-target line into a flat path array.
   * @private
   */
  _writeStraightPath(pathPoolKey, sourceX, sourceY, targetX, targetY) {
    if (!hasFinitePoint(sourceX, sourceY) || !hasFinitePoint(targetX, targetY)) {
      return emptyPath();
    }

    const result = this._acquirePathBuffer(pathPoolKey, 6) ?? new Float32Array(6);
    result[0] = sourceX;
    result[1] = sourceY;
    result[2] = 0;
    result[3] = targetX;
    result[4] = targetY;
    result[5] = 0;
    return result;
  }

  /**
   * Write a direct source-target line from polar endpoints.
   * @private
   */
  _writePolarStraightPath(pathPoolKey, sourceAngle, sourceRadius, targetAngle, targetRadius) {
    return this._writeStraightPath(
      pathPoolKey,
      sourceRadius * Math.cos(sourceAngle),
      sourceRadius * Math.sin(sourceAngle),
      targetRadius * Math.cos(targetAngle),
      targetRadius * Math.sin(targetAngle)
    );
  }

  /**
   * Write the radial-elbow branch geometry directly into a flat path array.
   * The path shape is: source point, fixed-count angular arc at source radius,
   * then radial target point.
   * @private
   */
  _writeRadialElbowPath(pathPoolKey, sourceAngle, sourceRadius, targetAngle, targetRadius) {
    if (
      !hasFinitePolarEndpoint(sourceAngle, sourceRadius) ||
      !hasFinitePolarEndpoint(targetAngle, targetRadius)
    ) {
      return emptyPath();
    }

    const sourceX = sourceRadius * Math.cos(sourceAngle);
    const sourceY = sourceRadius * Math.sin(sourceAngle);
    const targetX = targetRadius * Math.cos(targetAngle);
    const targetY = targetRadius * Math.sin(targetAngle);
    let angleDiff = signedShortestAngle(sourceAngle, targetAngle);

    if (Math.abs(angleDiff) < ANGLE_TOLERANCE) {
      return this._writeStraightPath(pathPoolKey, sourceX, sourceY, targetX, targetY);
    }

    // If the generated elbow would cut through the root gap, take the long arc.
    if (crossesAngle(sourceAngle, sourceAngle + angleDiff, this._rootAngle)) {
      angleDiff = longArcDelta(angleDiff);
    }

    const segmentCount = this.segmentCount;
    const totalPoints = segmentCount + 2;
    const result =
      this._acquirePathBuffer(pathPoolKey, totalPoints * 3) ?? new Float32Array(totalPoints * 3);

    result[0] = sourceX;
    result[1] = sourceY;
    result[2] = 0;

    for (let i = 1; i <= segmentCount; i++) {
      const t = i / segmentCount;
      const angle = sourceAngle + angleDiff * t;
      const idx = i * 3;
      result[idx] = sourceRadius * Math.cos(angle);
      result[idx + 1] = sourceRadius * Math.sin(angle);
      result[idx + 2] = 0;
    }

    const arcEndIdx = segmentCount * 3;
    result[arcEndIdx] = sourceRadius * Math.cos(targetAngle);
    result[arcEndIdx + 1] = sourceRadius * Math.sin(targetAngle);

    const lastIdx = (totalPoints - 1) * 3;
    result[lastIdx] = targetX;
    result[lastIdx + 1] = targetY;
    result[lastIdx + 2] = 0;

    return result;
  }

  /**
   * Set segment count for arc generation
   */
  setSegmentCount(count) {
    this.segmentCount = Math.max(4, Math.floor(count) || ANIMATED_ARC_SEGMENT_COUNT);
  }
}

function signedShortestAngle(from, to) {
  const tau = Math.PI * 2;
  let delta = (to - from) % tau;
  if (delta > Math.PI) delta -= tau;
  if (delta <= -Math.PI) delta += tau;
  return delta;
}

function hasFinitePolarEndpoint(angle, radius) {
  return Number.isFinite(angle) && Number.isFinite(radius);
}

function hasFinitePoint(x, y) {
  return Number.isFinite(x) && Number.isFinite(y);
}

function emptyPath() {
  return new Float32Array(0);
}
