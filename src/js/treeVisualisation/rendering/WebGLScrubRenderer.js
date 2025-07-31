// rendering/WebGLScrubRenderer.js
import { useAppStore } from '../../core/store.js';
import { LABEL_OFFSETS } from '../utils/LabelPositioning.js';
import { getLinkKey, getNodeKey } from '../utils/KeyGenerator.js';

/**
 * Specialized renderer for timeline scrubbing operations.
 * Provides optimized performance for rapid timeline interactions with:
 * - Complete element lifecycle management (enter/update/exit)
 * - Instant exit handling for responsive scrubbing
 * - Proper cleanup of exiting elements
 * - Consistent updates for extensions and labels
 */
export class WebGLScrubRenderer {
  constructor(controller) {
    this.controller = controller;
    this.linkRenderer = controller.linkRenderer;
    this.nodeRenderer = controller.nodeRenderer;
    this.extensionRenderer = controller.extensionRenderer;
    this.labelRenderer = controller.labelRenderer;
    this.updatePattern = controller.updatePattern;
  }

  /**
   * Renders a scrubbing frame with optimized performance for timeline interactions.
   * @param {Object} fromTreeData - Source tree data
   * @param {Object} toTreeData - Target tree data
   * @param {number} timeFactor - Interpolation factor (0-1)
   * @param {Object} [options={}] - Scrubbing-specific options
   * @param {Array} [options.highlightEdges=[]] - Edges to highlight during interpolation
   * @param {string} [options.direction='forward'] - Navigation direction for proper element handling
   * @param {boolean} [options.isFinalization=false] - Whether this is the final scrubbing frame
   * @param {boolean} [options.skipExtensions=false] - Whether to skip extension rendering for performance
   * @param {boolean} [options.skipLabels=false] - Whether to skip label rendering for performance
   * @param {number} [options.fromTreeIndex] - Index of source tree for cache lookup
   * @param {number} [options.toTreeIndex] - Index of target tree for cache lookup
   */
  async renderScrubFrame(fromTreeData, toTreeData, timeFactor, options = {}) {
    const {
      highlightEdges = [],
      direction = 'forward',
      isFinalization = false,
      skipExtensions = false,
      skipLabels = false,
      fromTreeIndex,
      toTreeIndex
    } = options;

    // Ensure timeFactor is valid
    let t = Math.max(0, Math.min(1, timeFactor));
    if (fromTreeData === toTreeData) t = 0;

    // Get cached layouts for performance
    const storeState = useAppStore.getState();
    const {
      getLayoutCache,
      cacheTreePositions
    } = storeState;

    // Get uniform scaling configuration from controller for consistent scaling
    const uniformScalingConfig = this.controller.getUniformScalingConfig();

    // Use cache if available, otherwise calculate efficiently
    let layoutFrom, layoutTo;

    if (fromTreeIndex !== undefined) {
      layoutFrom = getLayoutCache(fromTreeIndex);
      if (!layoutFrom) {
        layoutFrom = this.controller.calculateLayout(fromTreeData, {
          treeIndex: fromTreeIndex,
          cacheFunction: cacheTreePositions
        });
      }
    } else {
      layoutFrom = this.controller.calculateLayout(fromTreeData);
    }

    if (toTreeIndex !== undefined) {
      layoutTo = getLayoutCache(toTreeIndex);
      if (!layoutTo) {
        layoutTo = this.controller.calculateLayout(toTreeData, {
          treeIndex: toTreeIndex,
          cacheFunction: cacheTreePositions
        });
      }
    } else {
      layoutTo = this.controller.calculateLayout(toTreeData);
    }

    // Ensure initial radius is set - use uniform scaling if available
    this.controller._ensureInitialRadius(layoutTo.tree, 'during scrubbing');

    // Calculate radii using the unified radius calculation system
    // This ensures consistency with the main TreeAnimationController
    const { extensionRadius, labelRadius } = this.controller._getConsistentRadii();

    // Use optimized element diffing for scrubbing
    const isBackwardNavigation = direction === 'backward';
    const allUpdates = isBackwardNavigation
      ? this.updatePattern.diffAllElements(layoutFrom.tree, layoutTo.tree)
      : this.updatePattern.diffAllElements(layoutTo.tree, layoutFrom.tree);
    const filteredData = this.updatePattern.extractFilteredData(allUpdates);

    // Execute complete scrubbing interpolation with element lifecycle
    try {
      // Handle exiting elements - INSTANT removal for scrubbing responsiveness
      if (filteredData.links.exit.length > 0) {
        this.linkRenderer.handleExitingLinks(filteredData.links.exit, 0); // Instant exit
      }

      if (filteredData.nodes.exit.length > 0) {
        this.nodeRenderer.handleExitingNodes(filteredData.nodes.exit, 0); // Instant exit
      }

      // Handle entering elements
      if (filteredData.links.enter.length > 0) {
        this.linkRenderer.handleEnteringLinks(
          filteredData.links.enter,
          t,
          highlightEdges
        );
      }

      if (filteredData.nodes.enter.length > 0) {
        this.nodeRenderer.handleEnteringNodes(
          filteredData.nodes.enter,
          this._getNodeMap(layoutTo.tree),
          t
        );
      }

      // Always handle updating elements (core of scrubbing)
      if (filteredData.links.update.length > 0) {
        const fromLinksMap = this._getLinkMap(layoutFrom.tree);
        const toLinksMap = this._getLinkMap(layoutTo.tree);
        this.linkRenderer.handleUpdatingLinks(
          filteredData.links.update,
          fromLinksMap,
          toLinksMap,
          t,
          highlightEdges
        );
      }

      if (filteredData.nodes.update.length > 0) {
        const fromNodesMap = this._getNodeMap(layoutFrom.tree);
        const toNodesMap = this._getNodeMap(layoutTo.tree);
        this.nodeRenderer.handleUpdatingNodes(
          filteredData.nodes.update,
          fromNodesMap,
          toNodesMap,
          t
        );
      }

      // Handle extensions - always update during scrubbing for consistency
      if (!skipExtensions) {
        const fromLeaves = layoutFrom.tree.leaves();
        const toLeaves = layoutTo.tree.leaves();
        this.extensionRenderer?.renderExtensionsInterpolated(
          fromLeaves,
          toLeaves,
          extensionRadius,
          extensionRadius,
          t
        );
      }

      // Handle labels - always update during scrubbing for consistency
      if (!skipLabels) {
        const fromLeaves = layoutFrom.tree.leaves();
        const toLeaves = layoutTo.tree.leaves();
        this.labelRenderer?.renderLabelsInterpolated(
          fromLeaves,
          toLeaves,
          labelRadius,
          labelRadius,
          t
        );
      }

      // Force immediate render for scrubbing responsiveness
      this.controller.renderScene();

      // Validate renderer state consistency and clean up orphaned elements during scrubbing
      const currentLeaves = layoutTo.tree.leaves();
      const currentNodes = layoutTo.tree.descendants();
      const currentLinks = layoutTo.tree.links();
      this._validateAndCleanupRendererState(filteredData, currentLinks, currentNodes, currentLeaves);

      // Validate scaling consistency during scrubbing
      this._validateScalingConsistency(layoutFrom, layoutTo, uniformScalingConfig);

      // Validate end state consistency and clear caches if needed (especially during finalization)
      if (isFinalization || t >= 0.95) {
        this._validateEndStateAndClearCaches(layoutTo, t, isBackwardNavigation);
      }

    } catch (error) {
      console.error('[WebGLScrubRenderer] Error during scrub frame rendering:', error);
      throw error;
    }
  }

  /**
   * Creates a Map of nodes keyed by unique identifiers for interpolation
   * @param {Object} tree - The tree data structure
   * @returns {Map} Map of nodes with keys for efficient lookup
   * @private
   */
  _getNodeMap(tree) {
    const nodesMap = new Map();
    const nodes = tree.descendants();
    for (const node of nodes) {
      nodesMap.set(getNodeKey(node), node);
    }
    return nodesMap;
  }

  /**
   * Creates a Map of links keyed by unique identifiers for interpolation
   * @param {Object} tree - The tree data structure
   * @returns {Map} Map of links with keys for efficient lookup
   * @private
   */
  _getLinkMap(tree) {
    const linksMap = new Map();
    const links = tree.links();
    for (const link of links) {
      linksMap.set(getLinkKey(link), link);
    }
    return linksMap;
  }

  /**
   * Validates renderer state consistency and cleans up orphaned elements during scrubbing.
   * Ensures all renderers maintain correct element counts during rapid timeline interactions.
   * @private
   * @param {Object} filteredData - Filtered element data from diffing
   * @param {Array} currentLinks - Current link elements
   * @param {Array} currentNodes - Current node elements
   * @param {Array} currentLeaves - Current leaf elements
   */
  _validateAndCleanupRendererState(filteredData, currentLinks, currentNodes, currentLeaves) {
    // Validate each renderer's state
    if (this.linkRenderer._validateCurrentState) {
      this.linkRenderer._validateCurrentState(
        currentLinks,
        filteredData.links.enter,
        filteredData.links.update,
        filteredData.links.exit
      );
    }

    if (this.nodeRenderer._validateCurrentState) {
      this.nodeRenderer._validateCurrentState(
        currentNodes,
        filteredData.nodes.enter,
        filteredData.nodes.update,
        filteredData.nodes.exit
      );
    }

    // Extensions and labels use leaves for validation
    if (this.extensionRenderer._validateCurrentState) {
      this.extensionRenderer._validateCurrentState(
        currentLeaves,
        filteredData.leaves.enter,
        filteredData.leaves.update,
        filteredData.leaves.exit
      );
    }

    if (this.labelRenderer._validateCurrentState) {
      this.labelRenderer._validateCurrentState(
        currentLeaves,
        filteredData.leaves.enter,
        filteredData.leaves.update,
        filteredData.leaves.exit
      );
    }
  }


  /**
   * Validates scaling consistency between layouts during scrubbing.
   * Ensures uniform scaling is being applied consistently across interpolated frames.
   * @private
   * @param {Object} layoutFrom - Source layout structure
   * @param {Object} layoutTo - Target layout structure
   * @param {Object} uniformScalingConfig - Uniform scaling configuration
   */
  _validateScalingConsistency(layoutFrom, layoutTo, uniformScalingConfig) {
    if (uniformScalingConfig.enabled && uniformScalingConfig.maxGlobalScale) {
      // Check if both layouts are using consistent scaling
      const fromScale = layoutFrom.scale;
      const toScale = layoutTo.scale;

      // Allow for small floating point differences but detect major inconsistencies
      const scaleDifference = Math.abs(fromScale - toScale);
      const maxExpectedDifference = uniformScalingConfig.maxGlobalScale * 0.1; // 10% tolerance

      if (scaleDifference > maxExpectedDifference) {
        console.warn(`[WebGLScrubRenderer] Scaling inconsistency detected during scrubbing`, {
          fromScale: fromScale.toFixed(6),
          toScale: toScale.toFixed(6),
          difference: scaleDifference.toFixed(6),
          maxGlobalScale: uniformScalingConfig.maxGlobalScale,
          uniformScalingEnabled: uniformScalingConfig.enabled
        });
      }
    }
  }

  /**
   * Validates end state consistency and clears caches if mismatches detected during scrubbing.
   * Optimized for scrubbing performance - only validates when necessary.
   * @private
   * @param {Object} layoutTo - Target layout structure
   * @param {number} timeFactor - Current interpolation time factor (0-1)
   * @param {boolean} isBackwardNavigation - Whether this is backward navigation
   */
  _validateEndStateAndClearCaches(layoutTo, timeFactor, isBackwardNavigation) {
    // Only validate at transition completion (t=1) or near completion (t>0.95)
    if (timeFactor < 0.95) return;

    // OPTIMIZED: Single store access with cache management functions
    const storeState = useAppStore.getState();
    const { currentTreeIndex, clearPositionCache, clearLayoutCache } = storeState;

    // For backward navigation, check if we've reached the expected state
    if (isBackwardNavigation) {
      // Get expected renderer counts from target layout
      const expectedLinks = layoutTo.tree.links().length;
      const expectedNodes = layoutTo.tree.descendants().length;
      const expectedLeaves = layoutTo.tree.leaves().length;

      // Get actual renderer counts
      const actualLinks = this.linkRenderer.linkMeshes.size;
      const actualNodes = this.nodeRenderer.leafMeshes.size + this.nodeRenderer.internalMeshes.size;

      // Check for significant mismatches that indicate stale cache data
      const linkMismatch = Math.abs(actualLinks - expectedLinks) > 0;
      const nodeMismatch = Math.abs(actualNodes - expectedNodes) > 1; // Allow small tolerance

      if (linkMismatch || nodeMismatch) {
        console.warn(`[WebGLScrubRenderer] End state mismatch detected during scrubbing - clearing caches`, {
          expected: { links: expectedLinks, nodes: expectedNodes, leaves: expectedLeaves },
          actual: { links: actualLinks, nodes: actualNodes },
          treeIndex: currentTreeIndex,
          timeFactor: timeFactor.toFixed(3)
        });

        // Clear caches to prevent stale data persistence
        clearPositionCache();
        clearLayoutCache();

        // Clear renderer-level cached data via controller
        this.controller._clearRendererCaches();
      }
    }
  }
}

