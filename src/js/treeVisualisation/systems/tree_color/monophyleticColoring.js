/**
 * Monophyletic coloring utilities
 * Handles base color calculation for branches and nodes based on taxa colors
 * 
 * Now integrates with the dynamic taxaGrouping system from the store,
 * supporting taxa mode, group mode (separator-based), and CSV mode.
 * 
 * PERFORMANCE: Uses a render-cycle cache to avoid repeated store access.
 * Call `resetTaxonColorCache()` at the start of each render cycle.
 */
import { TREE_COLOR_CATEGORIES } from '../../../constants/TreeColors.js';
import { useAppStore } from '../../../core/store.js';
import { getTaxonColor } from '../../../treeColoring/utils/GroupingUtils.js';

// =============================================================================
// RENDER-CYCLE CACHE
// Cache taxon colors for the duration of a single render cycle.
// This avoids repeated store.getState() and getTaxonColor() calls.
// =============================================================================

let _taxonColorCache = null;  // Map<taxonName, color|null>
let _cachedTaxaGrouping = null;  // Reference to detect config changes

/**
 * Reset the taxon color cache. Call at the start of each render cycle.
 */
export function resetTaxonColorCache() {
  _taxonColorCache = null;
  _cachedTaxaGrouping = null;
}

/**
 * Build the color cache lazily on first access within a render cycle.
 */
function ensureColorCache() {
  const state = useAppStore.getState();
  const taxaGrouping = state.taxaGrouping;
  
  // If taxaGrouping reference changed, invalidate cache
  if (_cachedTaxaGrouping !== taxaGrouping) {
    _taxonColorCache = new Map();
    _cachedTaxaGrouping = taxaGrouping;
  }
  
  return { cache: _taxonColorCache, taxaGrouping };
}

/**
 * Collect all leaf names in a subtree.
 * Uses D3 hierarchy's built-in leaves() method when available for better performance.
 * @param {Object} node - D3 hierarchy node or raw tree node
 * @returns {Array<string>} Array of leaf names
 */
export function getSubtreeLeaves(node) {
  if (!node) return [];

  // Use D3's built-in leaves() method when available (preferred)
  if (typeof node.leaves === 'function') {
    return node.leaves()
      .map(leaf => leaf.data?.name || leaf.name)
      .filter(Boolean);
  }

  // Fallback for raw tree data (non-D3 nodes)
  return _collectLeafNamesRecursive(node);
}

/**
 * Recursive fallback for raw tree nodes without D3 methods.
 * @private
 */
function _collectLeafNamesRecursive(node) {
  if (!node.children || node.children.length === 0) {
    const name = node.data?.name || node.name;
    return name ? [name] : [];
  }

  const leaves = [];
  node.children.forEach(child => {
    leaves.push(..._collectLeafNamesRecursive(child));
  });
  return leaves;
}

/**
 * Get the effective color for a taxon, respecting taxaGrouping from store
 * Falls back to TREE_COLOR_CATEGORIES for legacy compatibility
 * 
 * PERFORMANCE: Uses render-cycle cache to avoid repeated lookups.
 * 
 * @param {string} taxonName - The taxon name
 * @returns {string|null} The color or null if default
 */
function getEffectiveTaxonColor(taxonName) {
  const { cache, taxaGrouping } = ensureColorCache();
  
  // Check cache first
  if (cache.has(taxonName)) {
    return cache.get(taxonName);
  }
  
  let color = null;
  
  // If taxaGrouping is active, use it
  if (taxaGrouping && taxaGrouping.mode) {
    color = getTaxonColor(taxonName, taxaGrouping, null);
  }
  
  // Fallback to legacy TREE_COLOR_CATEGORIES (only if not a system key)
  if (!color) {
    const systemKeys = ['markedColor', 'pivotEdgeColor', 'strokeColor', 'defaultColor'];
    if (!systemKeys.includes(taxonName)) {
      const legacyColor = TREE_COLOR_CATEGORIES[taxonName];
      if (legacyColor && legacyColor !== TREE_COLOR_CATEGORIES.defaultColor) {
        color = legacyColor;
      }
    }
  }
  
  // Store in cache (even null values to avoid re-lookup)
  cache.set(taxonName, color);
  return color;
}

/**
 * Check if a subtree is monophyletic (all leaves have the same non-default color)
 * Now uses the dynamic taxaGrouping system for color resolution.
 * @param {Object} node - Tree node to check
 * @returns {{ isMonophyletic: boolean, color: string|null }} Result with color if monophyletic
 */
export function checkMonophyletic(node) {
  const subtreeLeaves = getSubtreeLeaves(node);

  if (subtreeLeaves.length === 0) {
    return { isMonophyletic: false, color: null };
  }

  // Get effective colors for all leaves (null means default/no group)
  const leafColors = subtreeLeaves.map(leafName => getEffectiveTaxonColor(leafName));

  // Filter out nulls (taxa with no specific color)
  const nonNullColors = leafColors.filter(c => c !== null);

  // If some leaves have no color, it's not monophyletic for coloring purposes
  if (nonNullColors.length !== leafColors.length) {
    return { isMonophyletic: false, color: null };
  }

  const uniqueColors = [...new Set(nonNullColors)];

  if (uniqueColors.length === 1) {
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
    const color = getEffectiveTaxonColor(leafName);
    return color || TREE_COLOR_CATEGORIES.defaultColor;
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
    const color = getEffectiveTaxonColor(name);
    return color || TREE_COLOR_CATEGORIES.defaultColor;
  }

  // Internal nodes: only apply monophyletic coloring if enabled
  if (!monophyleticEnabled) {
    return TREE_COLOR_CATEGORIES.defaultColor;
  }

  const { isMonophyletic, color } = checkMonophyletic(nodeData);
  return isMonophyletic ? color : TREE_COLOR_CATEGORIES.defaultColor;
}
