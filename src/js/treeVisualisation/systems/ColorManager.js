import { useAppStore, TREE_COLOR_CATEGORIES } from '../../core/store.js';

/**
 * Enhanced ColorManager with mixed color highlighting support
 *
 * Centralizes all color-related logic for branches, nodes, and labels.
 * Handles marked components, highlighting, and mixed color blending.
 */
export class ColorManager {

  /**
   * Create a ColorManager instance
   * @param {Set} markedComponents - Set of marked taxa/components for highlighting
   */
  constructor(markedComponents = new Set()) {
    this.marked = markedComponents;

    // Configuration for highlighting and coloringRer
    this.highlightConfig = {
      // Blend intensities for different highlight types
      markedComponents: 0.6,
      s_edges: 0.7,
      atomCovers: 0.5,

      // Visual enhancement factors
      strokeWidthMultiplier: useAppStore.getState().highlightStrokeMultiplier,
      opacityBoost: 0.2,

      // Highlight colors - use centralized colors
      markedColor: TREE_COLOR_CATEGORIES.markedColor,
      s_edgesColor: TREE_COLOR_CATEGORIES.s_edgesColor,
      atomCoversColor: TREE_COLOR_CATEGORIES.atomCoversColor
    };

    // Monophyletic coloring configuration
    this.monophyleticColoringEnabled = true;

    // Subscribe to store changes for automatic updates
    this._setupStoreSubscription();
  }

  /**
   * Set up store subscription to automatically update when highlighting data changes
   * @private
   */
  _setupStoreSubscription() {
    // Subscribe to store changes
    this.unsubscribe = useAppStore.subscribe((state, prevState) => {
      // Check if currentTreeIndex changed (which affects highlight data)
      if (state.currentTreeIndex !== prevState.currentTreeIndex) {
        this._updateFromStore();
      }

      // Check if monophyletic coloring setting changed
      if (state.monophyleticColoringEnabled !== prevState.monophyleticColoringEnabled) {
        this.monophyleticColoringEnabled = state.monophyleticColoringEnabled;
      }

      // Check if highlight stroke multiplier changed
      if (state.highlightStrokeMultiplier !== prevState.highlightStrokeMultiplier) {
        this.highlightConfig.strokeWidthMultiplier = state.highlightStrokeMultiplier;
      }
    });
  }

  /**
   * Update marked components from store data
   * @private
   */
  _updateFromStore() {
    const { getActualHighlightData } = useAppStore.getState();
    const highlightData = getActualHighlightData();

    if (highlightData) {
      const transformedData = this._transformHighlightData(highlightData);
      this.marked = transformedData;
    }
  }

  /**
   * Transform highlight data to the format expected by ColorManager
   * @private
   * @param {Array} highlightData - Raw highlight data
   * @returns {Array} Transformed data as array of Sets
   */
  _transformHighlightData(highlightData) {
    if (!Array.isArray(highlightData) || highlightData.length === 0) {
      return [];
    }

    const isArrayOfArrays = highlightData.every(item => Array.isArray(item));
    return isArrayOfArrays
      ? highlightData.map(innerArray => new Set(innerArray))
      : [new Set(highlightData)];
  }


  /**
   * Base branch color without any highlighting - pure base/group colors only
   * @param {Object} linkData - The D3 link data object
   * @param {Object} options - Highlighting options
   * @returns {string} The color string (hex code)
   */
  getBranchColor(linkData, options = {}) {
    // No highlighting applied - only base colors (monophyletic groups or default)
    return this._getBaseBranchColor(linkData);
  }



  /**
   * Unified branch color method that handles both this.marked and lattice_edges highlighting
   * @param {Object} linkData - The D3 link data object
   * @param {Array|Set} lattice_edges - Set of lattice edges to highlight (s_edges) - these are the ACTIVE ones
   * @param {Object} options - Highlighting options
   * @returns {string} The color string (hex code)
   */
  getBranchColorWithHighlights(linkData, lattice_edges = [], options = {}) {
    const isMarked = this._isComponentMarked(linkData);
    const isLatticeEdge = this._isS_EdgeHighlighted(linkData, lattice_edges);
    // Only apply greying when there are actual ACTIVE lattice edges (highlightEdges from gui.js)
    const hasActiveLatticeEdges = lattice_edges && lattice_edges.length > 0;

    // Priority system: both can be active, but we need to determine visual effect
    if (isLatticeEdge && isMarked) {
      // Both highlighting types are active - use purple for combined effect
      return TREE_COLOR_CATEGORIES.combinedHighlightColor; // Purple for both s-edge and marked
    } else if (isLatticeEdge) {
      // Only lattice edge highlighting - use blue
      return TREE_COLOR_CATEGORIES.s_edgesColor; // Blue for s-edges (lattice edges)
    } else if (isMarked) {
      // Only marked component highlighting - use red
      return TREE_COLOR_CATEGORIES.markedColor; // Red for marked components
    } else {
      // No active highlighting - use base color
      return this._getBaseBranchColor(linkData);
    }
  }

  /**
   * Get the base branch color with optional parsimonious subtree coloring
   * @param {Object} linkData - The D3 link data object
   * @returns {string} Base color
   */
  _getBaseBranchColor(linkData) {
    // If monophyletic coloring is disabled, return default color
    if (!this.monophyleticColoringEnabled) {
      return TREE_COLOR_CATEGORIES.defaultColor;
    }

    // For branches, determine color based on the subtree they lead to
    // This implements parsimonious coloring where branches get colored
    // based on the predominant taxa group in their subtree

    if (!linkData.target || !linkData.target.data) {
      return TREE_COLOR_CATEGORIES.defaultColor;
    }

    // If this branch leads to a leaf, use the leaf's taxa color
    if (!linkData.target.children || linkData.target.children.length === 0) {
      const leafName = linkData.target.data.name;
      return TREE_COLOR_CATEGORIES[leafName] || TREE_COLOR_CATEGORIES.defaultColor;
    }

    // For internal branches, determine color based on the subtree
    // Get all leaf names in this subtree
    const subtreeLeaves = this._getSubtreeLeaves(linkData.target);

    if (subtreeLeaves.length === 0) {
      return TREE_COLOR_CATEGORIES.defaultColor;
    }

    // Check if all leaves in subtree have the same color (monophyletic group)
    const leafColors = subtreeLeaves.map(leafName =>
      TREE_COLOR_CATEGORIES[leafName] || TREE_COLOR_CATEGORIES.defaultColor
    );

    // If all leaves have the same color, use that color for the branch
    const uniqueColors = [...new Set(leafColors)];
    if (uniqueColors.length === 1 && uniqueColors[0] !== TREE_COLOR_CATEGORIES.defaultColor) {
      return uniqueColors[0];
    }

    // Default to black for mixed subtrees (only color monophyletic groups)
    return TREE_COLOR_CATEGORIES.defaultColor;
  }

  /**
   * Helper method to get all leaf names in a subtree
   * @param {Object} node - The root node of the subtree
   * @returns {Array<string>} Array of leaf names
   */
  _getSubtreeLeaves(node) {
    if (!node) return [];

    // If this is a leaf, return its name
    if (!node.children || node.children.length === 0) {
      return [node.data.name];
    }

    // Recursively collect leaves from all children
    const leaves = [];
    node.children.forEach(child => {
      leaves.push(...this._getSubtreeLeaves(child));
    });

    return leaves;
  }

  /**
   * Check if a link is highlighted as an s_edge
   * @param {Object} linkData - The D3 link data object
   * @param {Array|Set} s_edges - Set of edges to highlight
   * @returns {boolean} True if this link is an s_edge
   */
  _isS_EdgeHighlighted(linkData, s_edges) {
    if (!s_edges || s_edges.length === 0) {
      return false;
    }

    if (!linkData.target || !linkData.target.data || !linkData.target.data.split_indices) {
      return false;
    }

    const treeSplit = new Set(linkData.target.data.split_indices);

    // Convert s_edges to array if it's a Set
    const edgesArray = Array.isArray(s_edges) ? s_edges : Array.from(s_edges);

    // Check if this tree split matches any of the s_edges
    for (const edge of edgesArray) {
      if (Array.isArray(edge)) {
        const edgeSet = new Set(edge);
        // Check if the sets are equal (same elements)
        if (treeSplit.size === edgeSet.size && [...treeSplit].every(x => edgeSet.has(x))) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if a branch is downstream (part of the subtree) of any s-edge
   * Uses d3.hierarchy node structure to check if current node is a descendant of any s-edge node
   * @param {Object} linkData - The D3 link data object
   * @param {Array|Set} s_edges - Set of s-edges (each s-edge is an array of indices)
   * @returns {boolean} True if this branch is downstream of any s-edge
   */
  _isDownstreamOfAnyS_Edge(linkData, s_edges) {
    if (!s_edges || s_edges.length === 0) {
      return false;
    }

    if (!linkData.target || !linkData.target.data || !linkData.target.data.split_indices) {
      return false;
    }

    const currentNode = linkData.target;

    // Convert s_edges to array if it's a Set - each element is a single s-edge (array of indices)
    const edgesArray = Array.isArray(s_edges) ? s_edges : Array.from(s_edges);

    // Walk up the tree from current node to root, checking if any ancestor matches any s-edge
    let ancestor = currentNode.parent;
    while (ancestor) {
      if (ancestor.data && ancestor.data.split_indices) {
        const ancestorSplit = new Set(ancestor.data.split_indices);

        // Check if this ancestor matches any s-edge
        for (const edge of edgesArray) {
          if (Array.isArray(edge)) {
            const edgeSet = new Set(edge);
            // Check if the sets are equal (same elements)
            if (ancestorSplit.size === edgeSet.size && [...ancestorSplit].every(x => edgeSet.has(x))) {
              return true; // Current node is downstream of this s-edge
            }
          }
        }
      }
      ancestor = ancestor.parent;
    }

    return false;
  }

  /**
   * Check if a component is marked
   * @param {Object} linkData - The D3 link data object
   * @returns {boolean} True if marked
   */
  _isComponentMarked(linkData) {
    if (!linkData.target || !linkData.target.data || !linkData.target.data.split_indices) {
      return false;
    }

    const treeSplit = new Set(linkData.target.data.split_indices);

    // `this.marked` is an iterable of components (e.g., a Set of Arrays).
    // We iterate through each component directly.
    for (const component of this.marked) {
      // `component` is the group of leaves to check against (e.g., ['t1', 't2']).
      const markedSet = new Set(component);
      let subset =  [...treeSplit].every(leaf => markedSet.has(leaf));
      const isProperSubset = treeSplit.size <= markedSet.size && subset;
      if (isProperSubset) {
        return true;
      }
    }
    return false;
  }

  /**
   * Enhanced node color with highlighting and s-edge dimming support
   * @param {Object} nodeData - The D3 node data object
   * @param {Array|Set} lattice_edges - Set of lattice edges to highlight (s_edges) - these are the ACTIVE ones
   * @param {Object} options - Highlighting options
   * @returns {string} The color string
   */
  getNodeColor(nodeData, lattice_edges = [], options = {}) {
    const isMarked = this._isNodeMarked(nodeData);
    const isS_EdgeNode = this._isNodeS_Edge(nodeData, lattice_edges);
    // Only apply greying when there are actual ACTIVE lattice edges (highlightEdges from gui.js)
    const hasActiveLatticeEdges = lattice_edges && lattice_edges.length > 0;

    // Priority system for node coloring
    if (isMarked) {
      return TREE_COLOR_CATEGORIES.markedColor; // Red for marked nodes
    } else if (isS_EdgeNode) {
      return TREE_COLOR_CATEGORIES.s_edgesColor; // Blue for s-edge nodes
    } else if (hasActiveLatticeEdges && this._isNodeDownstreamOfAnyS_Edge(nodeData, lattice_edges)) {
      // Node is downstream of any ACTIVE s-edge - keep normal coloring to show the subtree
      return this._getBaseNodeColor(nodeData);
    } else if (hasActiveLatticeEdges) {
      // ACTIVE s-edges exist but this node is not highlighted or downstream - grey it out
      return '#cccccc'; // Grey color for dimmed nodes
    } else {
      // No active highlighting - use base color
      return this._getBaseNodeColor(nodeData);
    }
  }

  /**
   * Get the base node color before any highlighting (preserves taxa coloring)
   * @param {Object} nodeData - The D3 node data object
   * @returns {string} Base color
   */
  _getBaseNodeColor(nodeData) {
    // Try to get color by name (taxa coloring), fallback to default
    return TREE_COLOR_CATEGORIES[nodeData.data.name] || TREE_COLOR_CATEGORIES.defaultColor;
  }

  /**
   * Check if a node is marked for highlighting
   * @param {Object} nodeData - The D3 node data object
   * @returns {boolean} True if marked
   */
  _isNodeMarked(nodeData) {
    const treeSplit = new Set(nodeData.data.split_indices);
    if (treeSplit.size === 0) {
      return false;
    }

    // `this.marked` is an array of Sets (e.g., [Set {9, 10, 11}])
    for (const markedSet of this.marked) { // Iterate over the Sets directly
      // Check if there's any intersection between treeSplit and markedSet
      for (const leaf of treeSplit) {
        if (markedSet.has(leaf)) {
          return true; // Found a common element, so this node is marked
        }
      }
    }
    return false;
  }

  /**
   * Check if a node is an s-edge node
   * @param {Object} nodeData - The D3 node data object
   * @param {Array|Set} s_edges - Set of s-edges
   * @returns {boolean} True if this node is an s-edge
   */
  _isNodeS_Edge(nodeData, s_edges) {
    if (!s_edges || s_edges.length === 0) {
      return false;
    }

    if (!nodeData.data || !nodeData.data.split_indices) {
      return false;
    }

    const nodeSplit = new Set(nodeData.data.split_indices);
    const edgesArray = Array.isArray(s_edges) ? s_edges : Array.from(s_edges);

    // Check if this node's split matches any of the s_edges
    for (const edge of edgesArray) {
      if (Array.isArray(edge)) {
        const edgeSet = new Set(edge);
        // Check if the sets are equal (same elements)
        if (nodeSplit.size === edgeSet.size && [...nodeSplit].every(x => edgeSet.has(x))) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if a node is downstream (part of the subtree) of any s-edge
   * Uses d3.hierarchy node structure to check if current node is a descendant of any s-edge node
   * @param {Object} nodeData - The D3 node data object
   * @param {Array|Set} s_edges - Set of s-edges (each s-edge is an array of indices)
   * @returns {boolean} True if this node is downstream of any s-edge
   */
  _isNodeDownstreamOfAnyS_Edge(nodeData, s_edges) {
    if (!s_edges || s_edges.length === 0) {
      return false;
    }

    if (!nodeData.data || !nodeData.data.split_indices) {
      return false;
    }

    const edgesArray = Array.isArray(s_edges) ? s_edges : Array.from(s_edges);

    // Walk up the tree from current node to root, checking if any ancestor matches any s-edge
    let ancestor = nodeData.parent;
    while (ancestor) {
      if (ancestor.data && ancestor.data.split_indices) {
        const ancestorSplit = new Set(ancestor.data.split_indices);

        // Check if this ancestor matches any s-edge
        for (const edge of edgesArray) {
          if (Array.isArray(edge)) {
            const edgeSet = new Set(edge);
            // Check if the sets are equal (same elements)
            if (ancestorSplit.size === edgeSet.size && [...ancestorSplit].every(x => edgeSet.has(x))) {
              return true; // Current node is downstream of this s-edge
            }
          }
        }
      }
      ancestor = ancestor.parent;
    }

    return false;
  }


  /**
   * Updates the marked components
   * @param {Set} newMarkedComponents - New set of marked components
   */
  updateMarkedComponents(newMarkedComponents) {
    this.marked = newMarkedComponents;
  }



  /**
   * Enable or disable monophyletic group coloring
   * @param {boolean} enabled - Whether to enable monophyletic coloring
   */
  setMonophyleticColoring(enabled) {
    this.monophyleticColoringEnabled = enabled;
  }

  /**
   * Get current monophyletic coloring status
   * @returns {boolean} Whether monophyletic coloring is enabled
   */
  isMonophyleticColoringEnabled() {
    return this.monophyleticColoringEnabled;
  }


  /**
   * Gets the current marked components
   * @returns {Set} The marked components set
   */
  getMarkedComponents() {
    return this.marked;
  }

  /**
   * Clean up store subscription
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

}
