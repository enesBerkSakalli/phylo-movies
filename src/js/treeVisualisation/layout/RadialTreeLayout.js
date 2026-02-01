import * as d3 from "d3";
import { getNodeKey } from '../utils/KeyGenerator.js';
import { transformBranchLengths } from '../../domain/tree/branchTransform.js';

/** Class for calculating radial tree layout coordinates. */
export class RadialTreeLayout {
  constructor(root) {
    //node element of d3

    this.root = d3.hierarchy(root);

    //width of container
    this.containerWidth = 0;
    //height of container
    this.containerHeight = 0;
    this.margin = 0;
    this.scale = 0;
    this.angleExtent = Math.PI * 2; // total angular span in radians (default 360°)
    this.angleOffset = 0; // rotation offset in radians

    // Radius preservation for IT → C transitions
    this.preserveRadius = false;
    this.previousNodeRadii = new Map();
  }

  /**
   * Index leaf nodes for angle calculation in radial layout
   * @param node
   * @param i
   * @return {Number}
   */
  indexLeafNodes(node, i = 0) {
    const self = this; // Get a reference to your object.

    if (!("children" in node)) {
      node.index = i;
      i++;
    }

    if (node.children) {
      node.children.forEach(function (child) {
        i = self.indexLeafNodes(child, i);
      });
    }

    return i;
  }

  /**
   * Set the total angular extent (in degrees) for the radial layout.
   * @param {number} degrees
   */
  setAngleExtentDegrees(degrees = 360) {
    const clamped = typeof degrees === 'number' && isFinite(degrees) ? degrees : 360;
    this.angleExtent = (clamped * Math.PI) / 180;
  }

  /**
   * Set the total angular extent (in radians) for the radial layout.
   * @param {number} radians
   */
  setAngleExtentRadians(radians = Math.PI * 2) {
    const span = typeof radians === 'number' && isFinite(radians) ? radians : Math.PI * 2;
    this.angleExtent = span;
  }

  /**
   * Set rotation offset (in degrees) for the radial layout.
   * @param {number} degrees
   */
  setAngleOffsetDegrees(degrees = 0) {
    const value = typeof degrees === 'number' && isFinite(degrees) ? degrees : 0;
    this.angleOffset = (value * Math.PI) / 180;
  }

  /**
   * Set rotation offset (in radians) for the radial layout.
   * @param {number} radians
   */
  setAngleOffsetRadians(radians = 0) {
    const value = typeof radians === 'number' && isFinite(radians) ? radians : 0;
    this.angleOffset = value;
  }

  /**
   * calculating the radius for every node
   * @param  {Object} node
   * @param  {Number} radius
   * @return {void}
   */
  calcRadius(node, radius = 0) {
    const d = node.data || {};
    // Backend standardizes on 'length'.
    const rawLength = d.length ?? 0;
    const length = Number(rawLength) || 0;

    // Check if we should preserve radius for this node
    const nodeKey = getNodeKey(node);
    if (this.preserveRadius && this.previousNodeRadii.has(nodeKey)) {
      // Use preserved radius from previous calculation
      node.radius = this.previousNodeRadii.get(nodeKey);
    } else {
      // Calculate new radius normally
      node.radius = length + radius;
      // Store this radius for potential future preservation
      this.previousNodeRadii.set(nodeKey, node.radius);
    }

    if (node.children) {
      node.children.forEach((child) => {
        this.calcRadius(child, node.radius);
      });
    }
  }


  /**
   * Set radius preservation mode for IT → C transitions
   * @param {boolean} preserve - Whether to preserve radii
   */
  setRadiusPreservation(preserve) {
    this.preserveRadius = preserve;
  }

  /**
   * calculating recursively  every angle for every node
   * @param node
   * @param angle
   * @param  {Number} countLeaves
   * @return {Number}
   */
  calcAngle(node, angle, countLeaves) {
    const self = this; // Get a reference to your object.
    if (!node.children) {
      node.angle = (angle / countLeaves) * node.index;
    } else {
      const childrenAngle = [];

      node.children.forEach((node) => {
        childrenAngle.push(self.calcAngle(node, angle, countLeaves));
      });

      node.angle = 0;

      childrenAngle.forEach((angle) => {
        node.angle = node.angle + angle;
      });

      node.angle = node.angle / childrenAngle.length;

      node.children.forEach((child) => {
        child.parent_angle = node.angle;
      });
    }

    return node.angle;
  }

  /**
   * setting width and height for tree
   * @param  {Number} width
   * @param  {Number} height
   * @return {void}
   */
  setDimension(width, height) {
    // Store original dimensions to prevent accumulation
    this.originalWidth = width;
    this.originalHeight = height;
    this.containerWidth = width;
    this.containerHeight = height;
  }

  /**
   * setting the margin how the tree should be displayed
   * @return {void}
   * @param margin
   */
  setMargin(margin) {
    this.margin = margin;
    // Calculate from original dimensions to avoid accumulation
    const baseWidth = this.originalWidth || this.containerWidth;
    const baseHeight = this.originalHeight || this.containerHeight;
    this.containerWidth = Math.max(1, baseWidth - this.margin * 2);
    this.containerHeight = Math.max(1, baseHeight - this.margin * 2);
  }

  /**
   * generating the coordinates of every tree
   * @param  {Object} root
   * @return {void}
   */
  generateCoordinates(root) {
    const offset = this.angleOffset || 0;
    root.each((d) => {
      const baseAngle = d.angle || 0;
      const theta = baseAngle + offset;
      d.rotatedAngle = theta;
      d.offset = offset;
      d.x = d.radius * Math.cos(theta);
      d.y = d.radius * Math.sin(theta);
    });
  }

  /**
   * get max radius of all leaves.
   * @param  {Object} root
   * @return {Number}
   */
  getMaxRadius(root) {
    let maxRadius = 0;
    root.leaves().forEach(function (d) {
      if (d.radius > maxRadius) {
        maxRadius = d.radius;
      }
    });
    return maxRadius;
  }

  /**
   * scaling the radius, by the information of the height and width of the container where the tree should be displayed
   * @param  {Object} root
   * @param scale
   * @return {void}
   */
  scaleRadius(root, scale) {
    root.each(function (d) {
      d.radius = d.radius * scale;
    });
  }

  /**
   * Get the minimum dimension of the container for scaling calculations
   * @param  {Number} width
   * @param  {Number} height
   * @return {Number}
   */
  getMinContainerDimension(width, height) {
    return Math.min(width, height);
  }





  /**
   * Construct radial tree with uniform scaling applied.
   * This ensures consistent scaling across multiple trees.
   * @param {number} maxGlobalScale - Maximum scale value across all trees
   * @returns {Object} Tree with uniform scaling applied
   */
  constructRadialTreeWithUniformScaling(maxGlobalScale) {
    // Calculate radii and angles without auto-scaling
    this.calcRadius(this.root, 0);
    this.indexLeafNodes(this.root);
    this.calcAngle(this.root, this.angleExtent, this.root.leaves().length);

    // Apply uniform scaling based on max global scale
    const minWindowSize = this.getMinContainerDimension(this.containerWidth, this.containerHeight);
    const uniformScale = minWindowSize / (2.0 * maxGlobalScale);
    this.scaleRadius(this.root, uniformScale);
    this.generateCoordinates(this.root);
    this.scale = uniformScale;

    return this.root;
  }

  /**
   * generating radial tree. Returns the tree with the coordinates to generate a tree with a radial Layout.
   * @param {boolean} [useUniformScaling=false] - Whether to skip auto-scaling for uniform scaling
   * @return {root}
   */
  constructRadialTree(useUniformScaling = false, options = {}) {
    // CRITICAL FIX: Removed `this.root.data.length = 0` line that was mutating shared tree data
    // This mutation was corrupting previous tree data and causing position diffing to fail,
    // leading to duplicate element creation in WebGL renderer

    // Removed debug log: Constructing tree layout - preserving original data integrity

    this.calcRadius(this.root, 0);
    this.indexLeafNodes(this.root);
    this.calcAngle(this.root, this.angleExtent, this.root.leaves().length);

    // Only apply auto-scaling if not using uniform scaling
    if (!useUniformScaling) {
      const minWindowSize = this.getMinContainerDimension(
        this.containerWidth,
        this.containerHeight
      );

      const maxRadius = this.getMaxRadius(this.root);

      // Use standard scaling
      this.scale = this.calculateContainerScale(
        minWindowSize,
        maxRadius,
        2.0
      );

      this.scaleRadius(this.root, this.scale);
    }

    const generateCoords = options.generateCoords !== false;
    if (generateCoords) {
      this.generateCoordinates(this.root);
    }

    return this.root;
  }


  /**
   * Calculate the scale factor to fit tree within container dimensions
   */
  calculateContainerScale(minWindowSize, maxRadius, factor) {
    // For comparison views, use more aggressive scaling to ensure trees fit
    const isComparison = this.containerWidth < 600 || this.containerHeight < 600;
    const adjustedFactor = isComparison ? factor * 0.8 : factor; // More conservative for comparisons

    const safeMaxRadius = Math.max(Number(maxRadius) || 0, 1e-6);
    return minWindowSize / adjustedFactor / safeMaxRadius;
  }

}

export default function createRadialTreeLayout(
  tree,
  branchTransformation = 'none',
  options = {}
) {
  // Apply branch length transformation before layout
  let transformedTree = transformBranchLengths(tree, branchTransformation);

  let treeLayout = new RadialTreeLayout(transformedTree);

  let container;
  let width, height, margin;

  if (options.containerId) {
    container = document.getElementById(`${options.containerId}`);
    if (!container) {
      throw new Error(
        `RadialTreeLayout: Container element with id "${options.containerId}" not found.`
      );
    }

    // Handle different container types more robustly
    if (container instanceof SVGSVGElement) {
      const rect = container.getBoundingClientRect();
      width = options.width || rect.width || container.clientWidth || 400;
      height = options.height || rect.height || container.clientHeight || 400;
    } else {
      const rect = container.getBoundingClientRect();
      width = options.width || rect.width || container.clientWidth || 400;
      height = options.height || rect.height || container.clientHeight || 400;
    }
  } else {
    width = options.width || 800;
    height = options.height || 600;
  }

  // Ensure minimum dimensions for tree rendering
  width = Math.max(width, 200);
  height = Math.max(height, 200);

  treeLayout.setDimension(width, height);

  // Use default margin if not provided
  margin = options.margin || 40;

  treeLayout.setMargin(margin);

  // Check if uniform scaling is requested
  const useUniformScaling = options.uniformScale !== undefined;
  let root_;

  if (useUniformScaling) {
    const s = Number(options.uniformScale);
    const uniformScale = Number.isFinite(s) && s > 0 ? s : 1;

    root_ = treeLayout.constructRadialTree(true, { generateCoords: false });
    treeLayout.scaleRadius(root_, uniformScale);
    treeLayout.generateCoordinates(root_);
    treeLayout.scale = uniformScale;
  } else {
    // Use density-aware construction with auto-scaling
    root_ = treeLayout.constructRadialTree(false);
  }

  // For comparison views, ensure the tree is sized appropriately
  const isComparison = options.containerId && options.containerId.includes('comparison');
  if (isComparison && options.maxRadius && !useUniformScaling) {
    const currentMaxRadius = treeLayout.getMaxRadius(root_);
    if (currentMaxRadius > options.maxRadius) {
      const adjustmentScale = options.maxRadius / currentMaxRadius * 0.9;
      treeLayout.scaleRadius(root_, adjustmentScale);
      treeLayout.scale *= adjustmentScale;
      treeLayout.generateCoordinates(root_);
    }
  }

  return {
    tree: root_,
    max_radius: treeLayout.getMaxRadius(root_),
    width: width,
    height: height,
    margin: margin,
    scale: treeLayout.scale
  };
}
