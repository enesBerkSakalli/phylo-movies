/**
 * @module PositioningAlgorithms
 * Algorithms for positioning points in 3D space
 */

// Local helper function (moved from scatterPlot.js)
function logEmbeddingStats(embedding, label = "Embedding") {
  if (!embedding || !embedding.length) {
    console.log(`[PositioningAlgorithms.js] [${label}] Embedding is null or empty.`);
    return;
  }
  // Ensure embedding is an array of objects with x, y, z properties
  const points = Array.isArray(embedding) ? embedding : [];

  let xs = points.map((p) => p && p.x).filter(v => typeof v === 'number');
  let ys = points.map((p) => p && p.y).filter(v => typeof v === 'number');
  let zs = points.map((p) => p && p.z).filter(v => typeof v === 'number'); // Default undefined z to 0 for stats

  function stats(arr) {
    if (!arr || arr.length === 0)
      return { min: NaN, max: NaN, mean: NaN, range: NaN, count: 0 };
    // arr is already filtered for numbers
    if (arr.length === 0)
      return {
        min: NaN,
        max: NaN,
        mean: NaN,
        range: NaN,
        count: 0,
      };
    const minVal = Math.min(...arr);
    const maxVal = Math.max(...arr);
    return {
      min: minVal,
      max: maxVal,
      mean: arr.reduce((a, b) => a + b, 0) / arr.length,
      range: maxVal - minVal,
      count: arr.length,
    };
  }
  console.log(
    `[PositioningAlgorithms.js] [${label}] Count: ${points.length}, X:`,
    stats(xs),
    "Y:",
    stats(ys),
    "Z:",
    stats(zs.length > 0 ? zs : [0]) // Ensure Z stats are calculated even if all z are undefined/0
  );
}


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
  },

  /**
   * Prepares and returns the final Float32Array of positions for the scatter plot.
   * This function encapsulates the logic for choosing between custom positions,
   * distance matrix-based positions, or fallback layouts. It also handles
   * filtering, normalization, and validation of positions.
   *
   * @param {Array<Object>} sourcePositions - Original array of position objects {x,y,z} (e.g., from options.positions).
   * @param {Array<Array<number>>} distanceMatrix - Distance matrix for MDS.
   * @param {number} layoutSpread - Factor to spread points by.
   * @param {number} numPointsToRender - The exact number of points that will be rendered (e.g., filteredTreeList.length).
   * @param {boolean} showOnlyFullTrees - Flag indicating if only full trees (and their corresponding positions) should be used.
   * @param {number} originalSourcePositionsLength - The length of the original, unfiltered sourcePositions array (e.g., treeList.length if sourcePositions corresponds to it).
   * @param {Array<number>} filteredSourceIndices - An array of original indices from sourcePositions that should be used.
   *                                                (e.g., treeIndices from scatterPlot.js, mapping filtered to original).
   * @returns {Float32Array} The final array of positions for THREE.BufferGeometry.
   */
  prepareScatterPlotPositions(
    sourcePositions, // This is options.positions from scatterPlot
    distanceMatrix,  // This is settings.distanceMatrix from scatterPlot
    layoutSpread,
    numPointsToRender,
    showOnlyFullTrees,
    originalSourcePositionsLength, // This corresponds to the original treeList.length for which sourcePositions were provided
    filteredSourceIndices      // These are the indices of items in filteredTreeList relative to the original treeList/sourcePositions
  ) {
    let positions3D; // This will be a Float32Array for THREE.BufferGeometry

    const createFallbackPositions = (count) => {
      console.log(
        "[PositioningAlgorithms.js] Using fallback circular layout for",
        count,
        "points."
      );
      return PositioningAlgorithms.createCircularLayout(
        count,
        layoutSpread
      );
    };

    try {
      if (
        sourcePositions &&
        Array.isArray(sourcePositions) &&
        sourcePositions.length > 0
      ) {
        logEmbeddingStats(
          sourcePositions,
          "Raw sourcePositions (before filtering)"
        );

        let relevantPositionsSource = sourcePositions;

        if (showOnlyFullTrees) {
          // Filter sourcePositions based on filteredSourceIndices
          // These indices map items in the filtered list back to their original positions in sourcePositions
          if (sourcePositions.length !== originalSourcePositionsLength) {
            console.warn(
              `[PositioningAlgorithms.js] Mismatch: sourcePositions length (${sourcePositions.length}) !== originalSourcePositionsLength (${originalSourcePositionsLength}). This might lead to incorrect filtering.`
            );
          }
          relevantPositionsSource = filteredSourceIndices
            .map((originalIndex) => {
              if (originalIndex < sourcePositions.length) {
                return sourcePositions[originalIndex];
              }
              console.warn(
                `[PositioningAlgorithms.js] filteredSourceIndex ${originalIndex} is out of bounds for sourcePositions (length ${sourcePositions.length}). Returning fallback point.`
              );
              return { x: 0, y: 0, z: 0 }; // Fallback for out-of-bounds
            })
            .filter(p => p); // Filter out any undefined if an index was bad (though we return a fallback point now)

          if (relevantPositionsSource.length !== numPointsToRender) {
            console.warn(
              `[PositioningAlgorithms.js] Filtered positions length (${relevantPositionsSource.length}) does not match numPointsToRender (${numPointsToRender}). Adjusting or potential error.`
            );
            // If lengths mismatch, we might need to truncate or pad relevantPositionsSource,
            // or this indicates a deeper issue. For now, proceed but log.
            if (relevantPositionsSource.length > numPointsToRender) {
                relevantPositionsSource = relevantPositionsSource.slice(0, numPointsToRender);
            }
            // If shorter, generateFromCustomPositions will handle it by using only available points,
            // but this is not ideal. The final validation step will catch length mismatches.
          }
          logEmbeddingStats(
            relevantPositionsSource,
            "Filtered relevantPositionsSource (for rendered points)"
          );
        } else {
          // Not filtering by showOnlyFullTrees, but sourcePositions might still be longer than numPointsToRender
          // if numPointsToRender was restricted for other reasons (e.g. a direct limit).
          // Or, if sourcePositions came from a pre-filtered source that already matches numPointsToRender.
          if (sourcePositions.length !== numPointsToRender) {
            console.warn(
              `[PositioningAlgorithms.js] sourcePositions length (${sourcePositions.length}) does not match numPointsToRender (${numPointsToRender}) when showOnlyFullTrees is false. Using slice.`
            );
            relevantPositionsSource = sourcePositions.slice(0, numPointsToRender);
          }
           logEmbeddingStats(
            relevantPositionsSource,
            "Unfiltered/Sliced relevantPositionsSource"
          );
        }

        // Aspect-preserving normalization using relevantPositionsSource
        if (!relevantPositionsSource || relevantPositionsSource.length === 0) {
          console.warn(
            "[PositioningAlgorithms.js] relevantPositionsSource is empty. Falling back."
          );
          positions3D = createFallbackPositions(numPointsToRender);
        } else {
          // Ensure all points have x, y, z; default z to 0 if missing.
          const pointsWithZ = relevantPositionsSource.map(p => ({x: p.x || 0, y: p.y || 0, z: p.z || 0}));

          let xs = pointsWithZ.map((p) => p.x);
          let ys = pointsWithZ.map((p) => p.y);
          let zs = pointsWithZ.map((p) => p.z);

          let minX = Math.min(...xs), maxX = Math.max(...xs);
          let minY = Math.min(...ys), maxY = Math.max(...ys);
          let minZ = Math.min(...zs), maxZ = Math.max(...zs);

          let rangeX = maxX - minX;
          let rangeY = maxY - minY;
          let rangeZ = maxZ - minZ;

          let centerX = (minX + maxX) / 2;
          let centerY = (minY + maxY) / 2;
          let centerZ = (minZ + maxZ) / 2;

          let maxRange = Math.max(rangeX, rangeY, rangeZ);
          if (maxRange === 0) maxRange = 1; // Avoid division by zero if all points are identical

          let normPositions = pointsWithZ.map((p) => ({
            x: (p.x - centerX) / maxRange,
            y: (p.y - centerY) / maxRange,
            z: (p.z - centerZ) / maxRange,
          }));

          logEmbeddingStats(
            normPositions,
            "Aspect-Preserving Normalized Embedding"
          );

          positions3D = PositioningAlgorithms.generateFromCustomPositions(
            normPositions,
            numPointsToRender, // Should match normPositions.length if logic above is correct
            layoutSpread
          );
        }
      } else if (distanceMatrix) {
        try {
          console.log(
            "[PositioningAlgorithms.js] Generating positions from distance matrix for",
            numPointsToRender, "points."
          );
          // This assumes distanceMatrix corresponds to numPointsToRender.
          // If distanceMatrix was for originalSourcePositionsLength, it needs filtering first.
          // For now, we assume it's correctly sized.
          positions3D = PositioningAlgorithms.generateFromDistanceMatrix(
            distanceMatrix, // This should be the matrix for the 'numPointsToRender' items
            numPointsToRender,
            layoutSpread
          );
          if (Array.from(positions3D).some((val) => isNaN(val))) {
            console.warn(
              "[PositioningAlgorithms.js] MDS generated NaN positions, using fallback."
            );
            positions3D = createFallbackPositions(numPointsToRender);
          }
        } catch (error) {
          console.error(
            "[PositioningAlgorithms.js] Error generating positions from distance matrix:", error
          );
          positions3D = createFallbackPositions(numPointsToRender);
        }
      } else {
        console.log(
          "[PositioningAlgorithms.js] No custom positions or distance matrix. Using fallback."
        );
        positions3D = createFallbackPositions(numPointsToRender);
      }
    } catch (error) {
      console.error(
        "[PositioningAlgorithms.js] Error in position generation pipeline:", error
      );
      positions3D = createFallbackPositions(numPointsToRender);
    }

    // Final validation
    if (
      !positions3D ||
      positions3D.length !== numPointsToRender * 3 ||
      Array.from(positions3D).some((val) => isNaN(val))
    ) {
      console.warn(
        `[PositioningAlgorithms.js] Positions are invalid (NaN, wrong length: ${positions3D?.length} vs ${numPointsToRender * 3}, or undefined) before returning. Using safe fallback.`
      );
      const fallbackArray = new Float32Array(numPointsToRender * 3);
      for (let i = 0; i < numPointsToRender; i++) {
        const angle = (i / numPointsToRender) * Math.PI * 2;
        fallbackArray[i * 3] = Math.cos(angle) * layoutSpread;
        fallbackArray[i * 3 + 1] = Math.sin(angle) * layoutSpread;
        fallbackArray[i * 3 + 2] = 0;
      }
      positions3D = fallbackArray;
    }
    return positions3D;
  }
};

export { PositioningAlgorithms };