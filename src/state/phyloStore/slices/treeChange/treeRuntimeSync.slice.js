import {
  PulseAnimationController,
  calculatePulseOpacity,
} from '../../../../animation/PulseAnimationController.js';
import { TreeColorManager } from '../../../../treeVisualisation/systems/TreeColorManager.js';
import {
  calculateChangePreviews,
  renderTreeControllers,
  toManualMarkedSets,
  toSubtreeSets,
} from '../../internal/changeTracking.helpers.js';

let pulseController = null;

function getEdgeCount(edge) {
  if (edge instanceof Set) return edge.size;
  if (Array.isArray(edge)) return edge.length;
  return 0;
}

function syncPivotPulseAnimation(get, hasPivotEdge) {
  const { changePulseEnabled, startPulseAnimation, stopPulseAnimation } = get();
  if (!changePulseEnabled) return;

  if (hasPivotEdge) {
    startPulseAnimation();
  } else {
    stopPulseAnimation();
  }
}

export const createTreeRuntimeSyncSlice = (set, get) => ({
  // ==========================================================================
  // STATE
  // ==========================================================================
  colorManager: null,
  colorVersion: 0,
  currentAnimationStage: null, // 'COLLAPSE' | 'EXPAND' | 'REORDER' | null
  changePulsePhase: 0,

  // ==========================================================================
  // ACTIONS
  // ==========================================================================
  setAnimationStage: (stage) => set({ currentAnimationStage: stage }),

  getColorManager: () => get().colorManager,

  calculateHighlightChangePreviews: (indexOverride = null) =>
    calculateChangePreviews(get(), indexOverride),

  initializeColors: () => {
    const colorManager = new TreeColorManager();
    const initialMonophyleticColoring = get().monophyleticColoringEnabled;
    colorManager.setMonophyleticColoring(initialMonophyleticColoring);

    set({
      colorManager,
      pivotEdgeColor: get().pivotEdgeColor,
      subtreeHighlightColor: get().subtreeHighlightColor,
      subtreeHighlightScope: 'current',
      taxaGrouping: null,
    });

    setTimeout(() => {
      const {
        getSubtreeHighlightData,
        updateColorManagerHighlightedSubtrees,
        updateColorManagerPivotEdge,
        getCurrentPivotEdge,
      } = get();

      updateColorManagerHighlightedSubtrees(getSubtreeHighlightData());
      updateColorManagerPivotEdge(getCurrentPivotEdge());
    }, 0);
  },

  resetColors: () => {
    set({
      colorManager: null,
      colorVersion: 0,
      taxaColorVersion: 0,
      taxaGrouping: null,
      upcomingChangeEdges: [],
      completedChangeEdges: [],
    });
  },

  updateColorManagerPivotEdge: (edge) => {
    const { colorManager } = get();
    if (!colorManager?.updatePivotEdge) return;

    const normalized = Array.isArray(edge) || edge instanceof Set ? edge : [];
    colorManager.updatePivotEdge(normalized);
    set((s) => ({ colorVersion: s.colorVersion + 1 }));

    syncPivotPulseAnimation(get, getEdgeCount(normalized) > 0);
  },

  updateColorManagerHighlightedSubtrees: (subtrees) => {
    const { colorManager } = get();
    if (!colorManager?.updateHighlightedSubtrees) return;
    const asSets = toSubtreeSets(subtrees);

    colorManager.updateHighlightedSubtrees(asSets);

    set((s) => ({ colorVersion: s.colorVersion + 1 }));
  },

  updateColorManagerHistorySubtrees: (subtrees) => {
    const { colorManager } = get();
    if (!colorManager?.updateHistorySubtrees) return;
    colorManager.updateHistorySubtrees(toSubtreeSets(subtrees));
    set((s) => ({ colorVersion: s.colorVersion + 1 }));
  },

  updateColorManagerSourceDestinationEdges: (sourceEdges, destEdges) => {
    const { colorManager } = get();
    if (!colorManager?.updateSourceEdgeLeaves || !colorManager?.updateDestinationEdgeLeaves) return;
    colorManager.updateSourceEdgeLeaves(toSubtreeSets(sourceEdges));
    colorManager.updateDestinationEdgeLeaves(toSubtreeSets(destEdges));
    set((s) => ({ colorVersion: s.colorVersion + 1 }));
  },

  updateColorManagerActiveMoverSubtrees: (subtree) => {
    const { colorManager } = get();
    if (!colorManager?.updateActiveMoverSubtrees) return;
    colorManager.updateActiveMoverSubtrees(subtree);
    set((s) => ({ colorVersion: s.colorVersion + 1 }));
  },

  updateColorManagerForIndex: (indexOverride = null) => {
    const {
      frameIndex,
      pivotEdgesEnabled,
      colorManager,
      getSubtreeHighlightData,
      getCurrentPivotEdge,
      getSubtreeHistoryData,
      getSourceDestinationEdgeData,
      getActiveMoverSubtreeData,
      updateUpcomingChanges,
      manuallyMarkedNodes,
    } = get();

    const targetIndex = Number.isInteger(indexOverride) ? indexOverride : frameIndex;
    const manual = toManualMarkedSets(manuallyMarkedNodes);
    const highlightedSubtreeData = getSubtreeHighlightData(targetIndex);
    const pivotEdge = pivotEdgesEnabled ? getCurrentPivotEdge(targetIndex) : [];
    const normalizedPivotEdge =
      Array.isArray(pivotEdge) || pivotEdge instanceof Set ? pivotEdge : [];
    const subtreeHistoryData = getSubtreeHistoryData(targetIndex);
    const { source, dest } = getSourceDestinationEdgeData(targetIndex);
    const movingSubtreeData = getActiveMoverSubtreeData(targetIndex);

    colorManager?.updateHighlightedSubtrees?.(
      toSubtreeSets([...manual, ...highlightedSubtreeData])
    );
    colorManager?.updatePivotEdge?.(normalizedPivotEdge);
    colorManager?.updateHistorySubtrees?.(toSubtreeSets(subtreeHistoryData));
    colorManager?.updateSourceEdgeLeaves?.(toSubtreeSets(source));
    colorManager?.updateDestinationEdgeLeaves?.(toSubtreeSets(dest));
    colorManager?.updateActiveMoverSubtrees?.(movingSubtreeData);
    updateUpcomingChanges(targetIndex);

    if (colorManager) {
      set((s) => ({ colorVersion: s.colorVersion + 1 }));
    }

    if (colorManager) {
      syncPivotPulseAnimation(get, getEdgeCount(normalizedPivotEdge) > 0);
    }

    renderTreeControllers(get());
  },

  updateColorManagerForCurrentIndex: () => {
    get().updateColorManagerForIndex();
  },

  getPulseOpacity: () => {
    const { changePulseEnabled, changePulsePhase } = get();
    return calculatePulseOpacity(changePulsePhase, changePulseEnabled);
  },

  startPulseAnimation: () => {
    const { changePulseEnabled, colorManager } = get();
    if (!changePulseEnabled) return;

    const hasPivotEdge = colorManager?.hasPivotEdges?.() === true;
    if (!hasPivotEdge || pulseController?.isRunning) return;

    if (!pulseController) {
      pulseController = new PulseAnimationController({
        onPhaseUpdate: (phase) => set({ changePulsePhase: phase }),
        shouldContinue: () => {
          const s = get();
          const cm = s.colorManager;
          return s.changePulseEnabled && cm?.hasPivotEdges?.() === true;
        },
      });
    }
    pulseController.start();
  },

  stopPulseAnimation: () => pulseController?.stop(),
});
