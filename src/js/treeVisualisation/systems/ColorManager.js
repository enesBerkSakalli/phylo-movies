import { useAppStore, TREE_COLOR_CATEGORIES } from '../../core/store.js';

/**
 * ColorManager - Centralized color management system for phylogenetic tree visualization
 *
 * Handles three types of coloring:
 * 1. Base coloring (monophyletic groups, taxa colors)
 * 2. Active change edge highlighting (blue) - edges from lattice tracking
 * 3. Marked component highlighting (red) - components from highlight solutions
 *
 * Used by LayerStyles.js to provide colors for DeckGL layers
 */
export class ColorManager {
  constructor() {
    // Configuration
    this.monophyleticColoringEnabled = true;

        // State
    this.currentActiveChangeEdges = new Set(); // Current active change edges for highlighting
    this.marked = []; // Array of Sets for red highlighting
  }

  // ===========================
  // PUBLIC API - BRANCH COLORS
  // ===========================

  /**
   * Get branch color with highlighting logic
   * This is the main method used by LayerStyles.getLinkColor()
   *
   * Priority: Active change edge (blue) > Marked (red) > Base color
   *
   * @param {Object} linkData - D3 link data with target.data.split_indices
   * @param {Object} options - Additional options (unused but kept for API compatibility)
   * @returns {string} Hex color code
   */
  getBranchColorWithHighlights(linkData, options = {}) {
    // Check highlighting states
    const isMarked = this._isComponentMarked(linkData);
    const isActiveChangeEdge = this._isActiveChangeEdgeHighlighted(linkData, this.currentActiveChangeEdges);

    // Apply color priority
    if (isActiveChangeEdge) {
      return TREE_COLOR_CATEGORIES.activeChangeEdgeColor; // Blue for active change edges
    } else if (isMarked) {
      return TREE_COLOR_CATEGORIES.markedColor; // Red for marked components
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
   * Get node color with highlighting and dimming logic
   * Used by LayerStyles for nodes, labels, and extensions
   *
   * @param {Object} nodeData - Node data with data.split_indices and data.name
   * @param {Array} activeChangeEdges - Active change edges for dimming logic (unused - uses this.currentActiveChangeEdges)
   * @param {Object} options - Additional options
   * @returns {string} Hex color code
   */
  getNodeColor(nodeData, activeChangeEdges = [], options = {}) {
    // Check highlighting states
    const isMarked = this._isNodeMarked(nodeData);
    const isActiveChangeEdgeNode = this._isNodeActiveChangeEdge(nodeData, activeChangeEdges);
    const hasActiveChangeEdges = activeChangeEdges && activeChangeEdges.length > 0;

    // Apply color priority with dimming logic
    if (isMarked) {
      return TREE_COLOR_CATEGORIES.markedColor; // Red for marked nodes
    } else if (isActiveChangeEdgeNode) {
      return TREE_COLOR_CATEGORIES.activeChangeEdgeColor; // Blue for active change edge nodes
    } else if (hasActiveChangeEdges && this._isNodeDownstreamOfAnyActiveChangeEdge(nodeData, activeChangeEdges)) {
      return this._getBaseNodeColor(nodeData); // Keep normal color for downstream nodes
    } else if (hasActiveChangeEdges) {
      return '#cccccc'; // Grey out non-highlighted nodes when highlighting is active
    } else {
      return this._getBaseNodeColor(nodeData); // Normal coloring when no highlighting
    }
  }

  // =======================
  // PUBLIC API - STATE MANAGEMENT
  // =======================

  /**
   * Update marked components (red highlighting)
   * Called by store when highlight solutions change
   */
  updateMarkedComponents(newMarkedComponents) {
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

  // ================================
  // PRIVATE - BASE COLOR CALCULATION
  // ================================

  /**
   * Get base branch color (no highlighting)
   * Implements monophyletic group coloring
   */
  _getBaseBranchColor(linkData) {
    if (!this.monophyleticColoringEnabled) {
      return TREE_COLOR_CATEGORIES.defaultColor;
    }

    // Leaf branches get their taxa color
    if (!linkData.target.children || linkData.target.children.length === 0) {
      const leafName = linkData.target.data.name;
      return TREE_COLOR_CATEGORIES[leafName] || TREE_COLOR_CATEGORIES.defaultColor;
    }

    // Internal branches: check if monophyletic
    const subtreeLeaves = this._getSubtreeLeaves(linkData.target);
    if (subtreeLeaves.length === 0) {
      return TREE_COLOR_CATEGORIES.defaultColor;
    }

    // Get unique colors in subtree
    const leafColors = subtreeLeaves.map(leafName =>
      TREE_COLOR_CATEGORIES[leafName] || TREE_COLOR_CATEGORIES.defaultColor
    );
    const uniqueColors = [...new Set(leafColors)];

    // Color branch only if all leaves have same color (monophyletic)
    if (uniqueColors.length === 1 && uniqueColors[0] !== TREE_COLOR_CATEGORIES.defaultColor) {
      return uniqueColors[0];
    }

    return TREE_COLOR_CATEGORIES.defaultColor;
  }

  /**
   * Get base node color (taxa color or default)
   */
  _getBaseNodeColor(nodeData) {
    return TREE_COLOR_CATEGORIES[nodeData.data.name] || TREE_COLOR_CATEGORIES.defaultColor;
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
    if (!activeChangeEdge || !linkData.target?.data?.split_indices) {
      return false;
    }

    const treeSplit = new Set(linkData.target.data.split_indices);

    // Check if Sets have identical contents
    const areSetsEqual = treeSplit.size === activeChangeEdge.size &&
                         [...treeSplit].every(element => activeChangeEdge.has(element));

    return areSetsEqual;
  }

  /**
   * Check if node matches any active change edge
   */
  _isNodeActiveChangeEdge(nodeData, activeChangeEdges) {
    if (!activeChangeEdges || activeChangeEdges.length === 0 || !nodeData.data?.split_indices) {
      return false;
    }

    const nodeSplit = new Set(nodeData.data.split_indices);
    const edgesArray = Array.isArray(activeChangeEdges) ? activeChangeEdges : Array.from(activeChangeEdges);

    // Check against each active change edge
    for (const edge of edgesArray) {
      if (Array.isArray(edge)) {
        const edgeSet = new Set(edge);
        // Check for exact Set match
        if (nodeSplit.size === edgeSet.size && [...nodeSplit].every(x => edgeSet.has(x))) {
          return true;
        }
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

    const edgesArray = Array.isArray(activeChangeEdges) ? activeChangeEdges : Array.from(activeChangeEdges);

    // Walk up tree checking ancestors
    let ancestor = nodeData.parent;
    while (ancestor) {
      if (ancestor.data?.split_indices) {
        const ancestorSplit = new Set(ancestor.data.split_indices);

        // Check if ancestor matches any active change edge
        for (const edge of edgesArray) {
          if (Array.isArray(edge)) {
            const edgeSet = new Set(edge);
            if (ancestorSplit.size === edgeSet.size && [...ancestorSplit].every(x => edgeSet.has(x))) {
              return true;
            }
          }
        }
      }
      ancestor = ancestor.parent;
    }
    return false;
  }

  // =======================================
  // PRIVATE - MARKED COMPONENT CHECKS
  // =======================================

  /**
   * Check if branch is part of marked components
   * Uses subset logic: branch is marked if its split is subset of any marked component
   */
  _isComponentMarked(linkData) {
    if (!linkData.target?.data?.split_indices || !this.marked) {
      return false;
    }

    const treeSplit = new Set(linkData.target.data.split_indices);

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

  /**
   * Check if node intersects with any marked component
   */
  _isNodeMarked(nodeData) {
    const treeSplit = new Set(nodeData.data.split_indices);
    if (treeSplit.size === 0 || !this.marked) {
      return false;
    }

    // Check for any intersection with marked components
    for (const markedSet of this.marked) {
      for (const leaf of treeSplit) {
        if (markedSet.has(leaf)) {
          return true;
        }
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
