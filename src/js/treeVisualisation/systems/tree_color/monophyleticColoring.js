/**
 * Monophyletic coloring utilities
 * Handles base color calculation for branches and nodes based on taxa colors
 */
import { TREE_COLOR_CATEGORIES } from '../../../constants/TreeColors.js';

/**
 * Recursively collect all leaf names in a subtree
 * @param {Object} node - Tree node
 * @returns {Array<string>} Array of leaf names
 */
export function getSubtreeLeaves(node) {
  if (!node) return [];

  if (!node.children || node.children.length === 0) {
    const name = node.data?.name || node.name;
    return name ? [name] : [];
  }

  const leaves = [];
  node.children.forEach(child => {
    leaves.push(...getSubtreeLeaves(child));
  });
  return leaves;
}

/**
 * Check if a subtree is monophyletic (all leaves have the same color)
 * @param {Object} node - Tree node to check
 * @returns {{ isMonophyletic: boolean, color: string|null }} Result with color if monophyletic
 */
export function checkMonophyletic(node) {
  const subtreeLeaves = getSubtreeLeaves(node);

  if (subtreeLeaves.length === 0) {
    return { isMonophyletic: false, color: null };
  }

  const leafColors = subtreeLeaves.map(leafName =>
    TREE_COLOR_CATEGORIES[leafName] || TREE_COLOR_CATEGORIES.defaultColor
  );

  const uniqueColors = [...new Set(leafColors)];

  if (uniqueColors.length === 1 && uniqueColors[0] !== TREE_COLOR_CATEGORIES.defaultColor) {
    return { isMonophyletic: true, color: uniqueColors[0] };
  }

  return { isMonophyletic: false, color: null };
}

/**
 * Get base branch color (no highlighting)
 * @param {Object} linkData - D3 link data
 * @param {boolean} monophyleticEnabled - Whether monophyletic coloring is enabled
 * @returns {string} Hex color code
 */
export function getBaseBranchColor(linkData, monophyleticEnabled) {
  if (!linkData?.target) {
    return TREE_COLOR_CATEGORIES.defaultColor;
  }

  // Leaf branches ALWAYS get their taxa color
  if (!linkData.target.children || linkData.target.children.length === 0) {
    const leafName = linkData.target.data?.name || linkData.target.name;
    return TREE_COLOR_CATEGORIES[leafName] || TREE_COLOR_CATEGORIES.defaultColor;
  }

  // Internal branches: only apply monophyletic coloring if enabled
  if (!monophyleticEnabled) {
    return TREE_COLOR_CATEGORIES.defaultColor;
  }

  const { isMonophyletic, color } = checkMonophyletic(linkData.target);
  return isMonophyletic ? color : TREE_COLOR_CATEGORIES.defaultColor;
}

/**
 * Get base node color (taxa color or default)
 * @param {Object} nodeData - Node data
 * @param {boolean} monophyleticEnabled - Whether monophyletic coloring is enabled
 * @returns {string} Hex color code
 */
export function getBaseNodeColor(nodeData, monophyleticEnabled) {
  if (!nodeData) {
    return TREE_COLOR_CATEGORIES.defaultColor;
  }

  // Leaf nodes ALWAYS get their taxa color
  if (!nodeData.children || nodeData.children.length === 0) {
    const name = nodeData.data?.name || nodeData.name;
    return TREE_COLOR_CATEGORIES[name] || TREE_COLOR_CATEGORIES.defaultColor;
  }

  // Internal nodes: only apply monophyletic coloring if enabled
  if (!monophyleticEnabled) {
    return TREE_COLOR_CATEGORIES.defaultColor;
  }

  const { isMonophyletic, color } = checkMonophyletic(nodeData);
  return isMonophyletic ? color : TREE_COLOR_CATEGORIES.defaultColor;
}
