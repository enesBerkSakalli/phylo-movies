import { TREE_COLOR_CATEGORIES } from '../../constants/TreeColors.js';
import { persistColorCategories } from '../../services/storage/colorPersistence.js';

// Local helper to persist with current categories
const persistCurrentColorCategories = () => {
  persistColorCategories(TREE_COLOR_CATEGORIES);
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

// Pulse animation constants
const PULSE_DURATION_MS = 1500; // Full pulse cycle duration
const PULSE_MIN_OPACITY = 0.4; // Minimum opacity during pulse (0-1)
const PULSE_MAX_OPACITY = 1.0; // Maximum opacity during pulse (0-1)

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
  highlightVersion: 0, // Increment when highlight state changes (activeChangeEdge, marked, dimming)

  // Pulse animation state
  highlightPulseEnabled: true, // User preference to enable/disable pulse animation
  highlightPulsePhase: 0, // Current pulse phase (0-1), used for opacity calculation
  _pulseAnimationId: null, // Internal: animation frame ID

  // Dashing state for active change edges
  activeEdgeDashingEnabled: true, // User preference to enable/disable dashed lines on active edges

  // Marked subtree mode: 'all' = all jumping subtrees for current edge, 'current' = only the currently animating subtree
  markedSubtreeMode: 'all',

  /**
   * Gets the current ColorManager instance
   * @returns {TreeColorManager} The color manager instance
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
    // Increment version to trigger deck.gl updateTriggers
    set((state) => ({ highlightVersion: state.highlightVersion + 1 }));
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
    // Increment version to trigger deck.gl updateTriggers
    set((state) => ({ highlightVersion: state.highlightVersion + 1 }));

    // Start or stop pulse animation based on whether there are highlights
    const { highlightPulseEnabled, startPulseAnimation, stopPulseAnimation } = get();
    if (highlightPulseEnabled) {
      const hasHighlights = normalizedEdge.length > 0 || (colorManager?.marked?.length > 0);
      if (hasHighlights) {
        startPulseAnimation();
      } else {
        stopPulseAnimation();
      }
    }
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
    persistCurrentColorCategories();
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
    persistCurrentColorCategories();
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
    const { currentTreeIndex, transitionResolver, pairSolutions, activeChangeEdgeTracking, subtreeTracking, movieData, markedSubtreeMode } = get();
    const index = typeof treeIndexOverride === 'number' ? treeIndexOverride : currentTreeIndex;

    // When at an ORIGINAL (full) tree, clear all red highlights
    // Use a robust check against known full-tree sequence indices
    const fullTreeSeq = (transitionResolver?.fullTreeIndices || movieData?.fullTreeIndices || []);
    const onAnchor = Array.isArray(fullTreeSeq) && fullTreeSeq.includes(index);
    if (onAnchor || transitionResolver?.isFullTree?.(index)) {
      return [];
    }

    // If mode is 'current', use subtreeTracking directly (single current subtree)
    if (markedSubtreeMode === 'current') {
      const currentSubtree = subtreeTracking?.[index];
      if (Array.isArray(currentSubtree) && currentSubtree.length > 0) {
        return [currentSubtree];
      }
      return [];
    }

    // Mode is 'all' - return all jumping subtrees for the current active change edge
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
    // Update state and increment taxaColorVersion to trigger deck.gl updateTriggers
    set((state) => ({
      monophyleticColoringEnabled: enabled,
      taxaColorVersion: state.taxaColorVersion + 1
    }));

    // Automatically update the ColorManager to keep it in sync
    const { colorManager, treeControllers } = get();
    if (colorManager) {
      colorManager.setMonophyleticColoring(enabled);
    }

    // Force re-render of tree controllers to apply the color change
    renderTreeControllers(treeControllers);
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

  // ===========================
  // PULSE ANIMATION
  // ===========================

  /**
   * Enable or disable pulse animation for highlighted edges
   * @param {boolean} enabled - Whether pulse animation is enabled
   */
  setHighlightPulseEnabled: (enabled) => {
    set((state) => ({
      highlightPulseEnabled: enabled,
      highlightVersion: state.highlightVersion + 1 // Trigger re-render
    }));
    if (enabled) {
      get().startPulseAnimation();
    } else {
      get().stopPulseAnimation();
      // Force re-render when disabling to reset pulse opacity
      const { treeControllers } = get();
      renderTreeControllers(treeControllers);
    }
  },

  /**
   * Enable or disable dashed lines for active change edges
   * @param {boolean} enabled - Whether dashing is enabled
   */
  setActiveEdgeDashingEnabled: (enabled) => {
    set((state) => ({
      activeEdgeDashingEnabled: enabled,
      highlightVersion: state.highlightVersion + 1 // Trigger re-render
    }));
    const { treeControllers } = get();
    renderTreeControllers(treeControllers);
  },

  /**
   * Set the marked subtree mode
   * @param {'all' | 'current'} mode - 'all' for all jumping subtrees, 'current' for only the animating subtree
   */
  setMarkedSubtreeMode: (mode) => {
    if (mode !== 'all' && mode !== 'current') return;
    set({ markedSubtreeMode: mode });

    // Update ColorManager with new highlight data based on mode
    const { markedComponentsEnabled, getActualHighlightData, updateColorManagerMarkedSubtrees, manualHighlightedNodes, treeControllers } = get();

    const manual = Array.isArray(manualHighlightedNodes) && manualHighlightedNodes.length
      ? [new Set(manualHighlightedNodes)]
      : [];

    if (markedComponentsEnabled) {
      const markedComponents = getActualHighlightData();
      updateColorManagerMarkedSubtrees([...manual, ...markedComponents]);
    }

    renderTreeControllers(treeControllers);
  },

  /**
   * Get the current pulse opacity multiplier (0-1)
   * Uses a smooth sine wave for breathing effect
   * @returns {number} Opacity multiplier between PULSE_MIN_OPACITY and PULSE_MAX_OPACITY
   */
  getPulseOpacity: () => {
    const { highlightPulseEnabled, highlightPulsePhase } = get();
    if (!highlightPulseEnabled) return 1.0;

    // Sine wave oscillation between min and max opacity
    const range = PULSE_MAX_OPACITY - PULSE_MIN_OPACITY;
    const sineValue = Math.sin(highlightPulsePhase * Math.PI * 2);
    return PULSE_MIN_OPACITY + (range * (0.5 + 0.5 * sineValue));
  },

  /**
   * Start the pulse animation loop
   * Only runs when there are active highlights
   */
  startPulseAnimation: () => {
    const { _pulseAnimationId, highlightPulseEnabled, colorManager } = get();

    // Don't start if already running or disabled
    if (_pulseAnimationId || !highlightPulseEnabled) return;

    // Don't start if no active highlights
    const hasHighlights = colorManager?.hasActiveChangeEdges?.() ||
      (colorManager?.marked?.length > 0);
    if (!hasHighlights) return;

    let startTime = performance.now();

    const animate = (timestamp) => {
      const { highlightPulseEnabled: stillEnabled, colorManager: cm, treeControllers } = get();

      // Check if we should continue animating
      const stillHasHighlights = cm?.hasActiveChangeEdges?.() ||
        (cm?.marked?.length > 0);

      if (!stillEnabled || !stillHasHighlights) {
        set({ _pulseAnimationId: null, highlightPulsePhase: 0 });
        return;
      }

      // Calculate phase (0-1) based on elapsed time
      const elapsed = timestamp - startTime;
      const phase = (elapsed % PULSE_DURATION_MS) / PULSE_DURATION_MS;

      set({ highlightPulsePhase: phase });

      // Trigger layer update by incrementing highlight version
      // This is throttled to ~30fps to avoid excessive re-renders
      if (elapsed % 33 < 16) { // Roughly every 33ms (30fps)
        renderTreeControllers(treeControllers);
      }

      const frameId = requestAnimationFrame(animate);
      set({ _pulseAnimationId: frameId });
    };

    const frameId = requestAnimationFrame(animate);
    set({ _pulseAnimationId: frameId });
  },

  /**
   * Stop the pulse animation loop
   */
  stopPulseAnimation: () => {
    const { _pulseAnimationId } = get();
    if (_pulseAnimationId) {
      cancelAnimationFrame(_pulseAnimationId);
      set({ _pulseAnimationId: null, highlightPulsePhase: 0 });
    }
  },
});
