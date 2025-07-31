// InterpolationEngine.js
import { getLinkKey, getNodeKey } from '../utils/KeyGenerator.js';
import { useAppStore } from '../../core/store.js';

/**
 * InterpolationEngine - Handles staged interpolation animation sequences
 * Extracted from WebGLTreeAnimationController for better modularity
 */
export class InterpolationEngine {
  /**
   * @param {Object} controller - Reference to the main WebGLTreeAnimationController
   */
  constructor(controller) {
    this.controller = controller;
  }

  /* ------------------------------------------------------------------ */
  /* Small helpers (do NOT change staging logic)                        */
  /* ------------------------------------------------------------------ */

  /**
   * One-frame wait helper.
   * @returns {Promise<void>}
   * @private
   */
  _nextFrame() {
    return new Promise(resolve => requestAnimationFrame(resolve));
  }

  /**
   * Waits until condition is true or timeout passes.
   * Tries once per frame.
   * @param {Function} condFn
   * @param {number} timeoutMs
   * @param {string} label - for logging
   * @returns {Promise<void>}
   * @private
   */
  _waitForCondition(condFn, timeoutMs, label) {
    const deadline = performance.now() + timeoutMs;

    return new Promise(resolve => {
      const loop = () => {
        if (condFn() || performance.now() > deadline) {
          if (!condFn()) {
            console.warn(`[InterpolationEngine] ${label} check timed out after ${timeoutMs}ms, continuing.`);
          }
          resolve();
        } else {
          requestAnimationFrame(loop);
        }
      };
      requestAnimationFrame(loop);
    });
  }

  /**
   * Gets cached tree maps from store or creates them from tree data as fallback
   * Optimized to minimize expensive tree traversals during animation
   * @param {Object} ctx - Interpolation context
   * @returns {Object} Maps with fromLinksMap, toLinksMap, fromNodesMap, toNodesMap
   * @private
   */
  _getTreeMapsFromStore(ctx) {
    const { fromTreeIndex, toTreeIndex, fromTreeData, toTreeData } = ctx;
    const store = useAppStore.getState();

    // Cache check with fast path for most common case
    const fromPositions = store.getTreePositions(fromTreeIndex);
    const toPositions = store.getTreePositions(toTreeIndex);

    // Fast path: if we have cached positions, rebuild efficiently
    if (fromPositions && toPositions) {
      // Optimized map creation - minimal tree traversals
      const fromLinksMap = new Map();
      const toLinksMap = new Map();
      const fromNodesMap = new Map();
      const toNodesMap = new Map();

      // Single traversal for each tree type instead of multiple calls
      const fromLinks = fromTreeData.links();
      const toLinks = toTreeData.links();
      const fromNodes = fromTreeData.descendants();
      const toNodes = toTreeData.descendants();

      // Batch map population - more efficient than individual forEach calls
      for (const link of fromLinks) {
        fromLinksMap.set(getLinkKey(link), link);
      }
      for (const link of toLinks) {
        toLinksMap.set(getLinkKey(link), link);
      }
      for (const node of fromNodes) {
        fromNodesMap.set(getNodeKey(node), node);
      }
      for (const node of toNodes) {
        toNodesMap.set(getNodeKey(node), node);
      }

      return { fromLinksMap, toLinksMap, fromNodesMap, toNodesMap };
    }

    // Fallback: create maps directly (store cache miss)
    // Use optimized construction to minimize allocations
    return {
      fromLinksMap: new Map(fromTreeData.links().map(l => [getLinkKey(l), l])),
      toLinksMap: new Map(toTreeData.links().map(l => [getLinkKey(l), l])),
      fromNodesMap: new Map(fromTreeData.descendants().map(n => [getNodeKey(n), n])),
      toNodesMap: new Map(toTreeData.descendants().map(n => [getNodeKey(n), n]))
    };
  }

  _hasExitingElements(filteredData) {
    return (filteredData.links?.exit?.length > 0 ||
            filteredData.nodes?.exit?.length > 0 ||
            filteredData.leaves?.exit?.length > 0);
  }

  _hasEnteringElements(filteredData) {
    return (filteredData.links?.enter?.length > 0 ||
            filteredData.nodes?.enter?.length > 0 ||
            filteredData.leaves?.enter?.length > 0);
  }

  _hasUpdatingElements(filteredData) {
    return (filteredData.links?.update?.length > 0 ||
            filteredData.nodes?.update?.length > 0 ||
            filteredData.leaves?.update?.length > 0);
  }

  /* ------------------------------------------------------------------ */
  /* Main staging entry                                                 */
  /* ------------------------------------------------------------------ */

  /**
   * Execute staged interpolation sequence with conditional logic based on element states
   * Optimized for maximum animation performance - minimal blocking operations
   */
  async executeInterpolationStaging(filteredData, interpolationContext) {
    const hasExiting  = this._hasExitingElements(filteredData);
    const hasEntering = this._hasEnteringElements(filteredData);
    const hasUpdating = this._hasUpdatingElements(filteredData);

    // Ensure filteredData is accessible inside other methods
    interpolationContext.filteredData = filteredData;

    try {
      // Execute stages synchronously for better performance
      // Parallel execution was adding Promise coordination overhead

      // Enter stage (new elements)
      if (hasEntering) {
        this.executeInterpolationEnterStage(interpolationContext);
      }

      // Update stage (existing elements) - most performance critical
      if (hasUpdating) {
        await this.executeInterpolationUpdateStage(interpolationContext, filteredData);
      }

      // Exit stage completely disabled for animation performance
      // Element cleanup is handled by renderer internal logic
      // No exit tracking during smooth animation playback

    } catch (error) {
      console.error('[InterpolationEngine] Error during interpolation staging:', error);
      throw error;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Stages                                                             */
  /* ------------------------------------------------------------------ */

  /**
   * Execute interpolation update stage - interpolate existing elements
   * Optimized for animation performance - tracking operations disabled during animation
   */
  async executeInterpolationUpdateStage(interpolationContext, filteredData) {
    const { fromTreeData, toTreeData, timeFactor, highlightEdges } = interpolationContext;

    // Get tree maps from store cache or create them
    const { fromLinksMap, toLinksMap, fromNodesMap, toNodesMap } = this._getTreeMapsFromStore(interpolationContext);

    // Links
    if (filteredData.links.update.length > 0) {
      this.controller.linkRenderer.handleUpdatingLinks(
        filteredData.links.update,
        fromLinksMap,
        toLinksMap,
        timeFactor,
        highlightEdges
      );
    }

    // Nodes
    if (filteredData.nodes.update.length > 0) {
      this.controller.nodeRenderer.handleUpdatingNodes(
        filteredData.nodes.update,
        fromNodesMap,
        toNodesMap,
        timeFactor
      );
    }

    // Leaves/labels/extensions (fixed radii)
    const fromLeaves = fromTreeData.leaves();
    const toLeaves   = toTreeData.leaves();
    const extensionRadius = interpolationContext.extensionRadius;
    const labelRadius     = interpolationContext.labelRadius;

    this.controller.extensionRenderer?.renderExtensionsInterpolated(
      fromLeaves,
      toLeaves,
      extensionRadius,
      extensionRadius,
      timeFactor
    );

    this.controller.labelRenderer?.renderLabelsInterpolated(
      fromLeaves,
      toLeaves,
      labelRadius,
      labelRadius,
      timeFactor
    );

    /* ---------------- Tracking Disabled for Performance ---------------- */
    // Tracking operations were causing significant frame rate throttling
    // Animation smoothness is prioritized over element state validation
    // Renderers handle element lifecycle internally without external tracking

    // Minimal frame yield - trust renderers to handle updates internally
    // No blocking operations or heavy validation during animation
  }

  /**
   * Execute interpolation enter stage - create new elements
   * Optimized for performance - no tracking overhead
   */
  executeInterpolationEnterStage(interpolationContext) {
    const { toTreeData, timeFactor, highlightEdges, filteredData } = interpolationContext;

    // Get tree maps from store cache
    const { toNodesMap } = this._getTreeMapsFromStore(interpolationContext);

    if (filteredData.links.enter.length > 0) {
      this.controller.linkRenderer.handleEnteringLinks(
        filteredData.links.enter,
        timeFactor,
        highlightEdges
      );
    }

    if (filteredData.nodes.enter.length > 0) {
      this.controller.nodeRenderer.handleEnteringNodes(
        filteredData.nodes.enter,
        toNodesMap,
        timeFactor
      );
    }

    // No async operations - trust renderers to handle element creation
  }

  async executeInterpolationExitStage(interpolationContext, filteredData) {
    const { timeFactor, highlightEdges } = interpolationContext;

    // Get tree maps from store cache
    const { fromNodesMap } = this._getTreeMapsFromStore(interpolationContext);

    const exitPromises = [];

    if (filteredData.links.exit.length > 0) {
      this.controller.linkRenderer.handleExitingLinks(
        filteredData.links.exit,
        timeFactor,
        highlightEdges
      );
      exitPromises.push(this._trackLinkExitCompletion(filteredData.links.exit));
    }

    if (filteredData.nodes.exit.length > 0) {
      this.controller.nodeRenderer.handleExitingNodes(
        filteredData.nodes.exit,
        fromNodesMap,
        timeFactor
      );
      exitPromises.push(this._trackNodeExitCompletion(filteredData.nodes.exit));
    }

    console.log(`[InterpolationEngine] Processed ${filteredData.links.exit.length} link exits, ${filteredData.nodes.exit.length} node exits (timeFactor: ${timeFactor})`);

    return Promise.all(exitPromises);
  }

  /* ------------------------------------------------------------------ */
  /* Tracking helpers                                                   */
  /* ------------------------------------------------------------------ */

  _trackLinkUpdatesCompletion(linksToProcess) {
    const cond = () =>
      linksToProcess.every(link => {
        const mesh = this.controller.linkRenderer.linkMeshes.get(getLinkKey(link));
        return mesh && getLinkKey(mesh.userData.link) === getLinkKey(link);
      });

    return this._waitForCondition(cond, 200, 'Link update'); // Increased timeout for complex trees
  }

  _trackNodeUpdatesCompletion(nodesToProcess) {
    const cond = () =>
      nodesToProcess.every(node => {
        const nodeKey = getNodeKey(node);
        const mesh = this.controller.nodeRenderer.leafMeshes.get(nodeKey) ||
                     this.controller.nodeRenderer.internalMeshes.get(nodeKey);
        return mesh && getNodeKey(mesh.userData.node) === nodeKey;
      });

    return this._waitForCondition(cond, 200, 'Node update'); // Increased timeout for complex trees
  }

  _trackLinkExitCompletion(exitingLinks) {
    const cond = () =>
      exitingLinks.every(link => !this.controller.linkRenderer.linkMeshes.has(getLinkKey(link)));

    // Resolve next frame even if not all gone (your original intent)
    return this._waitForCondition(cond, 80, 'Link exit');
  }

  _trackNodeExitCompletion(exitingNodes) {
    const cond = () =>
      exitingNodes.every(node => {
        const k = getNodeKey(node);
        return !this.controller.nodeRenderer.leafMeshes.get(k) &&
               !this.controller.nodeRenderer.internalMeshes.get(k);
      });

    return this._waitForCondition(cond, 80, 'Node exit');
  }

  _trackExtensionUpdatesCompletion() {
    return this._nextFrame();
  }

  _trackLabelUpdatesCompletion() {
    return this._nextFrame();
  }

  /* ------------------------------------------------------------------ */
  /* Exit verification                                                   */
  /* ------------------------------------------------------------------ */

  _verifyExitCompletion(currentMap, targetMap, type) {
    let allRemoved = true;
    currentMap.forEach((_, key) => {
      if (!targetMap.has(key)) {
        console.warn(`[Exit Tracking] ${type} ${key} should have been removed but still exists`);
        allRemoved = false;
      }
    });
    return allRemoved;
  }

  _trackExitOperationsCompletion(interpolationContext) {
    const { toTreeData } = interpolationContext;

    return new Promise(resolve => {
      requestAnimationFrame(() => {
        // Use store cache or create maps as fallback
        const { toLinksMap, toNodesMap } = this._getTreeMapsFromStore(interpolationContext);
        const allNodeMeshes = new Map([
          ...this.controller.nodeRenderer.leafMeshes,
          ...this.controller.nodeRenderer.internalMeshes
        ]);

        const linksRemoved = this._verifyExitCompletion(this.controller.linkRenderer.linkMeshes, toLinksMap, 'Link');
        const nodesRemoved = this._verifyExitCompletion(allNodeMeshes, toNodesMap, 'Node');

        if (linksRemoved && nodesRemoved) {
          console.log('[Exit Tracking] All exit operations completed successfully');
          resolve();
        } else {
          console.warn('[Exit Tracking] Some exit operations still pending, waiting one more frame');
          requestAnimationFrame(() => resolve());
        }
      });
    });
  }
}
