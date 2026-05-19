import { PulseAnimationController, calculatePulseOpacity } from '../../../../animation/PulseAnimationController.js';
import { TreeColorManager } from '../../../../treeVisualisation/systems/TreeColorManager.js';
import {
  calculateChangePreviews,
  renderTreeControllers,
  toManualMarkedSets,
  toSubtreeSets
} from '../../internal/changeTracking.helpers.js';

let pulseController = null;

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

  calculateHighlightChangePreviews: (indexOverride = null) => calculateChangePreviews(get(), indexOverride),

  initializeColors: () => {
    const colorManager = new TreeColorManager();
    const initialMonophyleticColoring = get().monophyleticColoringEnabled;
    colorManager.setMonophyleticColoring(initialMonophyleticColoring);

    set({
      colorManager,
      pivotEdgeColor: get().pivotEdgeColor,
      markedColor: get().markedColor,
      markedSubtreeScope: 'current',
      taxaGrouping: null,
    });

    setTimeout(() => {
      const {
        getMarkedSubtreeData,
        updateColorManagerMarkedSubtrees,
        updateColorManagerPivotEdge,
        getCurrentPivotEdge
      } = get();

      updateColorManagerMarkedSubtrees(getMarkedSubtreeData());
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

    const { changePulseEnabled, startPulseAnimation, stopPulseAnimation } = get();
    if (changePulseEnabled) {
      const hasChanges = normalized.length > 0 || colorManager.markedSubtreeSets?.length > 0;
      if (hasChanges) {
        startPulseAnimation();
      } else {
        stopPulseAnimation();
      }
    }
  },

  updateColorManagerMarkedSubtrees: (subtrees) => {
    const { colorManager } = get();
    if (!colorManager?.updateMarkedSubtrees) return;
    const asSets = toSubtreeSets(subtrees);

    colorManager.updateMarkedSubtrees(asSets);

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

  updateColorManagerMovingSubtree: (subtree) => {
    const { colorManager } = get();
    if (!colorManager?.updateCurrentMovingSubtree) return;
    colorManager.updateCurrentMovingSubtree(subtree);
    set((s) => ({ colorVersion: s.colorVersion + 1 }));
  },

  updateColorManagerForIndex: (indexOverride = null) => {
    const {
      frameIndex,
      pivotEdgesEnabled,
      colorManager,
      getMarkedSubtreeData,
      getCurrentPivotEdge,
      getSubtreeHistoryData,
      getSourceDestinationEdgeData,
      getCurrentMovingSubtreeData,
      updateUpcomingChanges,
      manuallyMarkedNodes
    } = get();

    const targetIndex = Number.isInteger(indexOverride) ? indexOverride : frameIndex;
    const manual = toManualMarkedSets(manuallyMarkedNodes);
    const markedSubtreeData = getMarkedSubtreeData(targetIndex);
    const pivotEdge = pivotEdgesEnabled ? getCurrentPivotEdge(targetIndex) : [];
    const normalizedPivotEdge = Array.isArray(pivotEdge) || pivotEdge instanceof Set ? pivotEdge : [];
    const subtreeHistoryData = getSubtreeHistoryData(targetIndex);
    const { source, dest } = getSourceDestinationEdgeData(targetIndex);
    const movingSubtreeData = getCurrentMovingSubtreeData(targetIndex);

    colorManager?.updateMarkedSubtrees?.(toSubtreeSets([...manual, ...markedSubtreeData]));
    colorManager?.updatePivotEdge?.(normalizedPivotEdge);
    colorManager?.updateHistorySubtrees?.(toSubtreeSets(subtreeHistoryData));
    colorManager?.updateSourceEdgeLeaves?.(toSubtreeSets(source));
    colorManager?.updateDestinationEdgeLeaves?.(toSubtreeSets(dest));
    colorManager?.updateCurrentMovingSubtree?.(movingSubtreeData);
    updateUpcomingChanges(targetIndex);

    if (colorManager) {
      set((s) => ({ colorVersion: s.colorVersion + 1 }));
    }

    const { changePulseEnabled, startPulseAnimation, stopPulseAnimation } = get();
    if (changePulseEnabled && colorManager) {
      const pivotEdgeCount = normalizedPivotEdge instanceof Set ? normalizedPivotEdge.size : normalizedPivotEdge.length;
      const hasChanges = pivotEdgeCount > 0 || colorManager.markedSubtreeSets?.length > 0;
      if (hasChanges) {
        startPulseAnimation();
      } else {
        stopPulseAnimation();
      }
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

    const hasChanges = colorManager?.hasPivotEdges?.() || colorManager?.markedSubtreeSets?.length > 0;
    if (!hasChanges || pulseController?.isRunning) return;

    if (!pulseController) {
      pulseController = new PulseAnimationController({
        onPhaseUpdate: (phase) => set({ changePulsePhase: phase }),
        shouldContinue: () => {
          const s = get();
          const cm = s.colorManager;
          return s.changePulseEnabled && (cm?.hasPivotEdges?.() || cm?.markedSubtreeSets?.length > 0);
        }
      });
    }
    pulseController.start();
  },

  stopPulseAnimation: () => pulseController?.stop(),
});
