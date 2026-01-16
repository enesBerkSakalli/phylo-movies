/**
 * ComparisonUtils
 *
 * Helper functions for side-by-side tree comparison mode.
 */

/**
 * Calculate spacing offset for the right tree in comparison mode.
 * @param {number} canvasWidth - Canvas width
 * @param {Object} viewOffset - Current view offset {x, y}
 * @returns {number} Right tree offset
 */
export function calculateRightOffset(canvasWidth, viewOffset) {
  const spacing = canvasWidth * 0.1;
  const halfWidth = canvasWidth / 2;
  return halfWidth + spacing + viewOffset.x;
}

/**
 * Apply position offset to layer data elements.
 * @param {Object} layerData - Layer data containing nodes, links, extensions, labels
 * @param {number} offsetX - X offset
 * @param {number} offsetY - Y offset
 */
export function applyOffset(layerData, offsetX, offsetY) {
  layerData.nodes.forEach(node => {
    node.position = [node.position[0] + offsetX, node.position[1] + offsetY, node.position[2]];
  });

  (layerData.links || []).forEach(link => {
    link.sourcePosition = [link.sourcePosition[0] + offsetX, link.sourcePosition[1] + offsetY, link.sourcePosition[2]];
    link.targetPosition = [link.targetPosition[0] + offsetX, link.targetPosition[1] + offsetY, link.targetPosition[2]];

    if (link.path) {
      if (link.path instanceof Float32Array || link.path instanceof Float64Array) {
        // Handle typed arrays (flat format [x, y, z, ...]) used in animation
        for (let i = 0; i < link.path.length; i += 3) {
          link.path[i] += offsetX;
          link.path[i + 1] += offsetY;
        }
      } else if (Array.isArray(link.path)) {
        // Handle standard arrays (nested format [[x,y,z], ...]) used in static view
        link.path = link.path.map(point => [point[0] + offsetX, point[1] + offsetY, point[2]]);
      }
    }
  });

  (layerData.extensions || []).forEach(ext => {
    ext.sourcePosition = [ext.sourcePosition[0] + offsetX, ext.sourcePosition[1] + offsetY, ext.sourcePosition[2]];
    ext.targetPosition = [ext.targetPosition[0] + offsetX, ext.targetPosition[1] + offsetY, ext.targetPosition[2]];

    if (ext.path) {
      if (ext.path instanceof Float32Array || ext.path instanceof Float64Array) {
        // Handle typed arrays (flat format [x, y, z, ...]) used in animation
        for (let i = 0; i < ext.path.length; i += 3) {
          ext.path[i] += offsetX;
          ext.path[i + 1] += offsetY;
        }
      } else if (Array.isArray(ext.path)) {
        // Handle standard arrays (nested format [[x,y,z], ...]) used in static view
        ext.path = ext.path.map(point => [point[0] + offsetX, point[1] + offsetY, point[2]]);
      }
    }
  });

  (layerData.labels || []).forEach(label => {
    label.position = [label.position[0] + offsetX, label.position[1] + offsetY, label.position[2]];
  });
}

/**
 * Calculate bounds from combined elements.
 * @param {Array} elements - Combined nodes and labels
 * @returns {Object} bounds {minX, maxX, minY, maxY}
 */
export function calculateBounds(elements) {
  return elements.reduce((acc, el) => {
    const [x, y] = el.position;
    acc.minX = Math.min(acc.minX, x);
    acc.maxX = Math.max(acc.maxX, x);
    acc.minY = Math.min(acc.minY, y);
    acc.maxY = Math.max(acc.maxY, y);
    return acc;
  }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
}

/**
 * Combine layer data from left and right trees.
 * @param {Object} leftData - Left tree layer data
 * @param {Object} rightData - Right tree layer data
 * @param {Array} connectors - Optional connector paths between trees
 * @returns {Object} Combined layer data
 */
export function combineLayerData(leftData, rightData, connectors = []) {
  return {
    nodes: [...leftData.nodes, ...rightData.nodes],
    links: [...(leftData.links || []), ...(rightData.links || [])],
    extensions: [...(leftData.extensions || []), ...(rightData.extensions || [])],
    labels: [...(leftData.labels || []), ...(rightData.labels || [])],
    connectors
  };
}

/**
 * Build a quick lookup of split-index keys to positions (prefers label/tip position when available).
 * @param {Array} nodes - Array of node objects
 * @param {Array} labels - Array of label objects
 * @returns {Map} Map of split-index keys to position/metadata
 */
export function buildPositionMap(nodes, labels = []) {
  const positionMap = new Map();
  const labelPositionByLeaf = new Map();

  labels.forEach(label => {
    if (label.leaf) {
      labelPositionByLeaf.set(label.leaf, label.position);
    }
  });

  nodes.forEach(node => {
    const splitIndices = node.data?.split_indices;
    if (Array.isArray(splitIndices) && splitIndices.length > 0) {
      const key = splitIndices.join('-');
      let position = node.position;

      // For leaf nodes, use label position (tip)
      if (node.isLeaf && node.originalNode) {
        const labelPos = labelPositionByLeaf.get(node.originalNode);
        if (labelPos) {
          position = labelPos;
        }
      }

      positionMap.set(key, {
        position,
        isLeaf: node.isLeaf,
        node,
        name: node.data?.name ? String(node.data.name) : null
      });
    }
  });

  return positionMap;
}
