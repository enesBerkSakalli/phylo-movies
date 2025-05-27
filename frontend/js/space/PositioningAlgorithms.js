/**
 * @module PositioningAlgorithms
 * Algorithms for positioning points in 3D space
 */

const PositioningAlgorithms = {
  /**
   * Calculate positions using Multidimensional Scaling (MDS)
   * @param {Array} distanceMatrix - Matrix of distances between points
   * @param {number} dimensions - Number of dimensions for output (2 or 3)
   * @returns {Array} Array of positions
   */
  calculateMDS(distanceMatrix, dimensions = 2) {
    // Validate input matrix
    if (!distanceMatrix || !Array.isArray(distanceMatrix) || distanceMatrix.length === 0) {
      console.error("Invalid distance matrix provided to MDS");
      return Array(1).fill().map(() => Array(dimensions).fill(0));
    }
    
    const n = distanceMatrix.length;
    // Initialize with small random values to avoid NaN during computation
    let positions = Array(n)
      .fill()
      .map(() => 
        Array(dimensions)
          .fill(0)
          .map(() => Math.random() * 0.1)
      );

    try {
      const learningRate = 0.1;
      const iterations = 100;
      const safetyThreshold = 1e-10; // Small value to prevent division by zero

      for (let iter = 0; iter < iterations; iter++) {
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            // Calculate current Euclidean distance with safety checks
            let currentDist = 0;
            for (let d = 0; d < dimensions; d++) {
              const diff = positions[i][d] - positions[j][d];
              if (!isNaN(diff)) { // Skip NaN values
                currentDist += diff * diff;
              }
            }
            currentDist = Math.sqrt(Math.max(currentDist, safetyThreshold)); // Avoid sqrt of zero/negative

            // Target distance from matrix with validation
            let targetDist = 0;
            if (distanceMatrix[i] && distanceMatrix[i][j] !== undefined) {
              targetDist = Math.max(distanceMatrix[i][j], safetyThreshold);
            }

            // Adjust positions with safety checks
            if (currentDist > safetyThreshold && !isNaN(currentDist) && !isNaN(targetDist)) {
              const factor = (learningRate * (targetDist - currentDist)) / currentDist;
              if (!isNaN(factor)) { // Skip NaN adjustments
                for (let d = 0; d < dimensions; d++) {
                  const diff = positions[i][d] - positions[j][d];
                  if (!isNaN(diff)) {
                    const adjustment = factor * diff;
                    if (!isNaN(adjustment)) {
                      positions[i][d] += adjustment;
                      positions[j][d] -= adjustment;
                    }
                  }
                }
              }
            }
          }
        }
      }

      // Final validation to catch any NaN values
      for (let i = 0; i < n; i++) {
        for (let d = 0; d < dimensions; d++) {
          if (isNaN(positions[i][d])) {
            positions[i][d] = 0;
          }
        }
      }
      
      return positions;
    } catch (error) {
      console.error("Error in MDS calculation:", error);
      // Return safe default positions in a circle
      return Array(n).fill().map((_, i) => [
        Math.cos(i/n * Math.PI * 2),
        Math.sin(i/n * Math.PI * 2),
        0
      ].slice(0, dimensions));
    }
  },

  /**
   * Create circular layout of points
   * @param {number} numPoints - Number of points
   * @param {number} radius - Radius of the circle
   * @returns {Float32Array} Array of positions as Float32Array
   */
  createCircularLayout(numPoints, radius) {
    const positions = new Float32Array(numPoints * 3);
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = 0;
    }
    return positions;
  },

  /**
   * Generate positions from custom position data
   * @param {Array} customPositions - Array of position objects {x,y,z}
   * @param {number} numPoints - Number of points
   * @param {number} spread - Factor to spread points by
   * @returns {Float32Array} Array of positions as Float32Array
   */
  generateFromCustomPositions(customPositions, numPoints, spread) {
    const positions = new Float32Array(numPoints * 3);
    for (let i = 0; i < numPoints; i++) {
      positions[i * 3] = (customPositions[i].x || 0) * spread;
      positions[i * 3 + 1] = (customPositions[i].y || 0) * spread;
      positions[i * 3 + 2] = (customPositions[i].z || 0) * spread; // Apply spread to z-coordinate
    }
    return positions;
  },

  /**
   * Generate positions from a distance matrix using MDS
   * @param {Array} distanceMatrix - Matrix of distances between points
   * @param {number} numPoints - Number of points
   * @param {number} spread - Factor to spread points by
   * @returns {Float32Array} Array of positions as Float32Array
   */
  generateFromDistanceMatrix(distanceMatrix, numPoints, spread) {
    try {
      const positions = new Float32Array(numPoints * 3);
      const mdsPositions = this.calculateMDS(distanceMatrix, 2);
      
      if (!mdsPositions || mdsPositions.length === 0) {
        throw new Error("MDS calculation failed");
      }
      
      for (let i = 0; i < numPoints; i++) {
        if (i < mdsPositions.length) {
          // Ensure values are valid numbers
          const x = mdsPositions[i][0] || 0;
          const y = mdsPositions[i][1] || 0;
          
          positions[i * 3] = isNaN(x) ? 0 : x * spread;
          positions[i * 3 + 1] = isNaN(y) ? 0 : y * spread;
          positions[i * 3 + 2] = 0;
        } else {
          // Fallback for missing positions
          const angle = (i / numPoints) * Math.PI * 2;
          positions[i * 3] = Math.cos(angle) * spread;
          positions[i * 3 + 1] = Math.sin(angle) * spread;
          positions[i * 3 + 2] = 0;
        }
      }
      
      return positions;
    } catch (error) {
      console.error("Error generating from distance matrix:", error);
      // Fallback to circular layout
      return this.createCircularLayout(numPoints, spread);
    }
  }
};

export { PositioningAlgorithms };