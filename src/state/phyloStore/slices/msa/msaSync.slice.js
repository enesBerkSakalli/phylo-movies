import { normalizeMsaRegionRange } from '../../../../domain/msa/msaRegionRange.js';
import { getMsaColumnCount } from '../../../../domain/msa/msaSequenceSummary.js';

/**
 * MSA Viewer slice: MSA data, viewer state, and region selection.
 */
export const createMsaViewerSlice = (set, get) => ({
  // ==========================================================================
  // STATE: MSA Data
  // ==========================================================================
  msaSequences: null,
  msaWindowSize: 1000,
  msaStepSize: 50,
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
  setMsaData: ({ windowSize, stepSize, sequences }) => {
    set({
      msaSequences: sequences ?? null,
      msaWindowSize: windowSize,
      msaStepSize: stepSize
    });
  },

  resetMsaData: () => {
    set({
      msaSequences: null,
      msaWindowSize: 1000,
      msaStepSize: 50,
      msaRegion: null,
      msaPreviousRegion: null,
      msaRowOrder: null
    });
  },

  // ==========================================================================
  // ACTIONS: MSA Region
  // ==========================================================================
  setMsaRegion: (start, end) => {
    const { msaSequences, msaRegion } = get();
    const msaColumnCount = getMsaColumnCount(msaSequences);
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
    const { msaSequences, msaPreviousRegion } = get();
    const msaColumnCount = getMsaColumnCount(msaSequences);
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
