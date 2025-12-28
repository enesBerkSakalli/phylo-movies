import { clamp } from '../../domain/math/mathUtils.js';

/**
 * MSA Viewer slice: MSA data, viewer state, and region selection.
 */
export const createMsaViewerSlice = (set, get) => ({
  // ==========================================================================
  // STATE: MSA Data
  // ==========================================================================
  hasMsa: false,
  msaWindowSize: 1000,
  msaStepSize: 50,
  msaColumnCount: 0,
  msaRegion: null,

  // ==========================================================================
  // STATE: MSA Viewer UI
  // ==========================================================================
  isMsaViewerOpen: false,
  syncMSAEnabled: true,
  msaWindow: { x: 40, y: 40, width: 960, height: 620 },

  // ==========================================================================
  // ACTIONS: MSA Data
  // ==========================================================================
  setMsaData: ({ hasMsa, windowSize, stepSize, columnCount }) => {
    set({
      hasMsa: !!hasMsa,
      msaWindowSize: windowSize,
      msaStepSize: stepSize,
      msaColumnCount: columnCount
    });
  },

  resetMsaData: () => {
    set({
      hasMsa: false,
      msaWindowSize: 1000,
      msaStepSize: 50,
      msaColumnCount: 0,
      msaRegion: null
    });
  },

  // ==========================================================================
  // ACTIONS: MSA Region
  // ==========================================================================
  setMsaRegion: (start, end) => {
    const { msaColumnCount, msaRegion } = get();
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      if (msaRegion !== null) {
        set({ msaRegion: null });
      }
      return;
    }
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    const limit = msaColumnCount || Number.MAX_SAFE_INTEGER;
    const clampedStart = clamp(min, 1, limit);
    const clampedEnd = clamp(max, 1, limit);

    if (!msaRegion || msaRegion.start !== clampedStart || msaRegion.end !== clampedEnd) {
      set({ msaRegion: { start: clampedStart, end: clampedEnd } });
    }
  },

  clearMsaRegion: () => set({ msaRegion: null }),

  // ==========================================================================
  // ACTIONS: MSA Viewer UI
  // ==========================================================================
  openMsaViewer: () => set({ isMsaViewerOpen: true }),
  closeMsaViewer: () => set({ isMsaViewerOpen: false }),
  setMsaWindow: (partial) => set((state) => ({
    msaWindow: { ...state.msaWindow, ...partial }
  })),
  setSyncMSAEnabled: (enabled) => set({ syncMSAEnabled: !!enabled }),
});
