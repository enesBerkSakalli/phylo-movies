import * as THREE from "https://esm.sh/three@0.152.2";

/**
 * @module PointGeometryFactory
 * Creates the THREE.js geometry and materials for points
 */
const PointGeometryFactory = {
  /**
   * Create geometry and attributes for points
   * @param {Float32Array} positions - Point positions
   * @param {Number} numPoints - Number of points
   * @param {Array} treeIndices - Indices of trees
   * @param {Number} pointSize - Size of points
   * @param {Function|Array} colorBy - Function or array for color assignment
   * @returns {Object} Object with geometry and related attributes
   */
  createGeometry(positions, numPoints, treeIndices, pointSize, colorBy) {
    const colors = new Float32Array(numPoints * 3);
    const sizes = new Float32Array(numPoints);
    const indices = new Float32Array(numPoints);

    for (let i = 0; i < numPoints; i++) {
      let color;
      if (typeof colorBy === 'function') {
        color = colorBy(i, treeIndices[i]);
      } else if (Array.isArray(colorBy)) {
        color = colorBy[i];
      } else {
        // Default: sequential color scheme
        const hue = i / numPoints;
        color = new THREE.Color().setHSL(hue, 0.7, 0.5);
      }
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      sizes[i] = pointSize;
      indices[i] = treeIndices[i];
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("treeIndex", new THREE.BufferAttribute(indices, 1));

    return { geometry, colors, sizes, indices };
  },

  /**
   * Create material for points
   * @param {Number} pointSize - Size of points
   * @param {THREE.Texture} pointTexture - Texture for points
   * @returns {THREE.PointsMaterial} Material for points
   */
  createPointsMaterial(pointSize, pointTexture) {
    return new THREE.PointsMaterial({
      size: pointSize,
      vertexColors: true,
      map: pointTexture,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true,
    });
  },
};

export { PointGeometryFactory };
