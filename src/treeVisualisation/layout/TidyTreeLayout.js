import { cluster, hierarchy } from "d3-hierarchy";
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

/**
 * Tidy tree layout with radial projection and branch-length radii.
 * API-compatible with RadialTreeLayout for minimal integration changes.
 */
export class TidyTreeLayout {
  constructor(root) {
    const isHierarchyNode = root && typeof root.each === 'function' && root.data !== undefined;
    this.root = isHierarchyNode ? root : hierarchy(root);
    initializeLayoutState(this);
  }

  setAngleExtentDegrees(degrees = 360) {
    setAngleExtentDegrees(this, degrees);
  }

  setAngleExtentRadians(radians = Math.PI * 2) {
    setAngleExtentRadians(this, radians);
  }

  setAngleOffsetDegrees(degrees = 0) {
    setAngleOffsetDegrees(this, degrees);
  }

  setAngleOffsetRadians(radians = 0) {
    setAngleOffsetRadians(this, radians);
  }

  calcRadius(node, radius = 0) {
    calculateBranchLengthRadii(this, node, radius);
  }

  setRadiusPreservation(preserve) {
    setRadiusPreservation(this, preserve);
  }

  setDimension(width, height) {
    setLayoutDimensions(this, width, height);
  }

  setMargin(margin) {
    setLayoutMargin(this, margin);
  }

  generateCoordinates(root) {
    generatePolarCoordinates(root, (node) => node.x, this.angleOffset);
  }

  getMaxRadius(root) {
    return getMaxRadius(root);
  }

  scaleRadius(root, scale) {
    scaleRadius(root, scale);
  }

  getMinContainerDimension(width, height) {
    return getMinContainerDimension(width, height);
  }

  calculateContainerScale(minWindowSize, maxRadius, factor) {
    return calculateContainerScale(this.containerWidth, this.containerHeight, minWindowSize, maxRadius, factor);
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
    const tidy = cluster()
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
    const uniformScale = calculateUniformScale(minWindowSize, maxGlobalScale);
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
  const { width, height, margin } = normalizeLayoutOptions(options);

  treeLayout.setDimension(width, height);
  treeLayout.setMargin(margin);

  const useUniformScaling = options.uniformScale !== undefined;
  let root_;

  if (useUniformScaling) {
    treeLayout.calcRadius(treeLayout.root, 0);
    treeLayout.applyTidyLayout();
    root_ = treeLayout.root;
    const uniformScale = normalizeUniformScale(options.uniformScale);
    treeLayout.scaleRadius(root_, uniformScale);
    treeLayout.generateCoordinates(root_);
    treeLayout.scale = uniformScale;
  } else {
    root_ = treeLayout.constructRadialTree(false);
  }

  return createLayoutResult(root_, {
    max_radius: treeLayout.getMaxRadius(root_),
    width,
    height,
    margin,
    scale: treeLayout.scale,
  });
}
