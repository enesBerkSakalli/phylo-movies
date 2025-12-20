import { useAppStore } from '../../core/store.js';
import { TREE_COLOR_CATEGORIES } from '../../constants/TreeColors.js';

/**
 * TreeColorManager - Centralized color management system for phylogenetic tree visualization
 *
 * Handles three types of coloring:
 * 1. Base coloring (monophyletic groups, taxa colors)
 * 2. Active change edge highlighting (blue) - edges from lattice tracking
 * 3. Marked subtree highlighting (red) - from computed subtrees (naming only)
 *
 * Used by LayerStyles.js to provide colors for DeckGL layers
 */
export class TreeColorManager {
  constructor() {
    // Configuration
    this.monophyleticColoringEnabled = true;
    // State
    this.currentActiveChangeEdges = new Set(); // Current active change edges for highlighting
    this.marked = []; // Array of Sets for red highlighting
  }

  /**
   * Refresh the color categories reference
   * Call this when TREE_COLOR_CATEGORIES is updated externally
   */
  refreshColorCategories() {
    // The TREE_COLOR_CATEGORIES is imported statically, so it automatically reflects
    // the latest changes when the object is mutated. However, we can trigger a
    // re-render to ensure the visual changes are applied immediately.

    // Get the store and trigger a re-render for all controllers
    const store = useAppStore.getState();
    const controllers = store.treeControllers || [];
    for (const controller of controllers) {
      if (controller?.renderAllElements) {
        controller.renderAllElements();
      }
    }
  }

  // ===========================
  // PUBLIC API - BRANCH COLORS
  // ===========================

  /**
   * Get branch color with highlighting logic
   * This is the main method used by LayerStyles.getLinkColor()
   *
   * Priority: Active change edge (blue) > Marked (red) > Base color
   * Note: Dimming is now handled by LayerStyles via opacity, not color change
   *
   * @param {Object} linkData - D3 link data with target.data.split_indices
   * @returns {string} Hex color code
   */
  getBranchColorWithHighlights(linkData) {
    // Check highlighting states
    const isMarked = this._isComponentMarked(linkData);
    const isActiveChangeEdge = this._isActiveChangeEdgeHighlighted(linkData, this.currentActiveChangeEdges);

    // Apply color priority (removed dimming logic - handled by LayerStyles)
    if (isActiveChangeEdge) {
      return TREE_COLOR_CATEGORIES.activeChangeEdgeColor; // Blue for active change edge
    } else if (isMarked) {
      return TREE_COLOR_CATEGORIES.markedColor; // Red for marked
    } else {
      return this._getBaseBranchColor(linkData); // Base color (black or taxa color)
    }
  }

  /**
   * Get base branch color (without highlighting)
   * Used by LayerStyles to detect highlighting differences
   * @param {Object} linkData - D3 link data with target.data.split_indices
   * @returns {string} Hex color code
   */
  getBranchColor(linkData) {
    return this._getBaseBranchColor(linkData);
  }

  // ========================
  // PUBLIC API - NODE COLORS
  // ========================

  /**
   * Get node color with highlighting logic
   * Used by LayerStyles for nodes, labels, and extensions
   * Note: Dimming is now handled by LayerStyles via opacity, not color change
   *
   * @param {Object} nodeData - Node data with data.split_indices and data.name
   * @param {Array} activeChangeEdges - Active change edges for highlighting (optional)
   * @param {Object} options - Additional options
   * @returns {string} Hex color code
   */
  getNodeColor(nodeData, activeChangeEdges = [], options = {}) {
    // Resolve active edge input to a Set (or use current if not provided)
    const edgeSet = this._resolveActiveEdgeSet(activeChangeEdges);

    // Check highlighting states
    const isMarked = this._isNodeMarked(nodeData);
    const isActiveChangeEdgeNode = this._nodeOrParentMatchesActiveEdge(nodeData, edgeSet);

    // Apply color priority (removed dimming logic - handled by LayerStyles)
    if (isMarked) {
      return TREE_COLOR_CATEGORIES.markedColor; // Red for marked nodes
    } else if (isActiveChangeEdgeNode) {
      return TREE_COLOR_CATEGORIES.activeChangeEdgeColor; // Blue for active change edge nodes
    } else {
      return this._getBaseNodeColor(nodeData); // Normal base color
    }
  }

  // =======================
  // PUBLIC API - STATE MANAGEMENT
  // =======================

  /**
   * Update marked subtrees (red highlighting)
   * Called by store when highlight solutions change
   */
  updateMarkedSubtrees(newMarkedComponents) {
    if (Array.isArray(newMarkedComponents)) {
      this.marked = newMarkedComponents;
    } else if (newMarkedComponents instanceof Set) {
      this.marked = [newMarkedComponents];
    } else {
      this.marked = [];
    }
  }

  /**
   * Update current active change edge (blue highlighting)
   * Called by store when current tree position changes
   */
  updateActiveChangeEdge(activeChangeEdge) {
    this.currentActiveChangeEdges = new Set(activeChangeEdge);
  }

  /**
   * Enable/disable monophyletic group coloring
   */
  setMonophyleticColoring(enabled) {
    this.monophyleticColoringEnabled = enabled;
  }

  /**
   * Get monophyletic coloring status
   */
  isMonophyleticColoringEnabled() {
    return this.monophyleticColoringEnabled;
  }

  /**
   * Check if a branch/link is downstream of any active change edge
   * Used by LayerStyles for dimming logic
   * @param {Object} linkData - D3 link data with target.data.split_indices
   * @returns {boolean} True if this branch is downstream of any active change edge
   */
  isDownstreamOfAnyActiveChangeEdge(linkData) {
    if (!this.currentActiveChangeEdges || this.currentActiveChangeEdges.size === 0) {
      return false;
    }
    return this._isDownstreamOfAnyActiveChangeEdge(linkData, [this.currentActiveChangeEdges]);
  }

  /**
   * Check if a node is downstream of any active change edge
   * Used by LayerStyles for dimming logic
   * @param {Object} nodeData - Node data with data.split_indices
   * @returns {boolean} True if this node is downstream of any active change edge
   */
  isNodeDownstreamOfAnyActiveChangeEdge(nodeData) {
    if (!this.currentActiveChangeEdges || this.currentActiveChangeEdges.size === 0) {
      return false;
    }
    return this._isNodeDownstreamOfAnyActiveChangeEdge(nodeData, [this.currentActiveChangeEdges]);
  }

  /**
   * Check if there are any active change edges
   * Used by LayerStyles to determine if dimming should be applied
   * @returns {boolean} True if there are active change edges
   */
  hasActiveChangeEdges() {
    return this.currentActiveChangeEdges && this.currentActiveChangeEdges.size > 0;
  }

  /**
   * Check if a branch is specifically an active change edge (not just highlighted)
   * Used by LayerStyles to apply special stroke treatment to active change edges
   * @param {Object} linkData - D3 link data with target.data.split_indices
   * @returns {boolean} True if this branch is an active change edge
   */
  isActiveChangeEdge(linkData) {
    return this._isActiveChangeEdgeHighlighted(linkData, this.currentActiveChangeEdges);
  }

  // ================================
  // PRIVATE - BASE COLOR CALCULATION
  // ================================

  /**
   * Get base branch color (no highlighting)
   * Implements monophyletic group coloring
   */
  _getBaseBranchColor(linkData) {
    // Leaf branches ALWAYS get their taxa color (regardless of monophyletic setting)
    if (!linkData.target.children || linkData.target.children.length === 0) {
      const leafName = linkData.target.data.name;
      return TREE_COLOR_CATEGORIES[leafName] || TREE_COLOR_CATEGORIES.defaultColor;
    }

    // Internal branches: only apply monophyletic coloring if enabled
    if (!this.monophyleticColoringEnabled) {
      return TREE_COLOR_CATEGORIES.defaultColor;
    }

    // Internal branches: check if monophyletic (all subtree leaves have same color)
    const subtreeLeaves = this._getSubtreeLeaves(linkData.target);
    if (subtreeLeaves.length === 0) {
      return TREE_COLOR_CATEGORIES.defaultColor;
    }

    // Get unique colors in subtree
    const leafColors = subtreeLeaves.map(leafName =>
      TREE_COLOR_CATEGORIES[leafName] || TREE_COLOR_CATEGORIES.defaultColor
    );

    const uniqueColors = [...new Set(leafColors)];

    // Color internal branch only if all leaves have same color (monophyletic)
    if (uniqueColors.length === 1 && uniqueColors[0] !== TREE_COLOR_CATEGORIES.defaultColor) {
      return uniqueColors[0];
    }

    return TREE_COLOR_CATEGORIES.defaultColor;
  }

  /**
   * Get base node color (taxa color or default)
   * Implements monophyletic group coloring for internal nodes
   */
  _getBaseNodeColor(nodeData) {
    // Leaf nodes ALWAYS get their taxa color (regardless of monophyletic setting)
    if (!nodeData.children || nodeData.children.length === 0) {
      return TREE_COLOR_CATEGORIES[nodeData.data.name] || TREE_COLOR_CATEGORIES.defaultColor;
    }

    // Internal nodes: only apply monophyletic coloring if enabled
    if (!this.monophyleticColoringEnabled) {
      return TREE_COLOR_CATEGORIES.defaultColor;
    }

    // Internal nodes: check if monophyletic (all subtree leaves have same color)
    const subtreeLeaves = this._getSubtreeLeaves(nodeData);
    if (subtreeLeaves.length === 0) {
      return TREE_COLOR_CATEGORIES.defaultColor;
    }

    // Get unique colors in subtree
    const leafColors = subtreeLeaves.map(leafName =>
      TREE_COLOR_CATEGORIES[leafName] || TREE_COLOR_CATEGORIES.defaultColor
    );

    const uniqueColors = [...new Set(leafColors)];

    // Color internal node only if all leaves have same color (monophyletic)
    if (uniqueColors.length === 1 && uniqueColors[0] !== TREE_COLOR_CATEGORIES.defaultColor) {
      return uniqueColors[0];
    }

    return TREE_COLOR_CATEGORIES.defaultColor;
  }

  /**
   * Recursively collect all leaf names in a subtree
   */
  _getSubtreeLeaves(node) {
    if (!node) return [];

    if (!node.children || node.children.length === 0) {
      return [node.data.name];
    }

    const leaves = [];
    node.children.forEach(child => {
      leaves.push(...this._getSubtreeLeaves(child));
    });
    return leaves;
  }

  // ====================================
  // PRIVATE - S-EDGE HIGHLIGHTING CHECKS
  // ====================================

  /**
   * Check if branch matches current active change edge
   * Compares split_indices Sets for exact match
   */
  _isActiveChangeEdgeHighlighted(linkData, activeChangeEdge) {
    if (!activeChangeEdge || !linkData.target?.data?.split_indices) return false;
    return this._splitsEqual(linkData.target.data.split_indices, activeChangeEdge);
  }

  /**
   * Check if node matches any active change edge
   */
  _isNodeActiveChangeEdge(nodeData, activeChangeEdge) {
    if (!activeChangeEdge || !nodeData?.data?.split_indices) return false;
    return this._splitsEqual(nodeData.data.split_indices, activeChangeEdge);
  }

  /**
   * Check if a node is either the active edge, or the parent of a child that is the active edge.
   */
  _nodeOrParentMatchesActiveEdge(nodeData, activeChangeEdge) {
    if (!activeChangeEdge) return false;
    // Exact match on the node itself
    if (this._isNodeActiveChangeEdge(nodeData, activeChangeEdge)) return true;
    // Immediate child match (parent highlight)
    if (Array.isArray(nodeData?.children) && nodeData.children.length > 0) {
      for (const child of nodeData.children) {
        if (child?.data?.split_indices && this._splitsEqual(child.data.split_indices, activeChangeEdge)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Normalize active edge input to a Set.
   * - Accepts a Set directly
   * - Accepts an array of indices
   * - Falls back to current active edge Set stored in ColorManager
   */
  _resolveActiveEdgeSet(activeChangeEdges) {
    if (activeChangeEdges instanceof Set) return activeChangeEdges;
    if (Array.isArray(activeChangeEdges) && activeChangeEdges.length > 0 && typeof activeChangeEdges[0] === 'number') {
      return new Set(activeChangeEdges);
    }
    return this.currentActiveChangeEdges || null;
  }

  /**
   * Compare split array with an active edge Set for equality.
   */
  _splitsEqual(splitArray, activeEdgeSet) {
    if (!Array.isArray(splitArray) || !(activeEdgeSet instanceof Set)) return false;
    if (splitArray.length !== activeEdgeSet.size) return false;
    for (const el of splitArray) {
      if (!activeEdgeSet.has(el)) return false;
    }
    return true;
  }


  /**
   * Check if a branch is downstream (part of the subtree) of any activeChangeEdge
   * Uses subset logic: branch is downstream if its split is a subset of any active change edge
   * @param {Object} linkData - The D3 link data object
   * @param {Array|Set} activeChangeEdges - Set of activeChangeEdges (each activeChangeEdge is an array of indices)
   * @returns {boolean} True if this branch is downstream of any activeChangeEdge
   */
  _isDownstreamOfAnyActiveChangeEdge(linkData, activeChangeEdges) {

    const treeSplit = new Set(linkData.target.data.split_indices);

    // Check each active change edge
    for (const edge of activeChangeEdges) {
        const edgeSet = new Set(edge);
        // Check if treeSplit is subset of edgeSet
        const isSubset = [...treeSplit].every(leaf => edgeSet.has(leaf));
        const isProperSubset = treeSplit.size <= edgeSet.size && isSubset;
        if (isProperSubset) {
          return true; // This branch is downstream of this active change edge
        }
    }

    return false;
  }
  // =======================================
  // PRIVATE - MARKED COMPONENT CHECKS
  // =======================================

  /**
   * Check if branch is part of marked subtree (naming only)
   * Uses subset logic: branch is marked if its split is subset of any marked set
   */
  _isComponentMarked(linkData) {
    if (!linkData.target?.data?.split_indices || !this.marked) {
      return false;
    }

    const treeSplit = new Set(linkData.target.data.split_indices);

    // Check each marked component
    for (const component of this.marked) {
      const markedSet = component instanceof Set ? component : new Set(component);
      // Check if treeSplit is subset of markedSet
      const isSubset = [...treeSplit].every(leaf => markedSet.has(leaf));
      const isProperSubset = treeSplit.size <= markedSet.size && isSubset;

      if (isProperSubset) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if node is in subtree of any active change edge
   * Used for keeping downstream nodes colored during highlighting
   */
  _isNodeDownstreamOfAnyActiveChangeEdge(nodeData, activeChangeEdges) {
    if (!activeChangeEdges || activeChangeEdges.length === 0 || !nodeData.data?.split_indices) {
      return false;
    }

    const nodeSplit = new Set(nodeData.data.split_indices);

    // Check each active change edge
    for (const edge of activeChangeEdges) {
        const edgeSet = new Set(edge);
        // Check if nodeSplit is subset of edgeSet
        const isSubset = [...nodeSplit].every(leaf => edgeSet.has(leaf));
        const isProperSubset = nodeSplit.size <= edgeSet.size && isSubset;

        if (isProperSubset) {
          return true; // This node is downstream of this active change edge
        }
    }

    return false;
  }

  /**
   * Check if node intersects with any marked subtree (naming only)
   */
  _isNodeMarked(nodeData) {
    if (!nodeData.data?.split_indices || !this.marked) {
      return false;
    }

    const treeSplit = new Set(nodeData.data.split_indices);

    // Check each marked component
    for (const component of this.marked) {
      const markedSet = new Set(component);
      // Check if treeSplit is subset of markedSet
      const isSubset = [...treeSplit].every(leaf => markedSet.has(leaf));
      const isProperSubset = treeSplit.size <= markedSet.size && isSubset;

      if (isProperSubset) {
        return true;
      }
    }
    return false;
  }


  // ===========
  // LIFECYCLE
  // ===========

  /**
   * Clean up resources
   */
  destroy() {
    // No store subscription to clean up - store handles updates centrally
  }
}
