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
   * Calculate dynamic padding based on label lengths and font size
   * @param {Object} root - The tree root
   * @param {number} fontSize - Font size in em units
   * @returns {number} Calculated padding in pixels
   */
  calculateDynamicPadding(root, fontSize = 1.7) {
    const leaves = root.leaves();
    if (leaves.length === 0) return 40; // Default fallback

    // Calculate average label length
    const totalLength = leaves.reduce((sum, leaf) => {
      return sum + (leaf.data.name ? leaf.data.name.length : 0);
    }, 0);
    const averageLabelLength = totalLength / leaves.length;

    // Convert font size (em) to approximate pixels (assuming 1em ≈ 16px)
    const fontSizePixels = fontSize * 16;

    // Estimate character width (approximately 0.6 * font size for monospace-like fonts)
    const characterWidth = fontSizePixels * 0.6;

    // Calculate padding based on average label width
    const estimatedLabelWidth = averageLabelLength * characterWidth;

    // Add some buffer (20% extra) and ensure minimum padding
    const dynamicPadding = Math.max(estimatedLabelWidth * 1.2, 40);

    // Cap maximum padding to prevent excessive spacing
    const maxPadding = Math.min(this.containerWidth, this.containerHeight) * 0.3;

    return Math.min(dynamicPadding, maxPadding);
  }

  /**
   * Enhanced scaling calculation that considers label space requirements
   * @param {number} minWindowSize - Minimum window dimension
   * @param {number} maxRadius - Maximum radius of tree
   * @param {number} factor - Base scaling factor
   * @param {number} labelPadding - Required padding for labels
   * @returns {number} Calculated scale
   */
  calcScaleWithLabelPadding(minWindowSize, maxRadius, factor, labelPadding) {
    // Reserve space for labels on both sides, but be more conservative
    const totalLabelSpace = labelPadding * 2.5; // More generous label space
    const availableSpace = minWindowSize - totalLabelSpace;

    // Ensure we have enough space for the tree (minimum 40% of container)
    const minimumSpace = Math.max(availableSpace, minWindowSize * 0.4);

    // For comparison views, use more conservative scaling
    const isComparison = this.containerWidth < 600 || this.containerHeight < 600;
    const adjustedFactor = isComparison ? factor * 0.6 : factor * 0.8; // More conservative

    const calculatedScale = minimumSpace / adjustedFactor / maxRadius;

    // Ensure minimum scale to prevent trees from being too small
    const minScale = 0.1;

    return Math.max(calculatedScale, minScale);
  }

  /**
   * generating radial tree. Returns the tree with the coordinates to generate a tree with a radial Layout.
   * Enhanced with dynamic padding calculation
   * @param {number} fontSize - Font size for label padding calculation
   * @return {root}
   */
  constructRadialTree(fontSize = 1.7) {
    this.root.data.length = 0;

    this.calcRadius(this.root, 0);
    this.traverse(this.root);
    this.calcAngle(this.root, Math.PI * 2, this.root.leaves().length);

    const minWindowSize = this.getMinDimension(
      this.containerWidth,
      this.containerHeight
    );

    const maxRadius = this.getMaxRadius(this.root);

    // Calculate dynamic padding based on label requirements
    const labelPadding = this.calculateDynamicPadding(this.root, fontSize);

    // Use enhanced scaling that considers label space
    this.scale = this.calcScaleWithLabelPadding(
      minWindowSize,
      maxRadius,
      2.0,
      labelPadding
    );

    this.scaleRadius(this.root, this.scale);
    this.generateCoordinates(this.root);

    // Store calculated padding for use by renderer
    this.calculatedPadding = labelPadding;

    console.log("TreeConstructor: Calculated padding:", labelPadding);
    console.log("TreeConstructor: Applied scale:", this.scale);
    console.log("TreeConstructor: Final max radius:", this.getMaxRadius(this.root));

    return this.root;
  }

  /**
   * calculates the scale of how the tree should be scaled
   * Enhanced for comparison views
   */
  calcScale(minWindowSize, maxRadius, factor) {
    // For comparison views, use more aggressive scaling to ensure trees fit
    const isComparison = this.containerWidth < 600 || this.containerHeight < 600;
    const adjustedFactor = isComparison ? factor * 0.8 : factor; // More conservative for comparisons

    return minWindowSize / adjustedFactor / maxRadius;
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

  // Get font size from options for padding calculation
  const fontSize = options.fontSize || 1.7;

  treeConstructor.setDimension(width, height);

  // Calculate dynamic margin if not provided
  if (!options.margin) {
    // Use dynamic padding calculation for initial margin estimation
    const tempRoot = treeConstructor.constructRadialTree(fontSize);
    margin = treeConstructor.calculatedPadding;

    // Reset for proper construction with calculated margin
    treeConstructor = new TreeConstructor(d3tree, ignore_branch_lengths);
    treeConstructor.setDimension(width, height);
  } else {
    margin = options.margin;
  }

  treeConstructor.setMargin(margin);

  let root_ = treeConstructor.constructRadialTree(fontSize);

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
    scale: treeConstructor.scale,
    labelPadding: treeConstructor.calculatedPadding || margin
  };
}
