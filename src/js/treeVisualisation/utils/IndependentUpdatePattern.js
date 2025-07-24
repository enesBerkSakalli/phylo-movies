import { getLinkKey, getNodeKey } from './KeyGenerator.js';
import { useAppStore } from '../../core/store.js';

/**
 * IndependentUpdatePattern - Pure data-driven diffing for tree elements
 *
 * Uses D3 hierarchy objects and KeyGenerator for stable element identification.
 * Calculates minimal updates needed between tree states based on actual position changes.
 * Only elements with changed positions/properties are marked for update, optimizing s-edge interpolation.
 */
export class IndependentUpdatePattern {

  /**
   * @param {Object} options - Configuration options
   * @param {Function} options.onEnter - Callback for entering elements
   * @param {Function} options.onUpdate - Callback for updating elements
   * @param {Function} options.onExit - Callback for exiting elements
   */
  constructor(options = {}) {
    this.onEnter = options.onEnter || (() => { });
    this.onUpdate = options.onUpdate || (() => { });
    this.onExit = options.onExit || (() => { });
  }

  /**
   * Computes independent updates for tree links using D3 hierarchy
   * Only links with actual position changes are marked for update (optimized for s-edge interpolation)
   * @param {Object} currentTree - D3 hierarchy tree object
   * @param {Object} previousTree - Previous D3 hierarchy tree object (optional)
   * @returns {Object} Update operations { enter, update, exit }
   */
  diffLinks(currentTree, previousTree = null) {
    if (!currentTree) return { enter: [], update: [], exit: [] };

    const currentLinks = currentTree.links();
    const previousLinks = previousTree ? previousTree.links() : [];

    // Build key-based maps for efficient lookup
    const currentLinkMap = new Map();
    const previousLinkMap = new Map();

    currentLinks.forEach(link => {
      const key = getLinkKey(link);
      currentLinkMap.set(key, link);
    });

    previousLinks.forEach(link => {
      const key = getLinkKey(link);
      previousLinkMap.set(key, link);
    });

    // Compute differences
    const enter = [];
    const update = [];
    const exit = [];

    // Find entering and updating links
    currentLinks.forEach(link => {
      const key = getLinkKey(link);
      if (previousLinkMap.has(key)) {
        // Link exists in both trees - check if it actually needs updating
        const prevLink = previousLinkMap.get(key);
        if (this._linkNeedsUpdate(link, prevLink)) {
          // Only add to update if position actually changed
          update.push({
            key,
            current: link,
            previous: prevLink,
            type: 'link'
          });
        }
        // If no position change, element is stable - no action needed
      } else {
        // New link - needs to enter
        enter.push({
          key,
          current: link,
          previous: null,
          type: 'link'
        });
      }
    });

    // Find exiting links
    previousLinks.forEach(link => {
      const key = getLinkKey(link);
      if (!currentLinkMap.has(key)) {
        exit.push({
          key,
          current: null,
          previous: link,
          type: 'link'
        });
      }
    });

    return { enter, update, exit };
  }

  /**
   * Computes independent updates for tree nodes using D3 hierarchy
   * @param {Object} currentTree - D3 hierarchy tree object
   * @param {Object} previousTree - Previous D3 hierarchy tree object (optional)
   * @returns {Object} Update operations { enter, update, exit }
   */
  diffNodes(currentTree, previousTree = null) {
    if (!currentTree) return { enter: [], update: [], exit: [] };

    const currentNodes = currentTree.descendants();
    const previousNodes = previousTree ? previousTree.descendants() : [];

    // Build key-based maps for efficient lookup
    const currentNodeMap = new Map();
    const previousNodeMap = new Map();

    currentNodes.forEach(node => {
      const key = getNodeKey(node);
      currentNodeMap.set(key, node);
    });

    previousNodes.forEach(node => {
      const key = getNodeKey(node);
      previousNodeMap.set(key, node);
    });

    // Compute differences
    const enter = [];
    const update = [];
    const exit = [];

    // Find entering and updating nodes
    currentNodes.forEach(node => {
      const key = getNodeKey(node);
      if (previousNodeMap.has(key)) {
        // Node exists in both trees - check if it actually needs updating
        const prevNode = previousNodeMap.get(key);
        if (this._nodeNeedsUpdate(node, prevNode)) {
          // Only add to update if position actually changed
          update.push({
            key,
            current: node,
            previous: prevNode,
            type: node.children ? 'internal-node' : 'leaf-node'
          });
        }
        // If no position change, element is stable - no action needed
      } else {
        // New node - needs to enter
        enter.push({
          key,
          current: node,
          previous: null,
          type: node.children ? 'internal-node' : 'leaf-node'
        });
      }
    });

    // Find exiting nodes
    previousNodes.forEach(node => {
      const key = getNodeKey(node);
      if (!currentNodeMap.has(key)) {
        exit.push({
          key,
          current: null,
          previous: node,
          type: node.children ? 'internal-node' : 'leaf-node'
        });
      }
    });

    return { enter, update, exit };
  }

  /**
   * Computes independent updates for tree leaves (subset of nodes)
   * @param {Object} currentTree - D3 hierarchy tree object
   * @param {Object} previousTree - Previous D3 hierarchy tree object (optional)
   * @returns {Object} Update operations { enter, update, exit }
   */
  diffLeaves(currentTree, previousTree = null) {
    if (!currentTree) return { enter: [], update: [], exit: [] };

    const currentLeaves = currentTree.leaves();
    const previousLeaves = previousTree ? previousTree.leaves() : [];

    // Build key-based maps for efficient lookup
    const currentLeafMap = new Map();
    const previousLeafMap = new Map();

    currentLeaves.forEach(leaf => {
      const key = getNodeKey(leaf);
      currentLeafMap.set(key, leaf);
    });

    previousLeaves.forEach(leaf => {
      const key = getNodeKey(leaf);
      previousLeafMap.set(key, leaf);
    });

    // Compute differences
    const enter = [];
    const update = [];
    const exit = [];

    // Find entering and updating leaves
    currentLeaves.forEach(leaf => {
      const key = getNodeKey(leaf);
      if (previousLeafMap.has(key)) {
        // Leaf exists in both trees - check if it actually needs updating
        const prevLeaf = previousLeafMap.get(key);
        if (this._nodeNeedsUpdate(leaf, prevLeaf)) {
          // Only add to update if position actually changed
          update.push({
            key,
            current: leaf,
            previous: prevLeaf,
            type: 'leaf'
          });
        }
        // If no position change, element is stable - no action needed
      } else {
        // New leaf - needs to enter
        enter.push({
          key,
          current: leaf,
          previous: null,
          type: 'leaf'
        });
      }
    });

    // Find exiting leaves
    previousLeaves.forEach(leaf => {
      const key = getNodeKey(leaf);
      if (!currentLeafMap.has(key)) {
        exit.push({
          key,
          current: null,
          previous: leaf,
          type: 'leaf'
        });
      }
    });

    return { enter, update, exit };
  }

  /**
   * Executes independent updates by calling registered callbacks
   * @param {Object} updates - Update operations from diff methods
   * @param {Object} context - Additional context for callbacks
   */
  executeUpdates(updates, context = {}) {
    const { enter, update, exit } = updates;

    // Process in order: exit → enter → update
    exit.forEach(op => this.onExit(op, context));
    enter.forEach(op => this.onEnter(op, context));
    update.forEach(op => this.onUpdate(op, context));
  }

  /**
   * Convenience method to diff and execute updates for links
   * @param {Object} currentTree - D3 hierarchy tree object
   * @param {Object} previousTree - Previous D3 hierarchy tree object (optional)
   * @param {Object} context - Additional context for callbacks
   */
  updateLinks(currentTree, previousTree = null, context = {}) {
    const linkUpdates = this.diffLinks(currentTree, previousTree);
    this.executeUpdates(linkUpdates, context);
    return linkUpdates;
  }

  /**
   * Convenience method to diff and execute updates for nodes
   * @param {Object} currentTree - D3 hierarchy tree object
   * @param {Object} previousTree - Previous D3 hierarchy tree object (optional)
   * @param {Object} context - Additional context for callbacks
   */
  updateNodes(currentTree, previousTree = null, context = {}) {
    const nodeUpdates = this.diffNodes(currentTree, previousTree);
    this.executeUpdates(nodeUpdates, context);
    return nodeUpdates;
  }

  /**
   * Convenience method to diff and execute updates for leaves
   * @param {Object} currentTree - D3 hierarchy tree object
   * @param {Object} previousTree - Previous D3 hierarchy tree object (optional)
   * @param {Object} context - Additional context for callbacks
   */
  updateLeaves(currentTree, previousTree = null, context = {}) {
    const leafUpdates = this.diffLeaves(currentTree, previousTree);
    this.executeUpdates(leafUpdates, context);
    return leafUpdates;
  }

  /**
   * Computes unified updates for all tree elements (links, nodes, leaves)
   * @param {Object} currentTree - D3 hierarchy tree object (to tree - target state)
   * @param {Object} previousTree - Previous D3 hierarchy tree object (from tree - source state)
   * @param {Object} options - Options including direction information
   * @returns {Object} All update operations { links, nodes, leaves }
   */
  diffAllElements(currentTree, previousTree = null) {
    // Use the tree order as provided by the caller (MovieTimelineManager)
    // The caller is responsible for correct tree ordering based on scrubbing direction
    return {
      links: this.diffLinks(currentTree, previousTree),
      nodes: this.diffNodes(currentTree, previousTree),
      leaves: this.diffLeaves(currentTree, previousTree)
    };
  }

  /**
   * Checks if any elements are exiting across all types
   * @param {Object} allUpdates - Update operations from diffAllElements
   * @returns {boolean} True if any exiting elements exist
   */
  hasExitingElements(allUpdates) {
    // Defensive check for undefined arrays
    if (!allUpdates || !allUpdates.links || !allUpdates.nodes || !allUpdates.leaves) {
      console.warn('[IndependentUpdatePattern] hasExitingElements: Invalid allUpdates structure');
      return false;
    }

    return (
      (allUpdates.links.exit && allUpdates.links.exit.length > 0) ||
      (allUpdates.nodes.exit && allUpdates.nodes.exit.length > 0) ||
      (allUpdates.leaves.exit && allUpdates.leaves.exit.length > 0)
    );
  }

  /**
   * Checks if any elements are entering across all types
   * @param {Object} allUpdates - Update operations from diffAllElements
   * @returns {boolean} True if any entering elements exist
   */
  hasEnteringElements(allUpdates) {
    // Defensive check for undefined arrays
    if (!allUpdates || !allUpdates.links || !allUpdates.nodes || !allUpdates.leaves) {
      return false;
    }

    return (
      (allUpdates.links.enter && allUpdates.links.enter.length > 0) ||
      (allUpdates.nodes.enter && allUpdates.nodes.enter.length > 0) ||
      (allUpdates.leaves.enter && allUpdates.leaves.enter.length > 0)
    );
  }

  /**
   * Checks if any elements are updating across all types
   * @param {Object} allUpdates - Update operations from diffAllElements
   * @returns {boolean} True if any updating elements exist
   */
  hasUpdatingElements(allUpdates) {
    // Defensive check for undefined arrays
    if (!allUpdates || !allUpdates.links || !allUpdates.nodes || !allUpdates.leaves) {
      return false;
    }

    return (
      (allUpdates.links.update && allUpdates.links.update.length > 0) ||
      (allUpdates.nodes.update && allUpdates.nodes.update.length > 0) ||
      (allUpdates.leaves.update && allUpdates.leaves.update.length > 0)
    );
  }

  /**
   * Extracts filtered data for renderers from update operations
   * @param {Object} allUpdates - Update operations from diffAllElements
   * @returns {Object} Filtered data with entering/updating/exiting arrays
   */
  extractFilteredData(allUpdates) {
    return {
      links: {
        enter: allUpdates.links.enter.map(op => op.current),
        update: allUpdates.links.update.map(op => op.current),
        exit: allUpdates.links.exit.map(op => op.previous),
      },
      nodes: {
        enter: allUpdates.nodes.enter.map(op => op.current),
        update: allUpdates.nodes.update.map(op => op.current),
        exit: allUpdates.nodes.exit.map(op => op.previous),
      },
      leaves: {
        enter: allUpdates.leaves.enter.map(op => op.current),
        update: allUpdates.leaves.update.map(op => op.current),
        exit: allUpdates.leaves.exit.map(op => op.previous),
      }
    };
  }

  /**
   * Analyzes which tree (from/to) contains the exit/enter/update elements
   * This helps determine animation direction and proper staging order
   * @param {Object} allUpdates - Update operations from diffAllElements
   * @returns {Object} Analysis of element sources and animation direction
   */
  analyzeElementSources(allUpdates) {
    // Exit elements come from the fromTree (elements that exist in from but not in to)
    const hasExitFromFromTree = this.hasExitingElements(allUpdates);

    // Enter elements go to the toTree (elements that exist in to but not in from)
    const hasEnterToToTree = this.hasEnteringElements(allUpdates);

    // Update elements exist in both trees but with different positions
    const hasUpdateInBoth = this.hasUpdatingElements(allUpdates);

    // Count elements by source
    const exitCount = (allUpdates.links?.exit?.length || 0) +
                     (allUpdates.nodes?.exit?.length || 0) +
                     (allUpdates.leaves?.exit?.length || 0);

    const enterCount = (allUpdates.links?.enter?.length || 0) +
                      (allUpdates.nodes?.enter?.length || 0) +
                      (allUpdates.leaves?.enter?.length || 0);

    const updateCount = (allUpdates.links?.update?.length || 0) +
                       (allUpdates.nodes?.update?.length || 0) +
                       (allUpdates.leaves?.update?.length || 0);

    // Determine animation direction based on which tree has more elements
    let animationDirection = 'balanced';
    if (enterCount > exitCount) {
      animationDirection = 'expanding'; // toTree has more elements
    } else if (exitCount > enterCount) {
      animationDirection = 'contracting'; // fromTree has more elements
    }

    return {
      // Element source analysis
      hasExitFromFromTree,     // Elements being removed (from fromTree)
      hasEnterToToTree,        // Elements being added (to toTree)
      hasUpdateInBoth,         // Elements being repositioned (in both trees)

      // Element counts
      exitCount,
      enterCount,
      updateCount,

      // Animation direction
      animationDirection,

      // Staging recommendations based on element sources
      isFromTreeSource: exitCount > enterCount,  // More elements coming from fromTree
      isToTreeSource: enterCount > exitCount,    // More elements going to toTree
      isBalanced: enterCount === exitCount       // Equal elements in both directions
    };
  }

  /**
   * Integrates with store-based position caching
   * @param {number} currentTreeIndex - Current tree index
   * @param {number} previousTreeIndex - Previous tree index
   * @returns {Object} Cached position data for both trees
   */
  getStoreCachedTrees(currentTreeIndex, previousTreeIndex) {
    const { getLayoutCache } = useAppStore.getState();

    const currentLayout = getLayoutCache(currentTreeIndex);
    const previousLayout = getLayoutCache(previousTreeIndex);

    return {
      currentTree: currentLayout?.tree || null,
      previousTree: previousLayout?.tree || null,
      currentLayout,
      previousLayout
    };
  }

  /**
   * Checks if a link needs updating based on position changes
   * @param {Object} currentLink - Current D3 link object
   * @param {Object} previousLink - Previous D3 link object
   * @returns {boolean} True if link needs updating
   * @private
   */
  _linkNeedsUpdate(currentLink, previousLink) {
    if (!currentLink || !previousLink) {
      console.log(`[IndependentUpdatePattern] Link update needed - missing link data`);
      return true;
    }

    // Defensive check for malformed link data
    if (!currentLink.source || !currentLink.target || !previousLink.source || !previousLink.target) {
      console.warn('Malformed link data in _linkNeedsUpdate:', { currentLink, previousLink });
      return true; // Assume update needed if data is malformed
    }

    // Check source position changes
    const sourceChanged =
      currentLink.source.angle !== previousLink.source.angle ||
      currentLink.source.radius !== previousLink.source.radius;

    // Check target position changes
    const targetChanged =
      currentLink.target.angle !== previousLink.target.angle ||
      currentLink.target.radius !== previousLink.target.radius;

    return sourceChanged || targetChanged;
  }

  /**
   * Checks if a node needs updating based on position changes
   * @param {Object} currentNode - Current D3 node object
   * @param {Object} previousNode - Previous D3 node object
   * @returns {boolean} True if node needs updating
   * @private
   */
  _nodeNeedsUpdate(currentNode, previousNode) {
    if (!currentNode || !previousNode) return true;

    // Check for any change in the node's position, including both
    // Cartesian (x, y) and polar (angle, radius) coordinates.
    const positionChanged =
      currentNode.x !== previousNode.x ||
      currentNode.y !== previousNode.y ||
      currentNode.angle !== previousNode.angle ||
      currentNode.radius !== previousNode.radius;

    return positionChanged;
  }
}

/**
 * Factory function to create an IndependentUpdatePattern with store integration
 * @param {Object} callbacks - Callback functions for enter/update/exit
 * @returns {IndependentUpdatePattern} Configured update pattern instance
 */
export function createStoreIntegratedUpdatePattern(callbacks = {}) {
  return new IndependentUpdatePattern({
    onEnter: callbacks.onEnter || (() => { }),
    onUpdate: callbacks.onUpdate || (() => { }),
    onExit: callbacks.onExit || (() => { })
  });
}
