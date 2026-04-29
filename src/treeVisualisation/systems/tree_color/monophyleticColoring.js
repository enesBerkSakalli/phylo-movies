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
import { SYSTEM_TREE_COLORS } from '../../../constants/TreeColors.js';
import { useAppStore } from '../../../state/phyloStore/store.js';
import { getTaxonColor } from '../../../treeColoring/utils/GroupingUtils.js';
import { getSplitIndices } from '../../utils/splitMatching.js';

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

  // If cache is missing or taxaGrouping reference changed, (re)build cache
  if (!_taxonColorCache || _cachedTaxaGrouping !== taxaGrouping) {
    _taxonColorCache = new Map();
    _cachedTaxaGrouping = taxaGrouping;
  }

  return { cache: _taxonColorCache, taxaGrouping };
}

/**
 * Collect all leaf names in a subtree.
 * @param {Object} node - Normalized tree render node
 * @returns {Array<string>} Array of leaf names
 */
export function getSubtreeLeaves(node) {
  if (!node) return [];

  if (Array.isArray(node.leafNames)) {
    return node.leafNames.filter(Boolean);
  }

  if (isLeafNode(node)) {
    const name = getNodeName(node);
    if (name) return [name];
  }

  const leafNamesFromSplits = getLeafNamesFromSplitIndices(node);
  if (leafNamesFromSplits.length > 0) {
    return leafNamesFromSplits;
  }

  return _collectLeafNamesRecursive(node);
}

/**
 * Recursive fallback for raw tree nodes without D3 methods.
 * @private
 */
function _collectLeafNamesRecursive(node) {
  if (isLeafNode(node)) {
    const name = getNodeName(node);
    return name ? [name] : [];
  }

  if (!Array.isArray(node.children)) {
    return [];
  }

  const leaves = [];
  node.children.forEach(child => {
    leaves.push(..._collectLeafNamesRecursive(child));
  });
  return leaves;
}

/**
 * Get the effective color for a taxon, respecting taxaGrouping from store
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

  if (taxaGrouping && taxaGrouping.mode) {
    color = getTaxonColor(taxonName, taxaGrouping, null);
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
 * @param {Object} linkData - Normalized link data
 * @param {boolean} monophyleticEnabled - Whether monophyletic coloring is enabled
 * @returns {string} Hex color code
 */
export function getBaseBranchColor(linkData, monophyleticEnabled) {
  const branchNode = getBranchNode(linkData);
  if (!branchNode) {
    return SYSTEM_TREE_COLORS.defaultColor;
  }

  // Leaf branches ALWAYS get their taxa color
  if (isLeafNode(branchNode)) {
    const leafName = getNodeName(branchNode);
    const color = getEffectiveTaxonColor(leafName);
    return color || SYSTEM_TREE_COLORS.defaultColor;
  }

  // Internal branches: only apply monophyletic coloring if enabled
  if (!monophyleticEnabled) {
    return SYSTEM_TREE_COLORS.defaultColor;
  }

  const { isMonophyletic, color } = checkMonophyletic(branchNode);
  return isMonophyletic ? color : SYSTEM_TREE_COLORS.defaultColor;
}

/**
 * Get base node color (taxa color or default)
 * @param {Object} nodeData - Node data
 * @param {boolean} monophyleticEnabled - Whether monophyletic coloring is enabled
 * @returns {string} Hex color code
 */
export function getBaseNodeColor(nodeData, monophyleticEnabled) {
  if (!nodeData) {
    return SYSTEM_TREE_COLORS.defaultColor;
  }

  // Leaf nodes ALWAYS get their taxa color
  if (isLeafNode(nodeData)) {
    const name = getNodeName(nodeData);
    const color = getEffectiveTaxonColor(name);
    return color || SYSTEM_TREE_COLORS.defaultColor;
  }

  // Internal nodes: only apply monophyletic coloring if enabled
  if (!monophyleticEnabled) {
    return SYSTEM_TREE_COLORS.defaultColor;
  }

  const { isMonophyletic, color } = checkMonophyletic(nodeData);
  return isMonophyletic ? color : SYSTEM_TREE_COLORS.defaultColor;
}

function getBranchNode(linkData) {
  if (!linkData) return null;
  return linkData;
}

function isLeafNode(node) {
  if (typeof node?.isLeaf === 'boolean') return node.isLeaf;
  return !node?.children || node.children.length === 0;
}

function getNodeName(node) {
  return (
    node?.name ||
    node?.text ||
    node?.targetName ||
    ''
  );
}

function getLeafNamesFromSplitIndices(node) {
  const splitIndices = getSplitIndices(node);
  if (!Array.isArray(splitIndices) || splitIndices.length === 0) return [];

  const sortedLeaves = useAppStore.getState()?.movieData?.sorted_leaves;
  if (!Array.isArray(sortedLeaves) || sortedLeaves.length === 0) return [];

  return splitIndices
    .map((index) => sortedLeaves[index])
    .filter(Boolean);
}
