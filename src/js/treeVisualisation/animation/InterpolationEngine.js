import { getLinkKey, getNodeKey } from '../utils/KeyGenerator.js';
import { LABEL_OFFSETS } from '../utils/LabelPositioning.js';

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
   * One-frame wait helper to replace nested requestAnimationFrame boilerplate.
   * @returns {Promise} Promise that resolves on next animation frame
   * @private
   */
  _nextFrame() {
    return new Promise(resolve => requestAnimationFrame(resolve));
  }

  /**
   * Caches from/to link/node maps once per interpolation for performance.
   * @param {Object} ctx - Interpolation context to enhance with cached maps
   * @private
   */
  _ensureMaps(ctx) {
    if (ctx._maps) return;
    const { fromTreeData, toTreeData } = ctx;
    ctx._maps = {
      fromLinksMap: new Map(fromTreeData.links().map(l => [getLinkKey(l), l])),
      toLinksMap: new Map(toTreeData.links().map(l => [getLinkKey(l), l])),
      fromNodesMap: new Map(fromTreeData.descendants().map(n => [getNodeKey(n), n])),
      toNodesMap: new Map(toTreeData.descendants().map(n => [getNodeKey(n), n]))
    };
  }

  /**
   * Checks if any renderer has exiting elements.
   * @param {Object} filteredData - Filtered element data from diffing
   * @returns {boolean} True if any exiting elements exist
   * @private
   */
  _hasExitingElements(filteredData) {
    return (filteredData.links?.exit?.length > 0 ||
      filteredData.nodes?.exit?.length > 0 ||
      filteredData.leaves?.exit?.length > 0);
  }

  /**
   * Checks if any renderer has entering elements.
   * @param {Object} filteredData - Filtered element data from diffing
   * @returns {boolean} True if any entering elements exist
   * @private
   */
  _hasEnteringElements(filteredData) {
    return (filteredData.links?.enter?.length > 0 ||
      filteredData.nodes?.enter?.length > 0 ||
      filteredData.leaves?.enter?.length > 0);
  }

  /**
   * Checks if any renderer has updating elements.
   * @param {Object} filteredData - Filtered element data from diffing
   * @returns {boolean} True if any updating elements exist
   * @private
   */
  _hasUpdatingElements(filteredData) {
    return (filteredData.links?.update?.length > 0 ||
      filteredData.nodes?.update?.length > 0 ||
      filteredData.leaves?.update?.length > 0);
  }

  /**
   * Execute staged interpolation sequence with conditional logic based on element states
   */
  async executeInterpolationStaging(filteredData, interpolationContext) {
    const hasExiting = this._hasExitingElements(filteredData);
    const hasEntering = this._hasEnteringElements(filteredData);
    const hasUpdating = this._hasUpdatingElements(filteredData);
    const { timeFactor } = interpolationContext;

    // ★ build caches once (internal only)
    this._ensureMaps(interpolationContext);

    // Enter
    if (hasEntering) {
      await this.executeInterpolationEnterStage(interpolationContext);
    }

    // Update
    if (hasUpdating) {
      await this.executeInterpolationUpdateStage(interpolationContext, filteredData);
    }

    // Exit (only when fully transitioned)
    if (hasExiting && timeFactor >= 1.0) {
      await this.executeInterpolationExitStage(interpolationContext, filteredData);
      await this._trackExitOperationsCompletion(interpolationContext);
    }
  }

  /**
   * Execute interpolation update stage - interpolate existing elements
   */
  async executeInterpolationUpdateStage(interpolationContext, filteredData) {
    const { fromTreeData, toTreeData, timeFactor, highlightEdges } = interpolationContext;
    const { fromLinksMap, toLinksMap, fromNodesMap, toNodesMap } = interpolationContext._maps; // ★ use cached

    // Handle updating links
    if (filteredData.links.update.length > 0) {
      this.controller.linkRenderer.handleUpdatingLinks(
        filteredData.links.update,
        fromLinksMap,
        toLinksMap,
        timeFactor,
        highlightEdges
      );
    }

    // Handle updating nodes
    if (filteredData.nodes.update.length > 0) {
      this.controller.nodeRenderer.handleUpdatingNodes(
        filteredData.nodes.update,
        fromNodesMap,
        toNodesMap,
        timeFactor
      );
    }

    // Use leaves and FIXED stable radii from interpolationContext
    // This ensures labels stay at consistent positions across all trees
    const fromLeaves = fromTreeData.leaves();
    const toLeaves = toTreeData.leaves();
    const extensionRadius = interpolationContext.extensionRadius;
    const labelRadius = interpolationContext.labelRadius;

    this.controller.extensionRenderer?.renderExtensionsInterpolated(
      fromLeaves,
      toLeaves,
      extensionRadius,
      extensionRadius, // Same fixed radius for both trees
      timeFactor
    );

    this.controller.labelRenderer?.renderLabelsInterpolated(
      fromLeaves,
      toLeaves,
      labelRadius,
      labelRadius, // Same fixed radius for both trees - ensures consistent positioning
      timeFactor
    );

    // ORIGINAL tracking logic kept — just slightly tightened
    const updatePromises = [];

    const totalLinksProcessed =
      filteredData.links.enter.length +
      filteredData.links.update.length +
      filteredData.links.exit.length;

    if (totalLinksProcessed > 0) {
      updatePromises.push(this._trackLinkUpdatesCompletion([
        ...filteredData.links.enter,
        ...filteredData.links.update,
        ...filteredData.links.exit
      ]));
    }

    const totalNodesProcessed =
      filteredData.nodes.enter.length +
      filteredData.nodes.update.length +
      filteredData.nodes.exit.length;

    if (totalNodesProcessed > 0) {
      updatePromises.push(this._trackNodeUpdatesCompletion([
        ...filteredData.nodes.enter,
        ...filteredData.nodes.update,
        ...filteredData.nodes.exit
      ]));
    }

    if (fromLeaves.length > 0 || toLeaves.length > 0) {
      updatePromises.push(this._trackExtensionUpdatesCompletion());
      updatePromises.push(this._trackLabelUpdatesCompletion());
    }

    await Promise.all(updatePromises);

    // ★ single frame – not nested double RAF
    await this._nextFrame();
  }

  /**
   * Execute interpolation enter stage - create new elements
   */
  async executeInterpolationEnterStage(interpolationContext) {
    const { toTreeData, timeFactor, highlightEdges, filteredData } = interpolationContext;
    const { toNodesMap } = interpolationContext._maps; // ★

    if (filteredData.links.enter.length > 0) {
      this.controller.linkRenderer.handleEnteringLinks(filteredData.links.enter, timeFactor, highlightEdges);
    }

    if (filteredData.nodes.enter.length > 0) {
      this.controller.nodeRenderer.handleEnteringNodes(filteredData.nodes.enter, toNodesMap, timeFactor);
    }

    return Promise.resolve();
  }

  async executeInterpolationExitStage(interpolationContext, filteredData) {
    const { fromTreeData, timeFactor, highlightEdges } = interpolationContext;
    const { fromNodesMap } = interpolationContext._maps; // ★

    const exitPromises = [];

    if (filteredData.links.exit.length > 0) {
      this.controller.linkRenderer.handleExitingLinks(filteredData.links.exit, timeFactor, highlightEdges);
      exitPromises.push(this._trackLinkExitCompletion(filteredData.links.exit));
    }

    if (filteredData.nodes.exit.length > 0) {
      this.controller.nodeRenderer.handleExitingNodes(filteredData.nodes.exit, fromNodesMap, timeFactor);
      exitPromises.push(this._trackNodeExitCompletion(filteredData.nodes.exit));
    }

    console.log(`[InterpolationEngine] Processed ${filteredData.links.exit.length} link exits, ${filteredData.nodes.exit.length} node exits (timeFactor: ${timeFactor})`);

    return Promise.all(exitPromises);
  }

  /**
   * Tracks completion of link update operations with retry logic.
   * @param {Array} linksToProcess - Array of links to track
   * @returns {Promise} Promise that resolves when tracking completes
   * @private
   */
  _trackLinkUpdatesCompletion(linksToProcess) {
    return new Promise(resolve => {
      let attempts = 0;
      const maxAttempts = 5;

      const check = () => {
        attempts++;
        const allUpdated = linksToProcess.every(link => {
          const mesh = this.controller.linkRenderer.linkMeshes.get(getLinkKey(link));
          return mesh && mesh.userData.link === link;
        });

        if (allUpdated || attempts >= maxAttempts) {
          if (!allUpdated && attempts >= maxAttempts) {
            console.warn('[InterpolationEngine] Link update tracking timed out after max attempts. Proceeding to next stage.');
            // Proceed to next stage (exit) when updates fail
          }
          resolve();
        } else {
          requestAnimationFrame(check);
        }
      };

      requestAnimationFrame(check);
    });
  }

  /**
   * Tracks completion of node update operations.
   * @param {Array} nodesToProcess - Array of nodes to track
   * @returns {Promise} Promise that resolves when tracking completes
   * @private
   */
  _trackNodeUpdatesCompletion(nodesToProcess) {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        const allUpdated = nodesToProcess.every(node => {
          const nodeKey = getNodeKey(node);
          const mesh = this.controller.nodeRenderer.leafMeshes.get(nodeKey) ||
            this.controller.nodeRenderer.internalMeshes.get(nodeKey);
          return mesh && mesh.userData.node === node;
        });

        if (allUpdated) {
          resolve();
        } else {
          requestAnimationFrame(() => resolve());
        }
      });
    });
  }

  /**
   * Track link exit completion
   */
  _trackLinkExitCompletion(exitingLinks) {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        const allRemoved = exitingLinks.every(link => {
          const key = getLinkKey(link);
          return !this.controller.linkRenderer.linkMeshes.has(key);
        });
        resolve(); // even if not all removed, resolve next frame to avoid stalling
      });
    });
  }

  /**
   * Track node exit completion
   */
  _trackNodeExitCompletion(exitingNodes) {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        const allRemoved = exitingNodes.every(node => {
          const nodeKey = getNodeKey(node);
          const leafMesh = this.controller.nodeRenderer.leafMeshes.get(nodeKey);
          const internalMesh = this.controller.nodeRenderer.internalMeshes.get(nodeKey);
          return !leafMesh && !internalMesh;
        });
        resolve(); // same early resolve strategy
      });
    });
  }

  /**
   * Tracks completion of extension update operations.
   * @returns {Promise} Promise that resolves after one animation frame
   * @private
   */
  _trackExtensionUpdatesCompletion() {
    return new Promise(resolve => requestAnimationFrame(resolve));
  }

  /**
   * Tracks completion of label update operations.
   * @returns {Promise} Promise that resolves after one animation frame
   * @private
   */
  _trackLabelUpdatesCompletion() {
    return new Promise(resolve => requestAnimationFrame(resolve));
  }

  /**
   * Helper to verify that all elements not in the target tree have been removed
   */
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

  /**
   * Track exit operations completion
   */
  _trackExitOperationsCompletion(interpolationContext) {
    const { toTreeData } = interpolationContext;
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        const toLinksMap = new Map(toTreeData.links().map(link => [getLinkKey(link), link]));
        const toNodesMap = new Map(toTreeData.descendants().map(node => [getNodeKey(node), node]));
        const allNodeMeshes = new Map([
          ...this.controller.nodeRenderer.leafMeshes,
          ...this.controller.nodeRenderer.internalMeshes
        ]);

        const linksRemoved = this._verifyExitCompletion(this.controller.linkRenderer.linkMeshes, toLinksMap, 'Link');
        const nodesRemoved = this._verifyExitCompletion(allNodeMeshes, toNodesMap, 'Node');

        if (linksRemoved && nodesRemoved) {
          console.log(`[Exit Tracking] All exit operations completed successfully`);
          resolve();
        } else {
          console.warn(`[Exit Tracking] Some exit operations still pending, waiting one more frame`);
          requestAnimationFrame(() => resolve());
        }
      });
    });
  }
}
