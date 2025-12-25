/**
 * TreeColorManager - Centralized color management system for phylogenetic tree visualization
 *
 * Handles threetypes of coloring:
 * 1. Base coloring (monophyletic groups, taxa colors)
 * 2. Active change edge highlighting (blue) - edges from lattice tracking
 * 3. Marked subtree highlighting (red) - from computed subtrees
 *
 * Used by LayerStyles.js to provide colors for DeckGL layers
 */
import { useAppStore } from '../../core/store.js';
import { TREE_COLOR_CATEGORIES } from '../../constants/TreeColors.js';
import {
  getBaseBranchColor,
  getBaseNodeColor,
  resolveActiveEdgeSet,
  isActiveChangeEdgeHighlighted,
  nodeOrParentMatchesActiveEdge,
  isDownstreamOfActiveChangeEdge,
  isNodeDownstreamOfActiveChangeEdge,
  isComponentMarked,
  isNodeMarked
} from './color/index.js';

export class TreeColorManager {
  constructor() {
    this.monophyleticColoringEnabled = true;
    this.currentActiveChangeEdges = new Set();
    this.marked = [];
  }

  /**
   * Refresh the color categories and trigger re-render
   */
  refreshColorCategories() {
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
   * Priority: Active change edge (blue) > Marked (red) > Base color
   * @param {Object} linkData - D3 link data
   * @returns {string} Hex color code
   */
  getBranchColorWithHighlights(linkData) {
    const isMarked = isComponentMarked(linkData, this.marked);
    const isActiveEdge = isActiveChangeEdgeHighlighted(linkData, this.currentActiveChangeEdges);

    if (isActiveEdge) {
      return TREE_COLOR_CATEGORIES.activeChangeEdgeColor;
    } else if (isMarked) {
      return TREE_COLOR_CATEGORIES.markedColor;
    } else {
      return getBaseBranchColor(linkData, this.monophyleticColoringEnabled);
    }
  }

  /**
   * Get branch color for the inner/main line
   * Active change edges get highlight color, marked branches keep base color
   * @param {Object} linkData - D3 link data
   * @returns {string} Hex color code
   */
  getBranchColorForInnerLine(linkData) {
    const isActiveEdge = isActiveChangeEdgeHighlighted(linkData, this.currentActiveChangeEdges);

    if (isActiveEdge) {
      return TREE_COLOR_CATEGORIES.activeChangeEdgeColor;
    } else {
      // Marked branches keep their base color (taxa/monophyletic)
      return getBaseBranchColor(linkData, this.monophyleticColoringEnabled);
    }
  }

  /**
   * Get base branch color (without highlighting)
   * @param {Object} linkData - D3 link data
   * @returns {string} Hex color code
   */
  getBranchColor(linkData) {
    return getBaseBranchColor(linkData, this.monophyleticColoringEnabled);
  }

  // ========================
  // PUBLIC API - NODE COLORS
  // ========================

  /**
   * Get node color with highlighting logic
   * @param {Object} nodeData - Node data
   * @param {Array} activeChangeEdges - Active change edges (optional)
   * @returns {string} Hex color code
   */
  getNodeColor(nodeData, activeChangeEdges = []) {
    const edgeSet = resolveActiveEdgeSet(activeChangeEdges, this.currentActiveChangeEdges);
    const marked = isNodeMarked(nodeData, this.marked);
    const isActiveEdgeNode = nodeOrParentMatchesActiveEdge(nodeData, edgeSet);

    if (marked) {
      return TREE_COLOR_CATEGORIES.markedColor;
    } else if (isActiveEdgeNode) {
      return TREE_COLOR_CATEGORIES.activeChangeEdgeColor;
    } else {
      return getBaseNodeColor(nodeData, this.monophyleticColoringEnabled);
    }
  }

  // =======================
  // PUBLIC API - STATE MANAGEMENT
  // =======================

  /**
   * Update marked subtrees (red highlighting)
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

  // =======================
  // PUBLIC API - QUERIES
  // =======================

  /**
   * Check if a branch is downstream of any active change edge
   */
  isDownstreamOfAnyActiveChangeEdge(linkData) {
    if (!this.currentActiveChangeEdges || this.currentActiveChangeEdges.size === 0) {
      return false;
    }
    return isDownstreamOfActiveChangeEdge(linkData, [this.currentActiveChangeEdges]);
  }

  /**
   * Check if a node is downstream of any active change edge
   */
  isNodeDownstreamOfAnyActiveChangeEdge(nodeData) {
    if (!this.currentActiveChangeEdges || this.currentActiveChangeEdges.size === 0) {
      return false;
    }
    return isNodeDownstreamOfActiveChangeEdge(nodeData, [this.currentActiveChangeEdges]);
  }

  /**
   * Check if there are any active change edges
   */
  hasActiveChangeEdges() {
    return this.currentActiveChangeEdges && this.currentActiveChangeEdges.size > 0;
  }

  /**
   * Check if a branch is specifically an active change edge
   */
  isActiveChangeEdge(linkData) {
    return isActiveChangeEdgeHighlighted(linkData, this.currentActiveChangeEdges);
  }

  /**
   * Clean up resources
   */
  destroy() {
    // No store subscription to clean up - store handles updates centrally
  }
}
