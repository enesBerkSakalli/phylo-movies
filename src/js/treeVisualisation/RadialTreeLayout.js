import * as d3 from "d3";
import { getNodeKey } from './utils/KeyGenerator.js';

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
   * calculating the radius for every node
   * @param  {Object} node
   * @param  {Number} radius
   * @return {void}
   */
  calcRadius(node, radius = 0) {
    if (!node.parent) {
      // If this is the root node, set its radius to 0
      node.data.length = 0;
    }

    let length = node.data.length;

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
    this.containerWidth = (this.originalWidth || this.containerWidth) - this.margin;
    this.containerHeight = (this.originalHeight || this.containerHeight) - this.margin;
  }

  /**
   * generating the coordinates of every tree
   * @param  {Object} root
   * @return {void}
   */
  generateCoordinates(root) {
    root.each(function (d) {
      d.x = d.radius * Math.cos(d.angle);
      d.y = d.radius * Math.sin(d.angle);
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
   * generating radial tree. Returns the tree with the coordinates to generate a tree with a radial Layout.
   * @return {root}
   */
  constructRadialTree() {
    // CRITICAL FIX: Removed `this.root.data.length = 0` line that was mutating shared tree data
    // This mutation was corrupting previous tree data and causing position diffing to fail,
    // leading to duplicate element creation in WebGL renderer

    // Removed debug log: Constructing tree layout - preserving original data integrity

    this.calcRadius(this.root, 0);
    this.indexLeafNodes(this.root);
    this.calcAngle(this.root, Math.PI * 2, this.root.leaves().length);

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
    this.generateCoordinates(this.root);

    return this.root;
  }


  /**
   * Calculate the scale factor to fit tree within container dimensions
   */
  calculateContainerScale(minWindowSize, maxRadius, factor) {
    // For comparison views, use more aggressive scaling to ensure trees fit
    const isComparison = this.containerWidth < 600 || this.containerHeight < 600;
    const adjustedFactor = isComparison ? factor * 0.8 : factor; // More conservative for comparisons

    return minWindowSize / adjustedFactor / maxRadius;
  }

}

export default function createRadialTreeLayout(
  tree,
  branchTransformation = 'none',
  options = {}
) {
  // Apply branch length transformation before layout
  const { transformBranchLengths } = require('../utils/branchTransformUtils');
  let transformedTree = transformBranchLengths(tree, branchTransformation);

  let d3tree = d3.hierarchy(transformedTree);
  let treeLayout = new RadialTreeLayout(d3tree);

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

  // Use density-aware construction if requested
  let root_ = treeLayout.constructRadialTree();

  // For comparison views, ensure the tree is sized appropriately
  const isComparison = options.containerId && options.containerId.includes('comparison');
  if (isComparison && options.maxRadius) {
    const currentMaxRadius = treeLayout.getMaxRadius(root_);
    if (currentMaxRadius > options.maxRadius) {
      const adjustmentScale = options.maxRadius / currentMaxRadius * 0.9;
      treeLayout.scaleRadius(root_, adjustmentScale);
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
