import { cluster, hierarchy } from 'd3-hierarchy';
import { transformBranchLengths } from '../../domain/tree/branchTransform.js';
import { createLayoutResult } from './LayoutResultAdapter.js';
import { applyEqualAngleLayout, normalizeEqualAngleExtent } from './EqualAngleLayout.js';
import { fitTaxonNames } from '../../domain/tree/shortTaxonNames.js';
import { textWidthPx } from '../../domain/tree/textWidth.js';
import {
  LABEL_GAP_PX,
  RADIAL_NAME_BUDGET_EM,
} from '../deckgl/builders/data/labels/LabelDataBuilder.js';
import {
  labelPixelSize,
  minNameSpacingPx,
} from '../deckgl/layers/factory/labels/LabelLayers.js';
import { NAME_BOX_PAD_PX } from '../deckgl/layers/factory/labels/labelThinning.js';
import { applyRectangularLayout } from './RectangularLayout.js';
import { LAYOUT_PROJECTION_MODES } from './hyperbolicProjection/constants.js';
import {
  assignLayoutNodeIds,
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
  setRadiusPreservation,
} from './LayoutBaseUtils.js';

/**
 * Tidy tree layout with radial projection and branch-length radii.
 */
// Daylight makes room for names as drawn when the whole tree fits a canvas about this wide; a
// fixed width keeps the layout the same at every window size.
const UNROOTED_LABEL_FIT_PX = 800;

/** The names an unrooted tree draws, as label boxes for daylight (see applyEqualAngleLayout). */
function unrootedLabelBoxes(root) {
  const names = root.leaves().map((leaf) => leaf.data?.name ?? '');
  // The text the label layer draws: long names are cut to the same width budget.
  const shown = fitTaxonNames(names, RADIAL_NAME_BUDGET_EM);
  const sizePx = labelPixelSize();
  return {
    widthPx: (leaf) => textWidthPx(shown.get(leaf.data?.name) ?? leaf.data?.name ?? '', sizePx),
    gapPx: LABEL_GAP_PX,
    heightPx: sizePx,
    padPx: NAME_BOX_PAD_PX,
    referencePx: UNROOTED_LABEL_FIT_PX,
    namePitchPx: minNameSpacingPx(LAYOUT_PROJECTION_MODES.UNROOTED),
  };
}

export class TidyTreeLayout {
  constructor(root) {
    const isHierarchyNode = root && typeof root.each === 'function' && root.data !== undefined;
    this.root = isHierarchyNode ? root : hierarchy(root);
    initializeLayoutState(this);
    assignLayoutNodeIds(this.root);
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
    return calculateContainerScale(
      this.containerWidth,
      this.containerHeight,
      minWindowSize,
      maxRadius,
      factor
    );
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
        const aLeafCount = a.leafCount ?? 1;
        const bLeafCount = b.leafCount ?? 1;
        const leafWeight = Math.max(0.1, (aLeafCount + bLeafCount) / 2);
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
    this.uniformScale = uniformScale;
    this.scale = uniformScale;

    return this.root;
  }

  /**
   * Equal-angle unrooted embedding. Deliberately skips calcRadius, the tidy
   * pass and container scaling: position accumulates along edges in
   * branch-length units, so there is no radius to fit and no centre to fit it
   * to. Scale stays 1 and the viewport does the work.
   */
  constructUnrootedTree({ labelsVisible = false } = {}) {
    applyEqualAngleLayout(this.root, {
      angleOffset: this.angleOffset,
      labels: labelsVisible ? unrootedLabelBoxes(this.root) : undefined,
    });
    // Normalised to a fixed world size, deliberately not to the container:
    // the layout must not change when the window does.
    this.scale = normalizeEqualAngleExtent(this.root);
    this.uniformScale = undefined;
    return this.root;
  }

  /** Rectangular phylogram in a fixed world extent; see RectangularLayout.js. */
  constructRectangularTree() {
    this.scale = applyRectangularLayout(this.root);
    this.uniformScale = undefined;
    return this.root;
  }

  constructRadialTree(useUniformScaling = false) {
    this.calcRadius(this.root, 0);
    this.applyTidyLayout();

    if (!useUniformScaling) {
      const minWindowSize = this.getMinContainerDimension(
        this.containerWidth,
        this.containerHeight
      );
      // Use projected radii for fit so scaling matches rendered positions
      const maxRadius = this.getMaxRadius(this.root);
      this.scale = this.calculateContainerScale(minWindowSize, maxRadius, 2.0);
      this.scaleRadius(this.root, this.scale);
    }

    this.generateCoordinates(this.root);
    return this.root;
  }
}

export default function createTidyTreeLayout(tree, branchTransformation = 'none', options = {}) {
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
    treeLayout.uniformScale = uniformScale;
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
    uniformScale: treeLayout.uniformScale,
  });
}
