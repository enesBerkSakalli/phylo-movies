import * as d3 from "d3";
import { COLOR_MAP } from "../../treeColoring/ColorMap.js";

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

    // Configuration for highlighting and coloring
    this.highlightConfig = {
      // Blend intensities for different highlight types
      markedComponents: 0.6,
      s_edges: 0.7,
      atomCovers: 0.5,

      // Visual enhancement factors
      strokeWidthMultiplier: 1.6,
      opacityBoost: 0.2,

      // Highlight colors
      markedColor: "#ff5722",
      s_edgesColor: "#2196f3",
      atomCoversColor: "#9c27b0"
    };

    // Monophyletic coloring configuration
    this.monophyleticColoringEnabled = true;
  }

  /**
   * Mix two colors using D3 color interpolation
   * @param {string} originalColor - Base color (hex, rgb, or named)
   * @param {string} highlightColor - Highlight color to blend with
   * @param {number} intensity - Blend ratio (0-1, where 1 = full highlight)
   * @returns {string} Mixed color as hex string
   */
  mixColors(originalColor, highlightColor, intensity = 0.6) {
    try {
      const original = d3.color(originalColor);
      const highlight = d3.color(highlightColor);

      if (!original || !highlight) {
        console.warn(`ColorManager: Invalid color provided - original: ${originalColor}, highlight: ${highlightColor}`);
        return originalColor;
      }

      return d3.interpolateRgb(original, highlight)(intensity);
    } catch (error) {
      console.error('ColorManager: Error mixing colors:', error);
      return originalColor;
    }
  }

  /**
   * Enhanced branch color with simple red highlighting
   * @param {Object} linkData - The D3 link data object
   * @param {Object} options - Highlighting options
   * @returns {string} The color string (hex code)
   */
  getBranchColor(linkData, options = {}) {
    // Check for marked components highlighting - use simple red
    const isMarked = this._isComponentMarked(linkData);

    if (isMarked) {
      return COLOR_MAP.colorMap.markedColor || "red";
    }

    return this._getBaseBranchColor(linkData);
  }

  

  /**
   * Unified branch color method that handles both this.marked and lattice_edges highlighting
   * @param {Object} linkData - The D3 link data object
   * @param {Array|Set} lattice_edges - Set of lattice edges to highlight (s_edges)
   * @param {Object} options - Highlighting options
   * @returns {Object} Object with color, isHighlighted, and effect type information
   */
  getBranchColorWithHighlights(linkData, lattice_edges = [], options = {}) {
    const isMarked = this._isComponentMarked(linkData);
    const isLatticeEdge = this._isS_EdgeHighlighted(linkData, lattice_edges);


    // Priority system: both can be active, but we need to determine visual effect
    if (isLatticeEdge && isMarked) {
      // Both highlighting types are active - use special combined effect
      return {
        color: "url(#marked-lattice-gradient)", // Special gradient for both
        isHighlighted: true,
        effectType: "combined",
        needsGlow: true,
        strokeMultiplier: 2.0
      };
    } else if (isLatticeEdge) {
      // Only lattice edge highlighting
      return {
        color: "url(#highlight-gradient)", // Blue gradient for lattice edges
        isHighlighted: true,
        effectType: "lattice",
        needsGlow: true,
        strokeMultiplier: 1.7
      };
    } else if (isMarked) {
      // Only marked component highlighting
      return {
        color: COLOR_MAP.colorMap.markedColor || "red", // Red for marked components
        isHighlighted: true,
        effectType: "marked",
        needsGlow: false,
        strokeMultiplier: 1.5
      };
    } else {
      // No highlighting - use base color
      return {
        color: this._getBaseBranchColor(linkData),
        isHighlighted: false,
        effectType: "none",
        needsGlow: false,
        strokeMultiplier: 1.0
      };
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
      return COLOR_MAP.colorMap.defaultColor;
    }

    // For branches, determine color based on the subtree they lead to
    // This implements parsimonious coloring where branches get colored
    // based on the predominant taxa group in their subtree

    if (!linkData.target || !linkData.target.data) {
      return COLOR_MAP.colorMap.defaultColor;
    }

    // If this branch leads to a leaf, use the leaf's taxa color
    if (!linkData.target.children || linkData.target.children.length === 0) {
      const leafName = linkData.target.data.name;
      return COLOR_MAP.colorMap[leafName] || COLOR_MAP.colorMap.defaultColor;
    }

    // For internal branches, determine color based on the subtree
    // Get all leaf names in this subtree
    const subtreeLeaves = this._getSubtreeLeaves(linkData.target);

    if (subtreeLeaves.length === 0) {
      return COLOR_MAP.colorMap.defaultColor;
    }

    // Check if all leaves in subtree have the same color (monophyletic group)
    const leafColors = subtreeLeaves.map(leafName =>
      COLOR_MAP.colorMap[leafName] || COLOR_MAP.colorMap.defaultColor
    );

    // If all leaves have the same color, use that color for the branch
    const uniqueColors = [...new Set(leafColors)];
    if (uniqueColors.length === 1 && uniqueColors[0] !== COLOR_MAP.colorMap.defaultColor) {
      return uniqueColors[0];
    }

    // Default to black for mixed subtrees (only color monophyletic groups)
    return COLOR_MAP.colorMap.defaultColor;
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
   * Check if a component is marked
   * @param {Object} linkData - The D3 link data object
   * @returns {boolean} True if marked
   */
  _isComponentMarked(linkData) {
    if (!linkData.target || !linkData.target.data || !linkData.target.data.split_indices) {
      return false;
    }

    const treeSplit = new Set(linkData.target.data.split_indices);
    if (treeSplit.size === 0) {
      return false;
    }

    // `this.marked` is an iterable of components (e.g., a Set of Arrays).
    // We iterate through each component directly.
    for (const component of this.marked) {
      // `component` is the group of leaves to check against (e.g., ['t1', 't2']).
      const markedSet = new Set(component);

      // A branch is marked if its leaves (`treeSplit`) are a proper subset
      // of the marked component (`markedSet`).
      const isProperSubset = treeSplit.size < markedSet.size &&
                             [...treeSplit].every(leaf => markedSet.has(leaf));

      if (isProperSubset) {
        return true;
      }
    }

    return false;
  }

  /**
   * Enhanced node color with simple red highlighting
   * @param {Object} nodeData - The D3 node data object
   * @param {Object} options - Highlighting options
   * @returns {string} The color string
   */
  getNodeColor(nodeData, options = {}) {

    // Check if this leaf is part of any marked component - use simple red
    if (this._isNodeMarked(nodeData)) {
      return COLOR_MAP.colorMap.markedColor || "red";
    }

    return this._getBaseNodeColor(nodeData);
  }

  /**
   * Get the base node color before any highlighting (preserves taxa coloring)
   * @param {Object} nodeData - The D3 node data object
   * @returns {string} Base color
   */
  _getBaseNodeColor(nodeData) {
    // Try to get color by name (taxa coloring), fallback to default
    return COLOR_MAP.colorMap[nodeData.data.name] || COLOR_MAP.colorMap.defaultColor;
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
   * Determines the color for internal nodes (collapsed nodes, branch points, etc.)
   * @param {Object} nodeData - The D3 node data object
   * @returns {string} The color string
   */
  getInternalNodeColor(nodeData) {
    if (this._isNodeMarked(nodeData)) {
      return COLOR_MAP.colorMap.markedColor;
    }
    // Internal nodes typically use a neutral color or special internal node color
    return COLOR_MAP.colorMap.internalNodeColor || COLOR_MAP.colorMap.defaultColor;
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
   * Gets the default stroke color for elements
   * @returns {string} The stroke color
   */
  getStrokeColor() {
    return COLOR_MAP.colorMap.strokeColor;
  }

  /**
   * Gets the current marked components
   * @returns {Set} The marked components set
   */
  getMarkedComponents() {
    return this.marked;
  }
}
