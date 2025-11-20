import { TREE_COLOR_CATEGORIES } from '../../constants/TreeColors.js';
import { COLOR_STORAGE_KEY } from './dataSlice.js';

// Local helpers
const persistColorCategories = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(COLOR_STORAGE_KEY, JSON.stringify(TREE_COLOR_CATEGORIES));
  } catch (_) {
    // ignore
  }
};

const renderTreeControllers = (controllers) => {
  if (!Array.isArray(controllers)) return;
  controllers.forEach((controller) => {
    if (typeof controller?.renderAllElements === 'function') {
      controller.renderAllElements();
    }
  });
};

const flattenHighlightEntries = (entries) => {
  if (!Array.isArray(entries)) {
    return [];
  }
  const flattened = [];
  entries.forEach((entry) => {
    if (Array.isArray(entry)) {
      flattened.push(...entry);
    } else if (entry != null) {
      flattened.push(entry);
    }
  });
  return flattened;
};

export const createHighlightSlice = (set, get) => ({
  monophyleticColoringEnabled: true,
  activeChangeEdgesEnabled: true, // Toggle for active change edges highlighting
  markedComponentsEnabled: true, // Toggle for marked subtrees highlighting (naming only)
  activeChangeEdgeColor: TREE_COLOR_CATEGORIES.activeChangeEdgeColor,
  markedColor: TREE_COLOR_CATEGORIES.markedColor,
  manualHighlightedNodes: [], // User-invoked highlights (e.g., from context menu)
  // Taxa grouping (from TaxaColoring modal) for UI/tooltip use
  taxaGrouping: null, // { mode: 'taxa'|'groups'|'csv', separator?, strategyType?, csvTaxaMap? }
  // Color update tracking for deck.gl updateTriggers
  taxaColorVersion: 0, // Increment when TREE_COLOR_CATEGORIES changes

  /**
   * Apply theme-aware default colors for branches and strokes.
   * @param {'system'|'light'|'dark'} themePref
   */
  applyThemeColors: (themePref = 'light') => {
    try {
      const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = themePref === 'dark' || (themePref === 'system' && prefersDark);

      const next = {
        // Slightly darker neutral grey for dark theme
        defaultColor: isDark ? '#9AA4AE' : '#000000',
        strokeColor: isDark ? '#9AA4AE' : '#000000',
      };

      Object.assign(TREE_COLOR_CATEGORIES, next);

      // Notify ColorManager and trigger re-render
      const { colorManager, treeControllers } = get();
      if (colorManager && colorManager.refreshColorCategories) {
        colorManager.refreshColorCategories();
      }
      renderTreeControllers(treeControllers);
    } catch (e) {
      console.warn('[store] applyThemeColors failed:', e);
    }
  },

  /**
   * Gets the current ColorManager instance
   * @returns {ColorManager} The color manager instance
   */
  getColorManager: () => {
    const { colorManager } = get();
    return colorManager;
  },

  /**
   * Updates the ColorManager with new marked subtrees
   * @param {Array<Array>} markedComponents - Array of arrays containing marked subtree IDs
   */
  updateColorManagerMarkedSubtrees: (markedComponents) => {
    const { colorManager } = get();
    if (!colorManager || typeof colorManager.updateMarkedSubtrees !== 'function') {
      return;
    }

    const normalizedInput = Array.isArray(markedComponents) ? markedComponents : [];
    const convertedMarked = normalizedInput.map((component) => {
      if (component instanceof Set) {
        return component;
      }
      if (Array.isArray(component)) {
        return new Set(component);
      }
      if (component == null) {
        return new Set();
      }
      return new Set([component]);
    });

    colorManager.updateMarkedSubtrees(convertedMarked);
  },

  /**
   * Updates the ColorManager with new active change edge data
   * @param {Array} activeChangeEdge - Active change edge data for highlighting
   */
  updateColorManagerActiveChangeEdge: (activeChangeEdge) => {
    const { colorManager } = get();
    if (!colorManager || typeof colorManager.updateActiveChangeEdge !== 'function') {
      return;
    }

    const normalizedEdge =
      activeChangeEdge instanceof Set || Array.isArray(activeChangeEdge)
        ? activeChangeEdge
        : [];

    colorManager.updateActiveChangeEdge(normalizedEdge); // Update current active change edges
  },

  /**
   * Updates highlighting colors in TREE_COLOR_CATEGORIES
   * @param {string} colorType - Type of color to update (activeChangeEdgeColor, markedColor)
   * @param {string} newColor - New hex color value
   */
  updateHighlightingColor: (colorType, newColor) => {
    // Create new object to avoid direct mutation and ensure reactivity
    const updatedCategories = { ...TREE_COLOR_CATEGORIES, [colorType]: newColor };

    // Update the module-level TREE_COLOR_CATEGORIES for external consumers
    Object.assign(TREE_COLOR_CATEGORIES, updatedCategories);

    if (colorType === 'activeChangeEdgeColor') {
      set({ activeChangeEdgeColor: newColor });
    } else if (colorType === 'markedColor') {
      set({ markedColor: newColor });
    }

    // Notify ColorManager of the update
    const { colorManager, treeControllers } = get();
    if (colorManager && colorManager.refreshColorCategories) {
      colorManager.refreshColorCategories();
    }

    renderTreeControllers(treeControllers);
    persistColorCategories();
  },

  /**
   * Updates active change edge highlighting color
   * @param {string} newColor - New hex color value for active change edge highlighting
   */
  setActiveChangeEdgeColor: (newColor) => {
    const { updateHighlightingColor } = get();
    updateHighlightingColor('activeChangeEdgeColor', newColor);
  },

  /**
   * Updates marked subtrees highlighting color (naming only)
   * @param {string} newColor - New hex color value for marked subtree highlighting
   */
  setMarkedColor: (newColor) => {
    const { updateHighlightingColor } = get();
    updateHighlightingColor('markedColor', newColor);
  },

  /**
   * Updates taxa colors in TREE_COLOR_CATEGORIES
   * Called after TaxaColoring component applies new colors
   * @param {Object} newColorMap - Object mapping taxa names to hex colors
   */
  updateTaxaColors: (newColorMap) => {
    // Create new object to avoid direct mutation and ensure reactivity
    const updatedCategories = { ...TREE_COLOR_CATEGORIES, ...newColorMap };

    // Update the module-level TREE_COLOR_CATEGORIES for external consumers
    Object.assign(TREE_COLOR_CATEGORIES, updatedCategories);

    // Increment version to trigger deck.gl updateTriggers
    set((state) => ({ taxaColorVersion: state.taxaColorVersion + 1 }));

    // Notify ColorManager of the update
    const { colorManager, treeControllers } = get();
    if (colorManager && colorManager.refreshColorCategories) {
      colorManager.refreshColorCategories();
    }

    renderTreeControllers(treeControllers);
    persistColorCategories();
  },

  /**
   * Persist current taxa grouping settings for UI (tooltips, lists)
   * @param {Object|null} grouping - { mode, separator?, strategyType?, csvTaxaMap? }
   */
  setTaxaGrouping: (grouping) => set({ taxaGrouping: grouping }),

  /**
   * Gets highlighting data (subtrees) for the current tree position
   * @returns {Array} Array of highlight subtrees for current tree state
   */
  getActualHighlightData: (treeIndexOverride = null) => {
    const { currentTreeIndex, transitionResolver, pairSolutions, activeChangeEdgeTracking, movieData } = get();
    const index = typeof treeIndexOverride === 'number' ? treeIndexOverride : currentTreeIndex;

    // When at an ORIGINAL (full) tree, clear all red highlights
    // Use a robust check against known full-tree sequence indices
    const fullTreeSeq = (transitionResolver?.fullTreeIndices || movieData?.fullTreeIndices || []);
    const onAnchor = Array.isArray(fullTreeSeq) && fullTreeSeq.includes(index);
    if (onAnchor || transitionResolver?.isFullTree?.(index)) {
      return [];
    }

    // Only evaluate the current step (no accumulation)
    const i = index;
    const activeChangeEdge = activeChangeEdgeTracking?.[i];
    if (!Array.isArray(activeChangeEdge) || activeChangeEdge.length === 0) {
      return [];
    }

    const pairKey = movieData?.tree_metadata?.[i]?.tree_pair_key;
    const pairEntry = pairKey ? pairSolutions?.[pairKey] : null;
    const latticeSolutions = pairEntry?.jumping_subtree_solutions || {};
    if (!pairEntry) return [];

    const edgeKey = `[${activeChangeEdge.join(', ')}]`;
    const latticeEdgeData = latticeSolutions[edgeKey];
    return flattenHighlightEntries(latticeEdgeData);
  },

  /**
   * Gets current active change edge data for automatic highlighting
   * @returns {Array} Current active change edge data for the current tree position, or empty array
   */
  getCurrentActiveChangeEdge: (treeIndexOverride = null) => {
    const { currentTreeIndex, activeChangeEdgeTracking } = get();
    const index = typeof treeIndexOverride === 'number' ? treeIndexOverride : currentTreeIndex;
    const activeChangeEdge = activeChangeEdgeTracking?.[index];
    return activeChangeEdge || []; // Return empty array if undefined
  },

  /**
   * Updates the ColorManager based on the current tree index and enabled features.
   * This is the canonical way to sync color highlighting.
   */
  updateColorManagerForCurrentIndex: () => {
    const {
      markedComponentsEnabled,
      activeChangeEdgesEnabled,
      getActualHighlightData,
      getCurrentActiveChangeEdge,
      updateColorManagerMarkedSubtrees,
      updateColorManagerActiveChangeEdge,
      manualHighlightedNodes
    } = get();

    const manual = Array.isArray(manualHighlightedNodes) && manualHighlightedNodes.length
      ? [new Set(manualHighlightedNodes)]
      : [];

    if (markedComponentsEnabled) {
      const markedComponents = getActualHighlightData();
      updateColorManagerMarkedSubtrees([...manual, ...markedComponents]);
    } else {
      updateColorManagerMarkedSubtrees(manual);
    }

    if (activeChangeEdgesEnabled) {
      const activeChangeEdge = getCurrentActiveChangeEdge();
      updateColorManagerActiveChangeEdge(activeChangeEdge);
    } else {
      updateColorManagerActiveChangeEdge([]);
    }
  },

  /**
   * Enables or disables monophyletic coloring mode
   * @param {boolean} enabled - Whether monophyletic coloring is enabled
   */
  setMonophyleticColoring: (enabled) => {
    set({ monophyleticColoringEnabled: enabled });

    // Automatically update the ColorManager to keep it in sync
    const { colorManager } = get();
    if (colorManager) {
      colorManager.setMonophyleticColoring(enabled);
    }
  },

  /**
   * Set whether active change edges highlighting is enabled.
   * @param {boolean} enabled - Whether active change edges highlighting is enabled.
   */
  setActiveChangeEdgesEnabled: (enabled) => {
    set({ activeChangeEdgesEnabled: enabled });

    // Update ColorManager - clear or restore based on enabled state
    const { updateColorManagerActiveChangeEdge, getCurrentActiveChangeEdge } = get();
    if (!enabled) {
      // Clear active change edges when disabled
      updateColorManagerActiveChangeEdge([]);
    } else {
      // Restore current active change edges when enabled
      const activeChangeEdge = getCurrentActiveChangeEdge();
      updateColorManagerActiveChangeEdge(activeChangeEdge);
    }
  },

  /**
   * Set whether marked subtrees highlighting is enabled (naming only).
   * @param {boolean} enabled - Whether marked subtrees highlighting is enabled.
   */
  setMarkedComponentsEnabled: (enabled) => {
    set({ markedComponentsEnabled: enabled });

    // Update ColorManager - clear or restore based on enabled state (naming only)
    const { updateColorManagerMarkedSubtrees, getActualHighlightData, manualHighlightedNodes } = get();
    if (!enabled) {
      // Clear marked subtrees when disabled
      updateColorManagerMarkedSubtrees(
        Array.isArray(manualHighlightedNodes) && manualHighlightedNodes.length
          ? [new Set(manualHighlightedNodes)]
          : []
      );
    } else {
      // Restore marked subtrees when enabled
      const markedComponents = getActualHighlightData();
      const manual = Array.isArray(manualHighlightedNodes) && manualHighlightedNodes.length
        ? [new Set(manualHighlightedNodes)]
        : [];
      updateColorManagerMarkedSubtrees([...manual, ...markedComponents]);
    }
  },

  /**
   * Set descendants highlighted manually (e.g., from context menu) and refresh rendering.
   * @param {Array<string>} nodeIds
   */
  setHighlightedNodes: (nodeIds = []) => {
    const nodes = Array.isArray(nodeIds) ? nodeIds.filter(Boolean) : [];
    set({ manualHighlightedNodes: nodes });

    const {
      markedComponentsEnabled,
      getActualHighlightData,
      updateColorManagerMarkedSubtrees,
      treeControllers
    } = get();

    const manual = nodes.length ? [new Set(nodes)] : [];
    if (markedComponentsEnabled) {
      const autoMarked = getActualHighlightData();
      updateColorManagerMarkedSubtrees([...manual, ...autoMarked]);
    } else {
      updateColorManagerMarkedSubtrees(manual);
    }

    renderTreeControllers(treeControllers);
  },
});
