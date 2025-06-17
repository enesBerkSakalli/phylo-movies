import { COLOR_MAP } from "../../treeColoring/ColorMap.js";

/**
 * ColorManager - Manages color logic for tree elements
 *
 * Centralizes all color-related logic for branches, nodes, and labels.
 * Handles marked components, highlighting, and fallback colors.
 */
export class ColorManager {

  /**
   * Create a ColorManager instance
   * @param {Set} markedComponents - Set of marked taxa/components for highlighting
   */
  constructor(markedComponents = new Set()) {
    this.marked = markedComponents;
  }

  /**
   * Determines the color for a branch based on marked components
   * @param {Object} linkData - The D3 link data object
   * @returns {string} The color string (hex code)
   */
  getBranchColor(linkData) {
    if (this.marked.size === 0) {
      return COLOR_MAP.colorMap.defaultColor;
    }

    // Create a Set from the current branch's target node's leaf split indices
    const treeSplit = new Set(linkData.target.data.split_indices);

    // Check if this branch leads exclusively to marked leaves
    for (const components of this.marked) {
      const markedSet = new Set(components);
      const isSubset = [...treeSplit].every((x) => markedSet.has(x));
      if (isSubset) {
        return COLOR_MAP.colorMap.markedColor;
      }
    }

    return COLOR_MAP.colorMap.defaultColor;
  }

  /**
   * Determines the color for a leaf circle or label
   * @param {Object} nodeData - The D3 node data object
   * @returns {string} The color string
   */
  getNodeColor(nodeData) {
    // Check if this leaf is part of any marked component
    const treeSplit = new Set(nodeData.data.split_indices);

    for (const components of this.marked) {
      const markedSet = new Set(components);
      const isSubset = [...treeSplit].every((x) => markedSet.has(x));
      if (isSubset) {
        return COLOR_MAP.colorMap.markedColor;
      }
    }

    // Try to get color by name, fallback to default
    return COLOR_MAP.colorMap[nodeData.data.name] || COLOR_MAP.colorMap.defaultColor;
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
