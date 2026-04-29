import { hierarchy } from "d3-hierarchy";
import { transformBranchLengths } from '../../domain/tree/branchTransform.js';
import { createLayoutResult } from './LayoutResultAdapter.js';
import {
  calculateBranchLengthRadii,
  calculateContainerScale,
  calculateUniformScale,
  generatePolarCoordinates,
  getMaxRadius,
  getMinContainerDimension,
  initializeLayoutState,
  normalizeLayoutOptions,
  normalizeUniformScale,
  scaleRadius,
  setAngleExtentDegrees,
  setAngleExtentRadians,
  setAngleOffsetDegrees,
  setAngleOffsetRadians,
  setLayoutDimensions,
  setLayoutMargin,
  setRadiusPreservation
} from './LayoutBaseUtils.js';

/** Class for calculating radial tree layout coordinates. */
export class RadialTreeLayout {
  constructor(root) {
    this.root = hierarchy(root);
    initializeLayoutState(this);
  }

  /**
   * Index leaf nodes for angle calculation in radial layout
   * @param node
   * @param i
   * @return {Number}
   */
  indexLeafNodes(node, i = 0) {
    if (!node.children) {
      node.index = i;
      i++;
    } else {
      node.children.forEach((child) => {
        i = this.indexLeafNodes(child, i);
      });
    }

    return i;
  }

  /**
   * Set the total angular extent (in degrees) for the radial layout.
   * @param {number} degrees
   */
  setAngleExtentDegrees(degrees = 360) {
    setAngleExtentDegrees(this, degrees);
  }

  /**
   * Set the total angular extent (in radians) for the radial layout.
   * @param {number} radians
   */
  setAngleExtentRadians(radians = Math.PI * 2) {
    setAngleExtentRadians(this, radians);
  }

  /**
   * Set rotation offset (in degrees) for the radial layout.
   * @param {number} degrees
   */
  setAngleOffsetDegrees(degrees = 0) {
    setAngleOffsetDegrees(this, degrees);
  }

  /**
   * Set rotation offset (in radians) for the radial layout.
   * @param {number} radians
   */
  setAngleOffsetRadians(radians = 0) {
    setAngleOffsetRadians(this, radians);
  }

  /**
   * calculating the radius for every node
   * @param  {Object} node
   * @param  {Number} radius
   * @return {void}
   */
  calcRadius(node, radius = 0) {
    calculateBranchLengthRadii(this, node, radius);
  }


  /**
   * Set radius preservation mode for IT → C transitions
   * @param {boolean} preserve - Whether to preserve radii
   */
  setRadiusPreservation(preserve) {
    setRadiusPreservation(this, preserve);
  }

  /**
   * calculating recursively  every angle for every node
   * @param node
   * @param angle
   * @param  {Number} countLeaves
   * @return {Number}
   */
  calcAngle(node, angle, countLeaves) {
    if (!node.children) {
      node.angle = (angle / countLeaves) * node.index;
    } else {
      const childrenAngle = [];

      node.children.forEach((node) => {
        childrenAngle.push(this.calcAngle(node, angle, countLeaves));
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
    setLayoutDimensions(this, width, height);
  }

  /**
   * setting the margin how the tree should be displayed
   * @return {void}
   * @param margin
   */
  setMargin(margin) {
    setLayoutMargin(this, margin);
  }

  /**
   * generating the coordinates of every tree
   * @param  {Object} root
   * @return {void}
   */
  generateCoordinates(root) {
    generatePolarCoordinates(root, (node) => node.angle, this.angleOffset);
  }

  /**
   * get max radius of all leaves.
   * @param  {Object} root
   * @return {Number}
   */
  getMaxRadius(root) {
    return getMaxRadius(root, { leavesOnly: true });
  }

  /**
   * scaling the radius, by the information of the height and width of the container where the tree should be displayed
   * @param  {Object} root
   * @param scale
   * @return {void}
   */
  scaleRadius(root, scale) {
    scaleRadius(root, scale);
  }

  /**
   * Get the minimum dimension of the container for scaling calculations
   * @param  {Number} width
   * @param  {Number} height
   * @return {Number}
   */
  getMinContainerDimension(width, height) {
    return getMinContainerDimension(width, height);
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
    const uniformScale = calculateUniformScale(minWindowSize, maxGlobalScale);
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
    return calculateContainerScale(this.containerWidth, this.containerHeight, minWindowSize, maxRadius, factor);
  }

}

export default function createRadialTreeLayout(
  tree,
  branchTransformation = 'none',
  options = {}
) {
  // Apply branch length transformation before layout
  const transformedTree = transformBranchLengths(tree, branchTransformation);
  const treeLayout = new RadialTreeLayout(transformedTree);
  const { width, height, margin } = normalizeLayoutOptions(options);

  treeLayout.setDimension(width, height);

  treeLayout.setMargin(margin);

  // Check if uniform scaling is requested
  const useUniformScaling = options.uniformScale !== undefined;
  let root_;

  if (useUniformScaling) {
    const uniformScale = normalizeUniformScale(options.uniformScale);

    root_ = treeLayout.constructRadialTree(true, { generateCoords: false });
    treeLayout.scaleRadius(root_, uniformScale);
    treeLayout.generateCoordinates(root_);
    treeLayout.scale = uniformScale;
  } else {
    // Use density-aware construction with auto-scaling
    root_ = treeLayout.constructRadialTree(false);
  }

  return createLayoutResult(root_, {
    max_radius: treeLayout.getMaxRadius(root_),
    width,
    height,
    margin,
    scale: treeLayout.scale
  });
}
