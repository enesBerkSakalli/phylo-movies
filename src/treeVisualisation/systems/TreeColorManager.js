/**
 * TreeColorManager - Centralized color management system for phylogenetic tree visualization
 *
 * Handles threetypes of coloring:
 * 1. Base coloring (monophyletic groups, taxa colors)
 * 2. Pivot edge highlighting (blue) - edges from lattice tracking
 * 3. Marked subtree highlighting (red) - from computed subtrees
 *
 * Used by LayerStyles.js to provide colors for DeckGL layers
 */
import { useAppStore } from '../../state/phyloStore/store.js';
import { SYSTEM_TREE_COLORS } from '../../constants/TreeColors.js';
import {
  getBaseBranchColor,
  getBaseNodeColor,
  toSplitSet,
  isLinkPivotEdge,
  nodeOrParentMatchesPivotEdge,
  nodeOrParentMatchesAnyEdge,
  isLinkDownstreamOfChangeEdge,
  isNodeDownstreamOfChangeEdge
} from './tree_color/index.js';
import {
  isLinkInSubtree,
  isNodeInSubtree,
  isNodeSubtreeRoot,
  getLinkSplitIndices,
  getSplitIndices
} from '../../domain/tree/splits.js';

export class TreeColorManager {
  constructor() {
    this.monophyleticColoringEnabled = true;
    this.markedSubtreesColoringEnabled = true; // Controls whether marked subtrees get red color
    this.currentPivotEdges = new Set();
    this.upcomingChangeEdges = []; // Array of Sets for upcoming edges
    this.completedChangeEdges = []; // Array of Sets for completed edges
    this.markedSubtreeSets = []; // Marked subtree sets used for highlighting and dimming
    this._markedLeavesUnion = new Set(); // Pre-built union of all marked leaf indices for O(1) rejection
    this.historySubtrees = []; // Subtrees that already moved in the current transition
    this.sourceEdgeLeaves = [];
    this.destinationEdgeLeaves = [];
    this.currentMovingSubtrees = [];
  }

  /**
   * Refresh the color categories and trigger re-render
   */
  refreshColorCategories() {
    const store = useAppStore.getState();
    for (const controller of store.treeControllers) {
      controller.renderAllElements();
    }
  }

  // ===========================
  // PUBLIC API - BRANCH COLORS
  // ===========================

  /**
   * Get branch color with highlighting logic
   * Priority: Marked (red, if enabled) > Pivot edge (blue) > Base color
   * @param {Object} linkData - Normalized link data
   * @returns {string} Hex color code
   */
  getBranchColorWithHighlights(linkData) {
    const isMarked = this.isLinkInMarkedSubtreeFast(linkData);
    const isPivotEdge = isLinkPivotEdge(linkData, this.currentPivotEdges);

    if (isMarked) {
      return SYSTEM_TREE_COLORS.markedColor;
    } else if (isPivotEdge) {
      return SYSTEM_TREE_COLORS.pivotEdgeColor;
    } else {
      return getBaseBranchColor(linkData, this.monophyleticColoringEnabled);
    }
  }

  /**
   * Get branch color for the inner/main line
   * Pivot edges get highlight color, marked branches keep base color
   * @param {Object} linkData - Normalized link data
   * @returns {string} Hex color code
   */
  getBranchColorForInnerLine(linkData) {
    const isPivotEdge = isLinkPivotEdge(linkData, this.currentPivotEdges);

    if (isPivotEdge) {
      return SYSTEM_TREE_COLORS.pivotEdgeColor;
    } else {
      // Marked branches keep their base color (taxa/monophyletic)
      return getBaseBranchColor(linkData, this.monophyleticColoringEnabled);
    }
  }

  /**
   * Get base branch color (without highlighting)
   * @param {Object} linkData - Normalized link data
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
   * @param {Array} pivotEdges - Pivot edges (optional)
   * @returns {string} Hex color code
   */
  getNodeColor(nodeData, pivotEdges = []) {
    const edgeSet = toSplitSet(pivotEdges, this.currentPivotEdges);
    const marked = this.isNodeInMarkedSubtreeFast(nodeData);
    const isPivotEdgeNode = nodeOrParentMatchesPivotEdge(nodeData, edgeSet);

    if (marked) {
      return SYSTEM_TREE_COLORS.markedColor;
    } else if (isPivotEdgeNode) {
      return SYSTEM_TREE_COLORS.pivotEdgeColor;
    } else {
      return getBaseNodeColor(nodeData, this.monophyleticColoringEnabled);
    }
  }

  /**
   * Get base node color (without highlighting)
   * Used for contrast calculation to ensure consistency with links
   * @param {Object} nodeData - Node data
   * @returns {string} Hex color code
   */
  getNodeBaseColor(nodeData) {
    return getBaseNodeColor(nodeData, this.monophyleticColoringEnabled);
  }

  // =======================
  // PUBLIC API - STATE MANAGEMENT
  // =======================

  /**
   * Update marked subtree sets used for red highlighting and dimming.
   * Pre-converts to Sets and builds a union index for O(1) rejection in hot paths.
   */
  updateMarkedSubtrees(markedSubtrees) {
    let subtrees = [];
    if (Array.isArray(markedSubtrees)) {
      subtrees = markedSubtrees;
    } else if (markedSubtrees instanceof Set) {
      subtrees = [markedSubtrees];
    }

    // Cache as Sets immediately to avoid recreation in render checks
    this.markedSubtreeSets = subtrees.map(s =>
      s instanceof Set ? s : new Set(s)
    );

    // Build union of all marked leaf indices for fast O(1) rejection
    // A node can only be in a subtree if ALL its leaves are in this union
    this._markedLeavesUnion = new Set();
    for (const subtree of this.markedSubtreeSets) {
      for (const leafIdx of subtree) {
        this._markedLeavesUnion.add(leafIdx);
      }
    }
  }

  /**
   * Fast check if a node could possibly be in any marked subtree.
   * Uses pre-built union for O(1) rejection - if any leaf is NOT in union, node can't be in subtree.
   * @param {Object} nodeData - Node with normalized split_indices
   * @returns {boolean} True if node is definitely in a subtree, false if definitely not or needs full check
   */
  isNodeInMarkedSubtreeFast(nodeData) {
    if (!this.markedSubtreesColoringEnabled || this._markedLeavesUnion.size === 0) {
      return false;
    }
    const splits = getSplitIndices(nodeData);
    if (!splits?.length) return false;

    // Fast rejection: if any leaf is NOT in union, node can't be in any subtree
    for (let i = 0; i < splits.length; i++) {
      if (!this._markedLeavesUnion.has(splits[i])) {
        return false;
      }
    }

    // All leaves are in union - do full subset check against individual subtrees
    return isNodeInSubtree(nodeData, this.markedSubtreeSets);
  }

  /**
   * Fast check if a link's target is in any marked subtree.
   * @param {Object} linkData - Link with normalized split metadata
   * @returns {boolean} True if link split is in a subtree
   */
  isLinkInMarkedSubtreeFast(linkData) {
    if (!this.markedSubtreesColoringEnabled || this._markedLeavesUnion.size === 0) {
      return false;
    }
    const splits = getLinkSplitIndices(linkData);
    if (!splits?.length) return false;

    // Fast rejection: if any leaf is NOT in union, link can't be in any subtree
    for (let i = 0; i < splits.length; i++) {
      if (!this._markedLeavesUnion.has(splits[i])) {
        return false;
      }
    }

    // All leaves are in union - do full subset check
    return isLinkInSubtree(linkData, this.markedSubtreeSets);
  }

  /**
   * Update history subtrees (already moved during this transition)
   */
  updateHistorySubtrees(subtrees) {
    let history = [];
    if (Array.isArray(subtrees)) {
      history = subtrees;
    } else if (subtrees instanceof Set) {
      history = [subtrees];
    }

    this.historySubtrees = history.map(s =>
      s instanceof Set ? s : new Set(s)
    );
  }

  updateSourceEdgeLeaves(sourceEdges) {
    let edges = [];
    if (Array.isArray(sourceEdges)) {
      edges = sourceEdges;
    } else if (sourceEdges instanceof Set) {
      edges = [sourceEdges];
    }
    this.sourceEdgeLeaves = edges.map(s => (s instanceof Set ? s : new Set(s)));
  }

  updateDestinationEdgeLeaves(destEdges) {
    let edges = [];
    if (Array.isArray(destEdges)) {
      edges = destEdges;
    } else if (destEdges instanceof Set) {
      edges = [destEdges];
    }
    this.destinationEdgeLeaves = edges.map(s => (s instanceof Set ? s : new Set(s)));
  }

  updateCurrentMovingSubtree(subtree) {
    if (subtree instanceof Set) {
      this.currentMovingSubtrees = [subtree];
    } else if (Array.isArray(subtree)) {
      if (subtree.length > 0 && typeof subtree[0] === 'number') {
        this.currentMovingSubtrees = [new Set(subtree)];
      } else {
        this.currentMovingSubtrees = subtree
          .map((entry) => {
            if (entry instanceof Set) return entry;
            if (Array.isArray(entry)) return new Set(entry);
            return null;
          })
          .filter(Boolean);
      }
    } else {
      this.currentMovingSubtrees = [];
    }
  }

  /**
   * Check if a node is the root of any marked subtree set.
   */
  isNodeMarkedSubtreeRoot(nodeData) {
    return isNodeSubtreeRoot(nodeData, this.markedSubtreeSets);
  }

  /**
   * Update current pivot edge (blue highlighting)
   */
  updatePivotEdge(pivotEdge) {
    this.currentPivotEdges = new Set(pivotEdge);
  }

  /**
   * Update upcoming change edges (lighter/dashed preview)
   * @param {Array} upcomingEdges - Array of edge arrays that will be active before next anchor
   */
  updateUpcomingChangeEdges(upcomingEdges) {
    if (Array.isArray(upcomingEdges)) {
      this.upcomingChangeEdges = upcomingEdges.map(edge => new Set(edge));
    } else {
      this.upcomingChangeEdges = [];
    }
  }

  /**
   * Update completed change edges (grayed out/muted)
   * @param {Array} completedEdges - Array of edge arrays that have been processed since last anchor
   */
  updateCompletedChangeEdges(completedEdges) {
    if (Array.isArray(completedEdges)) {
      this.completedChangeEdges = completedEdges.map(edge => new Set(edge));
    } else {
      this.completedChangeEdges = [];
    }
  }

  /**
   * Check if a link belongs to a history subtree
   */
  isLinkHistorySubtree(linkData) {
    return isLinkInSubtree(linkData, this.historySubtrees);
  }

  /**
   * Check if a node belongs to a history subtree
   */
  isNodeHistorySubtree(nodeData) {
    return isNodeInSubtree(nodeData, this.historySubtrees);
  }

  isNodeSourceEdge(nodeData) {
    return isNodeInSubtree(nodeData, this.sourceEdgeLeaves);
  }

  isNodeDestinationEdge(nodeData) {
    return isNodeInSubtree(nodeData, this.destinationEdgeLeaves);
  }

  isNodeMovingSubtree(nodeData) {
    if (!this.currentMovingSubtrees || this.currentMovingSubtrees.length === 0) return false;
    return isNodeInSubtree(nodeData, this.currentMovingSubtrees);
  }

  isLinkMovingSubtree(linkData) {
    if (!this.currentMovingSubtrees || this.currentMovingSubtrees.length === 0) return false;
    return isLinkInSubtree(linkData, this.currentMovingSubtrees);
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
   * Enable/disable marked subtrees coloring (red highlight)
   * When disabled, subtrees still exist for dimming but don't get red color
   */
  setMarkedSubtreesColoring(enabled) {
    this.markedSubtreesColoringEnabled = enabled;
  }

  /**
   * Get marked subtrees coloring status
   */
  isMarkedSubtreesColoringEnabled() {
    return this.markedSubtreesColoringEnabled;
  }

  // =======================
  // PUBLIC API - QUERIES
  // =======================

  /**
   * Check if a branch is downstream of current pivot edge
   */
  isDownstreamOfAnyPivotEdge(linkData) {
    if (!this.currentPivotEdges || this.currentPivotEdges.size === 0) {
      return false;
    }
    return isLinkDownstreamOfChangeEdge(linkData, [this.currentPivotEdges]);
  }

  /**
   * Check if a node is downstream of current pivot edge
   */
  isNodeDownstreamOfAnyPivotEdge(nodeData) {
    if (!this.currentPivotEdges || this.currentPivotEdges.size === 0) {
      return false;
    }
    return isNodeDownstreamOfChangeEdge(nodeData, [this.currentPivotEdges]);
  }

  /**
   * Check if there are any pivot edges
   */
  hasPivotEdges() {
    return this.currentPivotEdges && this.currentPivotEdges.size > 0;
  }

  /**
   * Check if a branch is specifically a pivot edge
   */
  isPivotEdge(linkData) {
    return isLinkPivotEdge(linkData, this.currentPivotEdges);
  }

  /**
   * Check if a node is part of the pivot edge.
   * This mirrors isPivotEdge(link) but for nodes.
   */
  isNodePivotEdge(nodeData) {
    if (!this.currentPivotEdges || this.currentPivotEdges.size === 0) {
      return false;
    }
    return nodeOrParentMatchesPivotEdge(nodeData, this.currentPivotEdges);
  }


  /**
   * Check if a node is part of an upcoming change edge (node or its parent).
   */
  isNodeUpcomingChangeEdge(nodeData) {
    if (!this.upcomingChangeEdges || this.upcomingChangeEdges.length === 0) {
      return false;
    }
    return nodeOrParentMatchesAnyEdge(nodeData, this.upcomingChangeEdges);
  }

  /**
   * Check if a node is part of a completed change edge (node or its parent).
   */
  isNodeCompletedChangeEdge(nodeData) {
    if (!this.completedChangeEdges || this.completedChangeEdges.length === 0) {
      return false;
    }
    return nodeOrParentMatchesAnyEdge(nodeData, this.completedChangeEdges);
  }

  /**
   * Check if a branch is an upcoming change edge (will be active before next anchor)
   */
  isUpcomingChangeEdge(linkData) {
    if (!this.upcomingChangeEdges || this.upcomingChangeEdges.length === 0) {
      return false;
    }

    // Check if this link matches any upcoming edge
    for (const edgeSet of this.upcomingChangeEdges) {
      if (isLinkPivotEdge(linkData, edgeSet)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a branch is a completed change edge (was active since last anchor)
   */
  isCompletedChangeEdge(linkData) {
    if (!this.completedChangeEdges || this.completedChangeEdges.length === 0) {
      return false;
    }

    // Check if this link matches any completed edge
    for (const edgeSet of this.completedChangeEdges) {
      if (isLinkPivotEdge(linkData, edgeSet)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if there are any upcoming change edges
   */
  hasUpcomingChangeEdges() {
    return this.upcomingChangeEdges && this.upcomingChangeEdges.length > 0;
  }

  /**
   * Check if there are any completed change edges
   */
  hasCompletedChangeEdges() {
    return this.completedChangeEdges && this.completedChangeEdges.length > 0;
  }

  /**
   * Clean up resources
   */
  destroy() {
    // No store subscription to clean up - store handles updates centrally
  }
}
