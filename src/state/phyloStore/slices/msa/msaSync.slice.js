import { normalizeMsaRegionRange } from '../../../../domain/msa/msaRegionRange.js';

/**
 * MSA Viewer slice: MSA data, viewer state, and region selection.
 */
export const createMsaViewerSlice = (set, get) => ({
  // ==========================================================================
  // STATE: MSA Data
  // ==========================================================================
  hasMsa: false,
  msaSequences: null,
  msaWindowSize: 1000,
  msaStepSize: 50,
  msaColumnCount: 0,
  msaRegion: null,
  msaPreviousRegion: null,
  msaRowOrder: null,

  // ==========================================================================
  // STATE: MSA Viewer UI
  // ==========================================================================
  isMsaViewerOpen: false,
  syncMSAEnabled: true,
  msaWindow: { x: 40, y: 40, width: 960, height: 620 },

  // ==========================================================================
  // ACTIONS: MSA Data
  // ==========================================================================
  setMsaData: ({ hasMsa, windowSize, stepSize, columnCount, sequences }) => {
    set({
      hasMsa: !!hasMsa,
      msaSequences: sequences ?? null,
      msaWindowSize: windowSize,
      msaStepSize: stepSize,
      msaColumnCount: columnCount
    });
  },

  resetMsaData: () => {
    set({
      hasMsa: false,
      msaSequences: null,
      msaWindowSize: 1000,
      msaStepSize: 50,
      msaColumnCount: 0,
      msaRegion: null,
      msaPreviousRegion: null,
      msaRowOrder: null
    });
  },

  // ==========================================================================
  // ACTIONS: MSA Region
  // ==========================================================================
  setMsaRegion: (start, end) => {
    const { msaColumnCount, msaRegion } = get();
    const nextRegion = normalizeMsaRegionRange(start, end, msaColumnCount);

    if (!nextRegion) {
      if (msaRegion !== null) {
        set({ msaRegion: null });
      }
      return;
    }

    if (!msaRegion || msaRegion.start !== nextRegion.start || msaRegion.end !== nextRegion.end) {
      set({ msaRegion: nextRegion });
    }
  },

  clearMsaRegion: () => set({ msaRegion: null }),

  setMsaPreviousRegion: (start, end) => {
    const { msaColumnCount, msaPreviousRegion } = get();
    const nextRegion = normalizeMsaRegionRange(start, end, msaColumnCount);

    if (!nextRegion) {
      if (msaPreviousRegion !== null) {
        set({ msaPreviousRegion: null });
      }
      return;
    }

    if (!msaPreviousRegion || msaPreviousRegion.start !== nextRegion.start || msaPreviousRegion.end !== nextRegion.end) {
      set({ msaPreviousRegion: nextRegion });
    }
  },

  clearMsaPreviousRegion: () => set({ msaPreviousRegion: null }),

  // ==========================================================================
  // ACTIONS: Row Ordering
  // ==========================================================================
  setMsaRowOrder: (order) => {
    if (!Array.isArray(order) || order.length === 0) {
      set({ msaRowOrder: null });
      return;
    }
    set({ msaRowOrder: order.slice() });
  },

  clearMsaRowOrder: () => set({ msaRowOrder: null }),

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
