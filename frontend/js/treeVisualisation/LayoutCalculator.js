/** Class for generating coordinates for every tree. */
export class TreeConstructor {
  constructor(root, ignore_branch_lengths = false) {
    //node element of d3

    this.root = root;
    this.ignore_branch_lengths = ignore_branch_lengths;

    //width of container
    this.containerWidth = 0;
    //height of container
    this.containerHeight = 0;
    this.margin = 0;
    this.scale = 0;

    // Density-aware positioning configuration
    this.densityThreshold = 0.5; // Density threshold for adjustment
    this.angleExpansionFactor = 0.3; // How much to expand angles in dense regions
    this.radiusExpansionFactor = 10; // How much to push dense nodes outward
    this.angularResolution = 0.1; // ~5.7 degrees for neighbor detection
  }

  /**
   * Traversing the tree and getting the index of every node, which will be later used for the calculation of the layout of the tree.
   * @param node
   * @param i
   * @return {Number}
   */
  traverse(node, i = 0) {
    const self = this; // Get a reference to your object.

    if (!("children" in node)) {
      node.index = i;
      i++;
    }

    if (node.children) {
      node.children.forEach(function (child) {
        i = self.traverse(child, i);
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
    let length = node.data.length;

    if (this.ignore_branch_lengths) {
      length = 1;
    }

    node.radius = length + radius;
    if (node.children) {
      node.children.forEach((child) => {
        this.calcRadius(child, node.radius);
      });
    }
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
    this.containerWidth = this.containerWidth - this.margin;
    this.containerHeight = this.containerHeight - this.margin;
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
   * scaling the radius, by the information of the height and width of the container where the tree should be displayed
   * @param  {Number} width
   * @param  {Number} height
   * @return {Number}
   */
  getMinDimension(width, height) {
    return Math.min(width, height);
  }





  /**
   * generating radial tree. Returns the tree with the coordinates to generate a tree with a radial Layout.
   * @return {root}
   */
  constructRadialTree() {
    this.root.data.length = 0;

    this.calcRadius(this.root, 0);
    this.traverse(this.root);
    this.calcAngle(this.root, Math.PI * 2, this.root.leaves().length);

    const minWindowSize = this.getMinDimension(
      this.containerWidth,
      this.containerHeight
    );

    const maxRadius = this.getMaxRadius(this.root);

    // Use standard scaling
    this.scale = this.calcScale(
      minWindowSize,
      maxRadius,
      2.0
    );

    this.scaleRadius(this.root, this.scale);
    this.generateCoordinates(this.root);

    return this.root;
  }

  /**
   * generating density-aware radial tree. Returns the tree with density-adjusted coordinates.
   * @param {boolean} enableDensityAware - Whether to apply density-aware positioning
   * @return {root}
   */
  constructDensityAwareRadialTree(enableDensityAware = true) {
    // First, construct the standard radial tree
    this.root.data.length = 0;

    this.calcRadius(this.root, 0);
    this.traverse(this.root);
    this.calcAngle(this.root, Math.PI * 2, this.root.leaves().length);

    // Apply density-aware adjustments before scaling and coordinate generation
    if (enableDensityAware) {
      this.adjustForDensity(this.root);
    }

    const minWindowSize = this.getMinDimension(
      this.containerWidth,
      this.containerHeight
    );

    const maxRadius = this.getMaxRadius(this.root);

    // Use standard scaling
    this.scale = this.calcScale(
      minWindowSize,
      maxRadius,
      2.0
    );

    this.scaleRadius(this.root, this.scale);
    this.generateCoordinates(this.root);

    return this.root;
  }

  /**
   * calculates the scale of how the tree should be scaled
   */
  calcScale(minWindowSize, maxRadius, factor) {
    // For comparison views, use more aggressive scaling to ensure trees fit
    const isComparison = this.containerWidth < 600 || this.containerHeight < 600;
    const adjustedFactor = isComparison ? factor * 0.8 : factor; // More conservative for comparisons

    return minWindowSize / adjustedFactor / maxRadius;
  }

  /**
   * Calculate density map for all leaves based on angular proximity
   * @param {Array} leaves - Array of leaf nodes
   * @return {Map} Map of leaf nodes to their density values
   */
  calculateDensityMap(leaves) {
    const densityMap = new Map();
    
    leaves.forEach(leaf => {
      const neighbors = this.getAngularNeighbors(leaf, leaves, this.angularResolution);
      const density = neighbors.length / this.angularResolution;
      densityMap.set(leaf, density);
    });
    
    return densityMap;
  }

  /**
   * Get neighboring leaves within angular range
   * @param {Object} targetLeaf - The leaf to find neighbors for
   * @param {Array} allLeaves - All leaf nodes
   * @param {number} range - Angular range in radians
   * @return {Array} Array of neighboring leaves
   */
  getAngularNeighbors(targetLeaf, allLeaves, range) {
    return allLeaves.filter(leaf => {
      if (leaf === targetLeaf) return false;
      const angleDiff = Math.abs(leaf.angle - targetLeaf.angle);
      const shortestAngleDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);
      return shortestAngleDiff <= range;
    });
  }

  /**
   * Adjust angles for density-aware positioning
   * @param {Object} leaf - The leaf node to adjust
   * @param {number} density - Calculated density value
   * @param {number} maxDensity - Maximum density in the tree
   * @return {number} Adjusted angle
   */
  redistributeAngle(leaf, density, maxDensity) {
    const baseAngle = leaf.angle;
    const densityFactor = Math.min(density / maxDensity, 1.0);
    
    // Calculate expansion offset based on density
    const expansion = densityFactor * this.angleExpansionFactor;
    
    // Simple offset calculation - can be enhanced with more sophisticated algorithms
    const angleOffset = expansion * (Math.random() - 0.5) * 0.1; // Small random offset
    
    return baseAngle + angleOffset;
  }

  /**
   * Adjust radius for density-aware positioning
   * @param {Object} leaf - The leaf node to adjust
   * @param {number} density - Calculated density value
   * @param {number} maxDensity - Maximum density in the tree
   * @return {number} Adjusted radius
   */
  adjustRadius(leaf, density, maxDensity) {
    const baseRadius = leaf.radius;
    const densityFactor = Math.min(density / maxDensity, 1.0);
    
    // Push dense nodes slightly outward
    const radiusAdjustment = densityFactor * this.radiusExpansionFactor;
    return baseRadius + radiusAdjustment;
  }

  /**
   * Apply density-aware adjustments to tree layout
   * @param {Object} root - Root node of the tree
   * @return {void}
   */
  adjustForDensity(root) {
    const leaves = root.leaves();
    if (leaves.length < 2) return; // No need for density adjustment with few leaves
    
    const densityMap = this.calculateDensityMap(leaves);
    const maxDensity = Math.max(...densityMap.values());
    
    if (maxDensity <= this.densityThreshold) return; // No dense regions found
    
    leaves.forEach(leaf => {
      const density = densityMap.get(leaf);
      if (density > this.densityThreshold) {
        leaf.angle = this.redistributeAngle(leaf, density, maxDensity);
        leaf.radius = this.adjustRadius(leaf, density, maxDensity);
      }
    });
  }

  /**
   * Set density-aware positioning configuration
   * @param {number} threshold - Density threshold for adjustment
   * @param {number} angleExpansion - Angle expansion factor
   * @param {number} radiusExpansion - Radius expansion factor
   * @return {void}
   */
  setDensityConfiguration(threshold, angleExpansion, radiusExpansion) {
    this.densityThreshold = threshold;
    this.angleExpansionFactor = angleExpansion;
    this.radiusExpansionFactor = radiusExpansion;
  }
}

export default function constructTree(
  tree,
  ignore_branch_lengths,
  options = {}
) {
  let d3tree = d3.hierarchy(tree);
  let treeConstructor = new TreeConstructor(d3tree, ignore_branch_lengths);

  let container;
  let width, height, margin;

  if (options.containerId) {
    container = document.getElementById(`${options.containerId}`);
    if (!container) {
      throw new Error(
        `TreeConstructor: Container element with id "${options.containerId}" not found.`
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

  treeConstructor.setDimension(width, height);

  // Use default margin if not provided
  margin = options.margin || 40;

  treeConstructor.setMargin(margin);

  // Configure density-aware positioning if specified
  if (options.densityAware) {
    if (options.densityThreshold !== undefined || 
        options.angleExpansion !== undefined || 
        options.radiusExpansion !== undefined) {
      treeConstructor.setDensityConfiguration(
        options.densityThreshold || 0.5,
        options.angleExpansion || 0.3,
        options.radiusExpansion || 10
      );
    }
  }

  // Use density-aware construction if requested
  let root_ = options.densityAware ? 
    treeConstructor.constructDensityAwareRadialTree(true) : 
    treeConstructor.constructRadialTree();

  // For comparison views, ensure the tree is sized appropriately
  const isComparison = options.containerId && options.containerId.includes('comparison');
  if (isComparison && options.maxRadius) {
    const currentMaxRadius = treeConstructor.getMaxRadius(root_);
    if (currentMaxRadius > options.maxRadius) {
      const adjustmentScale = options.maxRadius / currentMaxRadius * 0.9;
      treeConstructor.scaleRadius(root_, adjustmentScale);
      treeConstructor.generateCoordinates(root_);
    }
  }

  return {
    tree: root_,
    max_radius: treeConstructor.getMaxRadius(root_),
    width: width,
    height: height,
    margin: margin,
    scale: treeConstructor.scale
  };
}
