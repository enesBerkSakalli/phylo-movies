// geometry/PolylineGeometryFactory.js
import * as THREE from 'three';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';

/**
 * Same public surface, faster maths & crisper arcs.
 *  - ≥ 16 segments per visible arc (no more jaggies)
 *  - incremental rotation cuts Math.sin/Math.cos calls from O(n) → O(1)
 *  - typed-array pool prevents repeated Float32Array allocs
 *  - in-place geometry update when vertex count is unchanged
 */
export class PolylineGeometryFactory {
  constructor(defaultOptions = {}) {
    this.cache = new Map();          // key ➜ LineGeometry
    this._pool = new Map();          // len ➜ shared Float32Array (flatten buffer)

    this.defaults = {
      sampleStep      : 1,
      fixedArcSegments: undefined,
      cacheGeometries : true,
      epsilon         : 1e-8,
      ...defaultOptions
    };
  }

  /* ─────────────────────────── PUBLIC ─────────────────────────── */

  /** convert analytic coordinates → LineGeometry (with optional cache) */
  createFromCoordinates(coordinates, options = {}, cacheKey) {
    const opts = { ...this.defaults, ...options };
    const norm = this.normalizeCoordinates(coordinates);
    if (!norm) return this._fallback();

    const pts = this.generateContinuousPathPoints(norm, opts);
    return this.createFromPoints(pts, cacheKey, opts);
  }

  /** create geometry straight from THREE.Vector3[] */
  createFromPoints(points, cacheKey, opts = this.defaults) {
    if (!points?.length || points.length < 2) return this._fallback();

    if (opts.cacheGeometries && cacheKey && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const geom = new LineGeometry();
    geom.setPositions(this._flatten(points));

    if (opts.cacheGeometries && cacheKey) this.cache.set(cacheKey, geom);
    return geom;
  }

  /** update an existing geometry’s positions (zero-alloc when possible) */
  updateGeometryPositions(geometry, points) {
    const needLen = points.length * 3;
    const attr    = geometry.getAttribute('position');

    if (attr && attr.array.length === needLen) {
      /* overwrite existing buffer */
      for (let i = 0, j = 0; i < points.length; i++, j += 3) {
        const p = points[i];
        attr.array[j]   = p.x;
        attr.array[j+1] = p.y;
        attr.array[j+2] = p.z || 0;
      }
      attr.needsUpdate = true;
    } else {
      /* vertex count changed – re-allocate */
      geometry.setPositions(this._flatten(points));
    }
  }

  clearCache()          { this.cache.forEach(g => g.dispose()); this.cache.clear(); }
  removeFromCache(k)    { const g = this.cache.get(k); if (g){ g.dispose(); this.cache.delete(k); return true; } return false; }
  dispose()             { this.clearCache(); this.cache = null; this._pool.clear(); }

  /* ──────────────────────── GEOMETRY HELPERS ──────────────────────── */

  normalizeCoordinates(c) {
    if (!c?.movePoint) return null;
    const fix = p => p ? { x:p.x, y:p.y, z:p.z ?? 0 } : undefined;
    const mp  = fix(c.movePoint);
    if (!mp || !isFinite(mp.x) || !isFinite(mp.y)) return null;

    return {
      movePoint   : mp,
      arcEndPoint : fix(c.arcEndPoint),
      lineEndPoint: fix(c.lineEndPoint),
      arcProperties: c.arcProperties ?? null
    };
  }

  generateContinuousPathPoints(coordinates, opts) {
    const { movePoint, arcEndPoint, lineEndPoint, arcProperties } = coordinates;
    const pts = [ new THREE.Vector3(movePoint.x, movePoint.y, movePoint.z) ];

    /* -------- ARC -------- */
    if (this._shouldDrawArc(arcProperties)) {
      const { radius:r, startAngle, angleDiff, center = {x:0,y:0,z:0} } = arcProperties;
      const arcLen = Math.abs(angleDiff) * r;
      /* min 16 segments for visible smoothness */
      const segs   = opts.fixedArcSegments ?? Math.max(16, Math.ceil(arcLen / opts.sampleStep));

      /* incremental rotation – only ONE sin/cos pair */
      const delta  = angleDiff / segs;
      const cosD   = Math.cos(delta);
      const sinD   = Math.sin(delta);

      /* vector from centre → movePoint */
      let vx = movePoint.x - center.x;
      let vy = movePoint.y - center.y;

      for (let i = 1; i <= segs; i++) {
        /* rotate (vx,vy) by delta */
        const nx =  vx * cosD - vy * sinD;
        vy       =  vx * sinD + vy * cosD;
        vx       =  nx;

        pts.push(new THREE.Vector3(center.x + vx, center.y + vy, center.z));
      }

      if (arcEndPoint && this._diff(pts[pts.length-1], arcEndPoint, opts.epsilon)) {
        pts.push(new THREE.Vector3(arcEndPoint.x, arcEndPoint.y, arcEndPoint.z));
      }
    }

    /* -------- STRAIGHT -------- */
    if (lineEndPoint) {
      const last = pts[pts.length-1];
      if (this._diff(last, lineEndPoint, opts.epsilon)) {
        pts.push(new THREE.Vector3(lineEndPoint.x, lineEndPoint.y, lineEndPoint.z));
      }
    }
    return pts;
  }

  /* ───────────────────────── PRIVATE ───────────────────────── */

  _shouldDrawArc(a){ return !!a && a.radius > 1e-6 && Math.abs(a.angleDiff) > 1e-6; }
  _diff(p1,p2,tol){ return Math.abs(p1.x-p2.x)>tol||Math.abs(p1.y-p2.y)>tol||Math.abs((p1.z||0)-(p2.z||0))>tol; }

  /** flatten THREE.Vector3[] → pooled Float32Array */
  _flatten(points) {
    const len = points.length * 3;
    let buf   = this._pool.get(len);
    if (!buf) { buf = new Float32Array(len); this._pool.set(len, buf); }
    for (let i = 0, j = 0; i < points.length; i++, j += 3) {
      const p = points[i]; buf[j] = p.x; buf[j+1] = p.y; buf[j+2] = p.z || 0;
    }
    return buf;
  }

  _fallback() {
    const g = new LineGeometry();
    g.setPositions(new Float32Array([0,0,0, 1,0,0]));
    return g;
  }
}
