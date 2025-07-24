// geometry/TubeGeometryFactory.js
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Analytic 3D circular arc used by CurvePath mode */
class ArcCurve3D extends THREE.Curve {
  constructor(center, radius, a0, a1) {
    super();
    this.center = new THREE.Vector3(center.x, center.y, center.z || 0);
    this.radius = radius;
    this.a0 = a0;
    this.a1 = a1;
  }
  getPoint(t, target = new THREE.Vector3()) {
    const a = this.a0 + (this.a1 - this.a0) * t;
    return target.set(
      this.center.x + Math.cos(a) * this.radius,
      this.center.y + Math.sin(a) * this.radius,
      this.center.z
    );
  }
}

export class TubeGeometryFactory {
  constructor(defaultOptions = {}) {
    this.cache = new Map();
    this.defaults = {
      sampleStep: 1,
      radialStep: 1,
      minTubularSegments: 32,
      minRadialSegments: 16,
      closed: false,
      pathMode: 'catmull',          // 'catmull' | 'curvepath'
      cacheGeometries: true,
      fixedTubularSegments: undefined,
      fixedRadialSegments: undefined,
      fixedArcSegments: undefined,
      layoutVersion: 0,
      epsilonRadius: 1e-4,          // clamp radius to avoid zero
      useCylinderForPureLines: false, // optional fast path for straight segments
      ...defaultOptions,
    };
  }

  /* ------------------------------------------------------------------ */
  /* PUBLIC: standard tube                                              */
  /* ------------------------------------------------------------------ */
  createTubeFromCoordinates = (coordinates, radius = 2, options = {}) => {
    const opts = { ...this.defaults, ...options };
    const norm = this._normalizeCoordinates(coordinates);
    if (!norm) return this.createFallback(radius);

    // Never allow zero radius
    radius = Math.max(radius, opts.epsilonRadius);

    const cacheKey = this._cacheKey(norm, radius, opts);
    if (opts.cacheGeometries && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey).clone();
    }

    try {
      // Use cylinder geometry for straight lines if the option is enabled
      if (opts.useCylinderForPureLines && this._isPureStraight(norm)) {
        const { movePoint, lineEndPoint } = norm;
        const p0 = new THREE.Vector3(movePoint.x, movePoint.y, movePoint.z);
        const p1 = new THREE.Vector3(lineEndPoint.x, lineEndPoint.y, lineEndPoint.z);
        const cyl = this._buildCylinderBetween(p0, p1, radius, opts);
        if (opts.cacheGeometries) this.cache.set(cacheKey, cyl.clone());
        return cyl;
      }

      const curve = this._makeCurve(norm, opts);
      if (!curve) return this.createFallback(radius);

      const { tubularSegments, radialSegments } = this._segmentCounts(curve, radius, opts);
      const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, opts.closed);

      if (opts.cacheGeometries) this.cache.set(cacheKey, geometry.clone());
      return geometry;
    } catch (err) {
      console.error('[TubeGeometryFactory] Error creating tube:', err);
      return this.createFallback(radius);
    }
  };



  /* ------------------------------------------------------------------ */
  /* Utils                                                              */
  /* ------------------------------------------------------------------ */

  createFallback = (radius = 2) => {
    radius = Math.max(radius, this.defaults.epsilonRadius);
    const start = new THREE.Vector3(0, 0, 0);
    const end   = new THREE.Vector3(100, 0, 0);
    const curve = new THREE.LineCurve3(start, end);
    return new THREE.TubeGeometry(curve, 8, radius, 12);
  };

  clearCache = () => {
    this.cache.forEach(g => g.dispose());
    this.cache.clear();
  };

  dispose = () => {
    this.clearCache();
    this.cache = null;
  };

  /* ------------------------------------------------------------------ */
  /* Internal helpers                                                    */
  /* ------------------------------------------------------------------ */

  _cacheKey(norm, radius, opts) {
    return `${opts.layoutVersion}_${JSON.stringify(norm)}_${radius}_${
      opts.sampleStep}_${opts.radialStep}_${opts.pathMode}_${
      opts.fixedTubularSegments}_${opts.fixedRadialSegments}_${opts.fixedArcSegments}_${
      opts.epsilonRadius}`;
  }

  _normalizeCoordinates = (c) => {
    if (!c || !c.movePoint) return null;
    const fix = (p) => (p ? { x: p.x, y: p.y, z: p.z ?? 0 } : undefined);

    const mp = fix(c.movePoint);
    if (!mp || !isFinite(mp.x) || !isFinite(mp.y)) return null;

    return {
      movePoint: mp,
      arcEndPoint: fix(c.arcEndPoint),
      lineEndPoint: fix(c.lineEndPoint),
      arcProperties: c.arcProperties ?? null
    };
  };

  _makeCurve(norm, opts) {
    if (opts.pathMode === 'curvepath') return this._buildExactPath(norm);

    const pts = this.generateContinuousPathPoints(norm, opts);
    if (pts.length < 2) {
      // fabricate a tiny segment
      const p = pts[0] ?? new THREE.Vector3(0,0,0);
      const q = p.clone().addScalar(opts.epsilonRadius);
      pts.push(q);
    }
    return this._buildCurve(pts, opts);
  }

  _segmentCounts(curve, radius, opts) {
    const length = curve.getLength();
    return {
      tubularSegments: opts.fixedTubularSegments ??
        Math.max(opts.minTubularSegments, Math.ceil(length / opts.sampleStep)),
      radialSegments: opts.fixedRadialSegments ??
        Math.max(opts.minRadialSegments, Math.ceil((2 * Math.PI * radius) / opts.radialStep))
    };
  }

  /**
   * More robust check to see if we should draw an arc.
   * @param {Object} arcProps The arcProperties object.
   * @returns {boolean}
   */
  _shouldDrawArc(arcProps) {
    if (!arcProps) return false;
    // A valid arc needs a radius greater than zero and a non-zero angle difference.
    return typeof arcProps.radius === 'number' &&
           arcProps.radius > 1e-6 &&
           typeof arcProps.angleDiff === 'number' &&
           Math.abs(arcProps.angleDiff) > 1e-6;
  }

  generateContinuousPathPoints = (coordinates, opts) => {
    const { movePoint, arcEndPoint, lineEndPoint, arcProperties } = coordinates;
    const points = [];
    points.push(new THREE.Vector3(movePoint.x, movePoint.y, movePoint.z));

    // Use the more robust check to decide if we should generate arc points.
    if (this._shouldDrawArc(arcProperties)) {
      const { radius: arcRadius, startAngle, angleDiff, center = { x: 0, y: 0, z: 0 } } = arcProperties;

      const arcLength   = Math.abs(angleDiff) * arcRadius;
      const arcSegments = opts.fixedArcSegments ??
        Math.max(8, Math.ceil(arcLength / opts.sampleStep));

      for (let i = 1; i <= arcSegments; i++) {
        const t = i / arcSegments;
        const angle = startAngle + angleDiff * t;
        points.push(new THREE.Vector3(
          center.x + arcRadius * Math.cos(angle),
          center.y + arcRadius * Math.sin(angle),
          center.z
        ));
      }

      if (arcEndPoint && this.pointsAreDifferent(points[points.length - 1], arcEndPoint, 1e-8)) {
        points.push(new THREE.Vector3(arcEndPoint.x, arcEndPoint.y, arcEndPoint.z));
      }
    }

    if (lineEndPoint) {
      const last = points[points.length - 1];
      if (this.pointsAreDifferent(last, lineEndPoint, 1e-8)) {
        points.push(new THREE.Vector3(lineEndPoint.x, lineEndPoint.y, lineEndPoint.z));
      }
    }

    return points;
  };

  pointsAreDifferent = (p1, p2, tol = 1e-8) =>
    Math.abs(p1.x - p2.x) > tol ||
    Math.abs(p1.y - p2.y) > tol ||
    Math.abs(p1.z - p2.z) > tol;

  _buildCurve = (points, opts) => {
    if (!points || points.length < 2) return null;
    if (opts.pathMode === 'catmull') {
      return new THREE.CatmullRomCurve3(points, opts.closed, 'centripetal', 0);
    }
    const path = new THREE.CurvePath();
    for (let i = 0; i < points.length - 1; i++) {
      path.add(new THREE.LineCurve3(points[i], points[i + 1]));
    }
    return path;
  };

  _buildExactPath = (coordinates) => {
    const { movePoint, arcEndPoint, lineEndPoint, arcProperties } = coordinates;
    if (!movePoint) return null;

    const path = new THREE.CurvePath();
    const moveVec = new THREE.Vector3(movePoint.x, movePoint.y, movePoint.z);

    // Use the more robust check here as well.
    if (this._shouldDrawArc(arcProperties)) {
      const { radius, startAngle, endAngle, center = { x: 0, y: 0, z: 0 } } = arcProperties;

      const arcStart = new THREE.Vector3(
        center.x + Math.cos(startAngle) * radius,
        center.y + Math.sin(startAngle) * radius,
        center.z
      );
      const arcEnd = new THREE.Vector3(
        center.x + Math.cos(endAngle) * radius,
        center.y + Math.sin(endAngle) * radius,
        center.z
      );

      if (this.pointsAreDifferent(moveVec, arcStart, 1e-8)) {
        path.add(new THREE.LineCurve3(moveVec, arcStart));
      }

      path.add(new ArcCurve3D(center, radius, startAngle, endAngle));

      if (lineEndPoint) {
        const lineVec = new THREE.Vector3(lineEndPoint.x, lineEndPoint.y, lineEndPoint.z);
        if (this.pointsAreDifferent(arcEnd, lineVec, 1e-8)) {
          path.add(new THREE.LineCurve3(arcEnd, lineVec));
        }
      } else if (arcEndPoint) {
        const arcEndVec = new THREE.Vector3(arcEndPoint.x, arcEndPoint.y, arcEndPoint.z);
        if (this.pointsAreDifferent(arcEnd, arcEndVec, 1e-8)) {
          path.add(new THREE.LineCurve3(arcEnd, arcEndVec));
        }
      }
    } else if (lineEndPoint) {
      // Pure straight line case
      const lineVec = new THREE.Vector3(lineEndPoint.x, lineEndPoint.y, lineEndPoint.z);
      if (this.pointsAreDifferent(moveVec, lineVec, 1e-8)) {
        path.add(new THREE.LineCurve3(moveVec, lineVec));
      }
    }

    return path;
  };

  /**
   * Custom Tube builder with radiusFn(u)
   * Adapted from THREE.TubeGeometry
   */
  _buildTubeGeometryWithRadiusFn(path, tubularSegments, radialSegments, radiusFn, closed) {
    const frames   = path.computeFrenetFrames(tubularSegments, closed);
    const tangents = frames.tangents;
    const normals  = frames.normals;
    const binormals= frames.binormals;

    const vertices = [];
    const normalsArr = [];
    const uvs = [];
    const indices = [];

    const PI2 = Math.PI * 2;

    for (let i = 0; i <= tubularSegments; i++) {
      const u = i / tubularSegments;
      const pos = path.getPointAt(u);
      const r = radiusFn ? radiusFn(u) : 1;

      const N = normals[i];
      const B = binormals[i];

      for (let j = 0; j <= radialSegments; j++) {
        const v = j / radialSegments * PI2;
        const cx = -r * Math.cos(v); // match TubeGeometry’s handedness
        const cy =  r * Math.sin(v);

        // position
        const posX = pos.x + cx * N.x + cy * B.x;
        const posY = pos.y + cx * N.y + cy * B.y;
        const posZ = pos.z + cx * N.z + cy * B.z;
        vertices.push(posX, posY, posZ);

        // normal
        const normal = new THREE.Vector3(cx * N.x + cy * B.x, cx * N.y + cy * B.y, cx * N.z + cy * B.z).normalize();
        normalsArr.push(normal.x, normal.y, normal.z);

        // uv
        uvs.push(u, j / radialSegments);
      }
    }

    for (let i = 0; i < tubularSegments; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const a = (radialSegments + 1) * i + j;
        const b = (radialSegments + 1) * (i + 1) + j;
        const c = (radialSegments + 1) * (i + 1) + j + 1;
        const d = (radialSegments + 1) * i + j + 1;

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal',   new THREE.Float32BufferAttribute(normalsArr, 3));
    geometry.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));

    geometry.parameters = {
      path,
      tubularSegments,
      radialSegments,
      closed
    };

    return geometry;
  }

  /* ------------------------ Straight-line cylinder ------------------------ */

  _isPureStraight(norm) {
    // A pure straight line has no arc properties and a distinct line end point.
    if (this._shouldDrawArc(norm.arcProperties)) return false;
    if (!norm.lineEndPoint) return false;

    const p0 = new THREE.Vector3(norm.movePoint.x, norm.movePoint.y, norm.movePoint.z);
    const p1 = new THREE.Vector3(norm.lineEndPoint.x, norm.lineEndPoint.y, norm.lineEndPoint.z);
    return this.pointsAreDifferent(p0, p1, 1e-8);
  }

  _buildCylinderBetween(p0, p1, radius, opts) {
    // Build cylinder of given radius between p0 and p1
    const dir = new THREE.Vector3().subVectors(p1, p0);
    const length = dir.length();
    if (length < opts.epsilonRadius) {
      // fallback tiny tube if same point
      const curve = new THREE.LineCurve3(p0, p0.clone().addScalar(opts.epsilonRadius));
      return new THREE.TubeGeometry(curve, 2, radius, 8, false);
    }

    const radialSegments = opts.fixedRadialSegments ??
      Math.max(opts.minRadialSegments, Math.ceil((2 * Math.PI * radius) / opts.radialStep));
    const geometry = new THREE.CylinderGeometry(radius, radius, length, radialSegments, 1, true);

    // Align cylinder: default cylinder axis is Y. We want it along dir.
    geometry.translate(0, length / 2, 0); // move base to origin->top
    const quat = new THREE.Quaternion();
    quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    geometry.applyQuaternion(quat);
    geometry.translate(p0.x, p0.y, p0.z);

    geometry.computeVertexNormals();
    geometry.parameters = {
      tubularSegments: 1,
      radialSegments,
      closed: false
    };
    return geometry;
  }
}
