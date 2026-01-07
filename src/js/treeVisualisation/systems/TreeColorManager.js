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
  isLinkActiveChangeEdge,
  nodeOrParentMatchesActiveEdge,
  nodeOrParentMatchesAnyEdge,
  isLinkDownstreamOfChangeEdge,
  isNodeDownstreamOfChangeEdge
} from './color/index.js';
import {
  isLinkInSubtree,
  isNodeInSubtree,
  isNodeSubtreeRoot
} from '../deckgl/layers/styles/subtreeMatching.js';

export class TreeColorManager {
  constructor() {
    this.monophyleticColoringEnabled = true;
    this.markedSubtreesColoringEnabled = true; // Controls whether marked subtrees get red color
    this.currentActiveChangeEdges = new Set();
    this.upcomingChangeEdges = []; // Array of Sets for upcoming edges
    this.completedChangeEdges = []; // Array of Sets for completed edges
    this.prominentHistoryHashes = new Set(); // Set of hashes for prominent history (added + moved structures)
    this.sharedMarkedJumpingSubtrees = []; // Shared jumping subtrees across views
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
   * Priority: Active change edge (blue) > Marked (red, if enabled) > Base color
   * @param {Object} linkData - D3 link data
   * @returns {string} Hex color code
   */
  getBranchColorWithHighlights(linkData) {
    const isMarked = this.markedSubtreesColoringEnabled && isLinkInSubtree(linkData, this.sharedMarkedJumpingSubtrees);
    const isActiveEdge = isLinkActiveChangeEdge(linkData, this.currentActiveChangeEdges);

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
    const isActiveEdge = isLinkActiveChangeEdge(linkData, this.currentActiveChangeEdges);

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
    const marked = this.markedSubtreesColoringEnabled && isNodeInSubtree(nodeData, this.sharedMarkedJumpingSubtrees);
    const isActiveEdgeNode = nodeOrParentMatchesActiveEdge(nodeData, edgeSet);

    if (marked) {
      return TREE_COLOR_CATEGORIES.markedColor;
    } else if (isActiveEdgeNode) {
      return TREE_COLOR_CATEGORIES.activeChangeEdgeColor;
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
   * Update shared marked jumping subtrees (red highlighting)
   * Pre-converts to Sets for performance in rendering loops.
   */
  updateMarkedSubtrees(markedSubtrees) {
    let subtrees = [];
    if (Array.isArray(markedSubtrees)) {
      subtrees = markedSubtrees;
    } else if (markedSubtrees instanceof Set) {
      subtrees = [markedSubtrees];
    }

    // Cache as Sets immediately to avoid recreation in render checks
    this.sharedMarkedJumpingSubtrees = subtrees.map(s =>
      s instanceof Set ? s : new Set(s)
    );
  }

  /**
   * Check if a node is the root of any shared marked jumping subtree.
   */
  isNodeMarkedSubtreeRoot(nodeData) {
    return isNodeSubtreeRoot(nodeData, this.sharedMarkedJumpingSubtrees);
  }

  /**
   * Update current active change edge (blue highlighting)
   */
  updateActiveChangeEdge(activeChangeEdge) {
    this.currentActiveChangeEdges = new Set(activeChangeEdge);
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
   * Update prominent history hashes (added + moved structures)
   * @param {Set|Array} hashes
   */
  updateProminentHistory(hashes) {
    if (hashes instanceof Set) {
      this.prominentHistoryHashes = hashes;
    } else if (Array.isArray(hashes)) {
      this.prominentHistoryHashes = new Set(hashes);
    } else {
      this.prominentHistoryHashes = new Set();
    }
  }

  /**
   * Check if a branch represents a prominent history structure (added or moved-into)
   */
  isProminentHistoryStructure(linkData) {
    if (!this.prominentHistoryHashes || this.prominentHistoryHashes.size === 0) {
      return false;
    }
    if (!linkData.split_indices) return false;

    // Create hash: sorted indices joined by comma
    const hash = linkData.split_indices.slice().sort((a, b) => a - b).join(',');
    return this.prominentHistoryHashes.has(hash);
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
   * Check if a branch is downstream of any active change edge
   */
  isDownstreamOfAnyActiveChangeEdge(linkData) {
    if (!this.currentActiveChangeEdges || this.currentActiveChangeEdges.size === 0) {
      return false;
    }
    return isLinkDownstreamOfChangeEdge(linkData, [this.currentActiveChangeEdges]);
  }

  /**
   * Check if a node is downstream of any active change edge
   */
  isNodeDownstreamOfAnyActiveChangeEdge(nodeData) {
    if (!this.currentActiveChangeEdges || this.currentActiveChangeEdges.size === 0) {
      return false;
    }
    return isNodeDownstreamOfChangeEdge(nodeData, [this.currentActiveChangeEdges]);
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
    return isLinkActiveChangeEdge(linkData, this.currentActiveChangeEdges);
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
      if (isLinkActiveChangeEdge(linkData, edgeSet)) {
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
      if (isLinkActiveChangeEdge(linkData, edgeSet)) {
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
