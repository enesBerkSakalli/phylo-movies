import { TidyTreeLayout } from '@/core/treeVisualisation/layout/TidyTreeLayout.js';
import { useAppStore } from '@/store/store.js';
import calculateScales, { getMaxScaleValue } from '@/utils/tree/scaleUtils.js';
import { transformBranchLengths } from '@/utils/tree/branchTransform.js';

export class TreeLayoutService {
  constructor(getWidth, getHeight) {
    this.getWidth = getWidth;
    this.getHeight = getHeight;

    this._scalingState = {
      branchTransformation: undefined,
      calculationTransformation: 'none'
    };
    this._transformedCache = new Map();
    
    this.globalScaleList = null;
    this.maxGlobalScale = null;
    this.uniformScalingEnabled = false;
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  updateLayout(treeData, treeIndex = 0, cacheFunction = null) {
    return this.calculateLayout(treeData, {
      treeIndex,
      cacheFunction,
      updateController: true
    });
  }

  // ==========================================================================
  // UNIFORM SCALING
  // ==========================================================================

  initializeUniformScaling(branchTransformation = 'none') {
    const { treeList, transitionResolver } = useAppStore.getState();
    const datasetToken = `${branchTransformation}::${treeList?.length || 0}`;

    if (this._isScalingCacheValid(branchTransformation, datasetToken, treeList)) {
      return;
    }

    const fullTreeIndices = transitionResolver?.fullTreeIndices || Array.from({ length: treeList.length }, (_, i) => i);
    const transformedTreeList = this._getOrCacheTransformedTrees(treeList, branchTransformation);

    this.globalScaleList = calculateScales(transformedTreeList, fullTreeIndices);
    this.maxGlobalScale = Math.max(...this.globalScaleList); // Simplified: getMaxScaleValue(this.globalScaleList);
    this.uniformScalingEnabled = true;

    this._scalingState.calculationTransformation = branchTransformation;
    this._scalingState.datasetToken = datasetToken;
    this._scalingState.datasetRef = treeList;
  }

  _isScalingCacheValid(branchTransformation, datasetToken, treeList) {
    return (
      this.uniformScalingEnabled &&
      this.maxGlobalScale &&
      this._scalingState.calculationTransformation === branchTransformation &&
      this._scalingState.datasetToken === datasetToken &&
      this._scalingState.datasetRef === treeList
    );
  }

  _recalculateUniformScalingForTransformation(newTransformation) {
    if (this._scalingState.calculationTransformation !== newTransformation) {
      this.initializeUniformScaling(newTransformation);
    }
  }

  // ==========================================================================
  // LAYOUT CALCULATION
  // ==========================================================================

  calculateLayout(treeData, options = {}) {
    const { treeIndex, cacheFunction, updateController = false } = options;
    const { branchTransformation, layoutAngleDegrees, layoutRotationDegrees } = useAppStore.getState();

    if (!this.uniformScalingEnabled) {
      this.initializeUniformScaling(branchTransformation);
    } else {
      this._handleTransformationChange(branchTransformation);
    }

    const transformedTreeData = this._getTransformedTreeData(treeData, branchTransformation, treeIndex);
    if (!transformedTreeData) {
      console.warn('calculateLayout: No tree data available');
      return null;
    }

    const layout = this._computeLayout(transformedTreeData, layoutAngleDegrees, layoutRotationDegrees);

    if (updateController && cacheFunction && treeIndex !== undefined) {
      cacheFunction(treeIndex, layout);
    }

    return layout;
  }

  _handleTransformationChange(branchTransformation) {
    const transformationChanged = this._scalingState.branchTransformation !== undefined &&
      this._scalingState.branchTransformation !== branchTransformation;

    if (transformationChanged && this.uniformScalingEnabled) {
      this._recalculateUniformScalingForTransformation(branchTransformation);
    }

    this._scalingState.branchTransformation = branchTransformation;
  }

  _getTransformedTreeData(treeData, branchTransformation, treeIndex) {
    const cached = this._transformedCache.get(branchTransformation);
    if (cached && cached.transformedList && typeof treeIndex === 'number') {
      return cached.transformedList[treeIndex];
    }
    if (treeData) {
      return transformBranchLengths(treeData, branchTransformation);
    }
    return null;
  }

  _computeLayout(transformedTreeData, layoutAngleDegrees, layoutRotationDegrees) {
    const layoutCalculator = new TidyTreeLayout(transformedTreeData);
    const width = this.getWidth();
    const height = this.getHeight();
    layoutCalculator.setDimension(width, height);
    layoutCalculator.setMargin(60);
    layoutCalculator.setAngleExtentDegrees(layoutAngleDegrees || 360);
    layoutCalculator.setAngleOffsetDegrees(layoutRotationDegrees || 0);

    const layoutResult = this.uniformScalingEnabled && this.globalScaleList && this.maxGlobalScale
      ? layoutCalculator.constructRadialTreeWithUniformScaling(this.maxGlobalScale)
      : layoutCalculator.constructRadialTree();

    return {
      tree: layoutResult,
      max_radius: layoutCalculator.getMaxRadius(layoutResult),
      width: width,
      height: height,
      margin: layoutCalculator.margin,
      scale: layoutCalculator.scale
    };
  }

  // ==========================================================================
  // RADII CALCULATION
  // ==========================================================================

  getConsistentRadii(layout) {
    const containerWidth = layout.width - layout.margin * 2;
    const containerHeight = layout.height - layout.margin * 2;
    const maxLeafRadius = Math.min(containerWidth, containerHeight) / 2;

    const { styleConfig } = useAppStore.getState();
    const offsets = styleConfig?.labelOffsets || { DEFAULT: 20, EXTENSION: 5 };

    const extensionRadius = maxLeafRadius + (offsets.EXTENSION ?? 5);
    const labelRadius = extensionRadius + (offsets.DEFAULT ?? 20);

    return {
      extensionRadius,
      labelRadius,
    };
  }

  // ==========================================================================
  // TREE TRANSFORMATION CACHE
  // ==========================================================================

  _getOrCacheTransformedTrees(treeList, branchTransformation) {
    const cached = this._transformedCache.get(branchTransformation);
    if (cached && cached.sourceList === treeList) {
      return cached.transformedList;
    }

    const transformedList = branchTransformation !== 'none'
      ? treeList.map(treeData => transformBranchLengths(treeData, branchTransformation))
      : treeList;

    this._transformedCache.set(branchTransformation, {
      sourceList: treeList,
      transformedList
    });

    return transformedList;
  }
}
