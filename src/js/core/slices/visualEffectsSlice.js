import { PulseAnimationController, calculatePulseOpacity } from '../../animation/PulseAnimationController.js';
import { renderTreeControllers } from './sliceHelpers.js';

let pulseController = null;

export const createVisualEffectsSlice = (set, get) => ({

  // ==========================================================================
  // STATE
  // ==========================================================================
  changePulseEnabled: true,
  changePulsePhase: 0,
  pivotEdgeDashingEnabled: true,
  highlightColorMode: 'solid', // 'contrast' | 'taxa' | 'solid'
  linkConnectionOpacity: 0.6,

  // ==========================================================================
  // ACTIONS
  // ==========================================================================
  setHighlightColorMode: (mode) => {
    set((s) => ({ highlightColorMode: mode, colorVersion: s.colorVersion + 1 }));
    renderTreeControllers(get().treeControllers);
  },

  setLinkConnectionOpacity: (opacity) => {
    // Clamp between 0 and 1
    const value = Math.max(0, Math.min(1, Number(opacity)));
    set((s) => ({ linkConnectionOpacity: value, colorVersion: s.colorVersion + 1 }));
    renderTreeControllers(get().treeControllers);
  },
  getPulseOpacity: () => {
    const { changePulseEnabled, changePulsePhase } = get();
    return calculatePulseOpacity(changePulsePhase, changePulseEnabled);
  },

  setChangePulseEnabled: (enabled) => {
    set((s) => ({ changePulseEnabled: enabled, colorVersion: s.colorVersion + 1 }));
    if (enabled) {
      get().startPulseAnimation();
    } else {
      get().stopPulseAnimation();
      renderTreeControllers(get().treeControllers);
    }
  },

  setPivotEdgeDashingEnabled: (enabled) => {
    set((s) => ({ pivotEdgeDashingEnabled: enabled, colorVersion: s.colorVersion + 1 }));
    renderTreeControllers(get().treeControllers);
  },

  startPulseAnimation: () => {
    const { changePulseEnabled, colorManager } = get();
    if (!changePulseEnabled) return;

    const hasChanges = colorManager?.hasPivotEdges?.() || colorManager?.sharedMarkedJumpingSubtrees?.length > 0;
    if (!hasChanges || pulseController?.isRunning) return;

    if (!pulseController) {
      pulseController = new PulseAnimationController({
        onPhaseUpdate: (phase) => set({ changePulsePhase: phase }),
        // onRender removed - deck.gl updateTriggers handles pulse updates via changePulsePhase
        shouldContinue: () => {
          const s = get();
          const cm = s.colorManager;
          return s.changePulseEnabled && (cm?.hasPivotEdges?.() || cm?.sharedMarkedJumpingSubtrees?.length > 0);
        }
      });
    }
    pulseController.start();
  },

  stopPulseAnimation: () => pulseController?.stop(),
});
