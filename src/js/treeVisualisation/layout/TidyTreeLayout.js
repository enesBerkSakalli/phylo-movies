import * as d3 from "d3";
import { getNodeKey } from '../utils/KeyGenerator.js';
import { transformBranchLengths } from '../../domain/tree/branchTransform.js';

/**
 * Tidy tree layout with radial projection and branch-length radii.
 * API-compatible with RadialTreeLayout for minimal integration changes.
 */
export class TidyTreeLayout {
  constructor(root) {
    const isHierarchyNode = root && typeof root.each === 'function' && root.data !== undefined;
    this.root = isHierarchyNode ? root : d3.hierarchy(root);
    this.containerWidth = 0;
    this.containerHeight = 0;
    this.margin = 0;
    this.scale = 0;
    this.angleExtent = Math.PI * 2;
    this.angleOffset = 0;
    this.preserveRadius = false;
    this.previousNodeRadii = new Map();
  }

  setAngleExtentDegrees(degrees = 360) {
    const clamped = typeof degrees === 'number' && isFinite(degrees) ? degrees : 360;
    this.angleExtent = (clamped * Math.PI) / 180;
  }

  setAngleExtentRadians(radians = Math.PI * 2) {
    const span = typeof radians === 'number' && isFinite(radians) ? radians : Math.PI * 2;
    this.angleExtent = span;
  }

  setAngleOffsetDegrees(degrees = 0) {
    const value = typeof degrees === 'number' && isFinite(degrees) ? degrees : 0;
    this.angleOffset = (value * Math.PI) / 180;
  }

  setAngleOffsetRadians(radians = 0) {
    const value = typeof radians === 'number' && isFinite(radians) ? radians : 0;
    this.angleOffset = value;
  }

  calcRadius(node, radius = 0) {
    const rawLength = node.data?.length ?? node.data?.branch_length ?? node.data?.branchLength;
    const length = node.parent ? (Number(rawLength) || 0) : 0;
    const nodeKey = getNodeKey(node);
    if (this.preserveRadius && this.previousNodeRadii.has(nodeKey)) {
      node.radius = this.previousNodeRadii.get(nodeKey);
    } else {
      node.radius = length + radius;
      this.previousNodeRadii.set(nodeKey, node.radius);
    }

    if (node.children) {
      node.children.forEach((child) => {
        this.calcRadius(child, node.radius);
      });
    }
  }

  setRadiusPreservation(preserve) {
    this.preserveRadius = preserve;
  }

  setDimension(width, height) {
    this.originalWidth = width;
    this.originalHeight = height;
    this.containerWidth = width;
    this.containerHeight = height;
  }

  setMargin(margin) {
    this.margin = margin;
    const baseWidth = this.originalWidth || this.containerWidth;
    const baseHeight = this.originalHeight || this.containerHeight;
    this.containerWidth = Math.max(1, baseWidth - this.margin * 2);
    this.containerHeight = Math.max(1, baseHeight - this.margin * 2);
  }

  generateCoordinates(root) {
    const offset = this.angleOffset || 0;
    root.each((d) => {
      const theta = (d.x || 0) + offset;
      d.rotatedAngle = theta;
      d.offset = offset;
      d.x = d.radius * Math.cos(theta);
      d.y = d.radius * Math.sin(theta);
    });
  }

  getMaxRadius(root) {
    let maxRadius = 0;
    root.each((d) => {
      if (d.radius > maxRadius) maxRadius = d.radius;
    });
    return maxRadius;
  }

  scaleRadius(root, scale) {
    root.each((d) => {
      d.radius = d.radius * scale;
    });
  }

  getMinContainerDimension(width, height) {
    return Math.min(width, height);
  }

  calculateContainerScale(minWindowSize, maxRadius, factor) {
    const isComparison = this.containerWidth < 600 || this.containerHeight < 600;
    const adjustedFactor = isComparison ? factor * 0.8 : factor;
    return minWindowSize / adjustedFactor / maxRadius;
  }

  cacheLeafCounts() {
    this.root.eachAfter((d) => {
      if (!d.children || d.children.length === 0) {
        d.leafCount = 1;
      } else {
        d.leafCount = d.children.reduce((sum, child) => sum + (child.leafCount || 0), 0);
      }
    });
  }

  applyTidyLayout() {
    this.cacheLeafCounts();

    // Use cluster (tidy radial) to spread leaves with subtree-aware separation
    const tidy = d3.cluster()
      .size([this.angleExtent, 1])
      .separation((a, b) => {
        const leafWeight = Math.max(1, ((a.leafCount || 1) + (b.leafCount || 1)) / 2);
        return (a.parent === b.parent ? 2 : 4) * leafWeight;
      });

    tidy(this.root);

    // Align tidy depth with our branch-length radii so scaling uses radii consistently
    this.root.each((d) => {
      d.y = d.radius || 0.0001; // prevent zero-depth collapse
    });
  }

  constructRadialTreeWithUniformScaling(maxGlobalScale) {
    this.calcRadius(this.root, 0);
    this.applyTidyLayout();

    const minWindowSize = this.getMinContainerDimension(this.containerWidth, this.containerHeight);
    // Guard against zero maxGlobalScale to prevent Infinity/NaN
    const safeMaxScale = (maxGlobalScale && maxGlobalScale > 0) ? maxGlobalScale : 1;
    const uniformScale = minWindowSize / (2.0 * safeMaxScale);
    this.scaleRadius(this.root, uniformScale);
    this.generateCoordinates(this.root);
    this.scale = uniformScale;

    return this.root;
  }

  constructRadialTree(useUniformScaling = false) {
    this.calcRadius(this.root, 0);
    this.applyTidyLayout();

    if (!useUniformScaling) {
      const minWindowSize = this.getMinContainerDimension(this.containerWidth, this.containerHeight);
      // Use projected radii for fit so scaling matches rendered positions
      const maxRadius = this.getMaxRadius(this.root);
      this.scale = this.calculateContainerScale(minWindowSize, maxRadius, 2.0);
      this.scaleRadius(this.root, this.scale);
    }

    this.generateCoordinates(this.root);
    return this.root;
  }
}

export default function createTidyTreeLayout(
  tree,
  branchTransformation = 'none',
  options = {}
) {
  const transformedTree = transformBranchLengths(tree, branchTransformation);
  const treeLayout = new TidyTreeLayout(transformedTree);

  let container;
  let width, height, margin;

  if (options.containerId) {
    container = document.getElementById(`${options.containerId}`);
    if (!container) {
      throw new Error(`TidyTreeLayout: Container element with id "${options.containerId}" not found.`);
    }
    const rect = container.getBoundingClientRect();
    width = options.width || rect.width || container.clientWidth || 400;
    height = options.height || rect.height || container.clientHeight || 400;
  } else {
    width = options.width || 800;
    height = options.height || 600;
  }

  width = Math.max(width, 200);
  height = Math.max(height, 200);

  treeLayout.setDimension(width, height);
  margin = options.margin || 40;
  treeLayout.setMargin(margin);

  const useUniformScaling = options.uniformScale !== undefined;
  let root_;

  if (useUniformScaling) {
    treeLayout.calcRadius(treeLayout.root, 0);
    treeLayout.applyTidyLayout();
    root_ = treeLayout.root;
    treeLayout.scaleRadius(root_, options.uniformScale);
    treeLayout.generateCoordinates(root_);
    treeLayout.scale = options.uniformScale;
  } else {
    root_ = treeLayout.constructRadialTree(false);
  }

  const isComparison = options.containerId && options.containerId.includes('comparison');
  if (isComparison && options.maxRadius && !useUniformScaling) {
    const currentMaxRadius = treeLayout.getMaxRadius(root_);
    if (currentMaxRadius > options.maxRadius) {
      const adjustmentScale = (options.maxRadius / currentMaxRadius) * 0.9;
      treeLayout.scaleRadius(root_, adjustmentScale);
      treeLayout.scale *= adjustmentScale;
      treeLayout.generateCoordinates(root_);
    }
  }

  return {
    tree: root_,
    max_radius: treeLayout.getMaxRadius(root_),
    width,
    height,
    margin,
    scale: treeLayout.scale,
  };
}
