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
    if (this._isComponentMarked(linkData)) {
      return COLOR_MAP.colorMap.markedColor || "red";
    }

    return this._getBaseBranchColor(linkData);
  }

  /**
   * Enhanced branch color specifically for s_edges highlighting
   * @param {Object} linkData - The D3 link data object
   * @param {Array|Set} s_edges - Set of edges to highlight
   * @param {Object} options - Highlighting options
   * @returns {string} The color string (hex code)
   */
  getBranchColorWithS_EdgesHighlight(linkData, s_edges = [], options = {}) {
    // Check for s_edges highlighting first (higher priority)
    if (this._isS_EdgeHighlighted(linkData, s_edges)) {
      return this.highlightConfig.s_edgesColor;
    }
    
    // Check for marked components highlighting - use simple red
    if (this._isComponentMarked(linkData)) {
      return COLOR_MAP.colorMap.markedColor || "red";
    }

    return this._getBaseBranchColor(linkData);
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
   * Check if a component is marked for highlighting
   * @param {Object} linkData - The D3 link data object
   * @returns {boolean} True if marked
   */
  _isComponentMarked(linkData) {
    if (this.marked.size === 0) {
      return false;
    }

    const treeSplit = new Set(linkData.target.data.split_indices);

    for (const components of this.marked) {
      const markedSet = new Set(components);
      const isSubset = [...treeSplit].every((x) => markedSet.has(x));
      if (isSubset) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if an edge is in the s_edges highlight set
   * @param {Object} linkData - The D3 link data object
   * @param {Array|Set} s_edges - Set of edges to highlight
   * @returns {boolean} True if highlighted
   */
  _isS_EdgeHighlighted(linkData, s_edges) {
    if (!s_edges || s_edges.length === 0) {
      return false;
    }

    const targetIndices = linkData.target.data.split_indices;
    if (!targetIndices) {
      return false;
    }

    // Convert to Set for efficient comparison
    const targetSet = new Set(targetIndices);

    for (const edge of s_edges) {
      const edgeSet = new Set(edge);
      // Check if sets are equal
      if (targetSet.size === edgeSet.size && [...targetSet].every(x => edgeSet.has(x))) {
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
    if (this.marked.size === 0) {
      return false;
    }

    const treeSplit = new Set(nodeData.data.split_indices);

    for (const components of this.marked) {
      const markedSet = new Set(components);
      const isSubset = [...treeSplit].every((x) => markedSet.has(x));
      if (isSubset) {
        return true;
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
    // For internal nodes, check if any of their descendants are marked
    if (this.marked.size === 0) {
      return COLOR_MAP.colorMap.defaultColor;
    }

    if (nodeData.data && nodeData.data.split_indices) {
      const treeSplit = new Set(nodeData.data.split_indices);

      for (const components of this.marked) {
        const markedSet = new Set(components);
        const isSubset = [...treeSplit].every((x) => markedSet.has(x));
        if (isSubset) {
          return COLOR_MAP.colorMap.markedColor;
        }
      }
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
   * Adds a component to the marked set
   * @param {Array|Set} component - Component to mark
   */
  markComponent(component) {
    this.marked.add(component);
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
