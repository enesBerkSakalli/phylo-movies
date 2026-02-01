export const createTreeAppearanceSlice = (set, get) => ({
  // ==========================================================================
  // STATE
  // ==========================================================================
  fontSize: '1.8em',
  strokeWidth: 1,
  connectorStrokeWidth: 1,
  nodeSize: 0.5,
  branchTransformation: 'none',
  cameraMode: 'orthographic',
  layoutAngleDegrees: 360,
  layoutRotationDegrees: 0,
  styleConfig: { contourWidthOffset: 2, labelOffsets: { DEFAULT: 1, WITH_EXTENSIONS: 3, EXTENSION: 1 } },
  taxaColoringOpen: false,
  taxaColoringWindow: { x: 40, y: 40, width: 640, height: 700 },
  markedSubtreeOpacity: 0.5, // Default opacity for the marked subtree highlight (reduced from 0.8)
  labelsVisible: true, // Whether node/taxa labels are displayed

  // ==========================================================================
  // ACTIONS
  // ==========================================================================
  setFontSize: (size) => {
    let fontSize = size;
    if (typeof fontSize === 'number') {
      fontSize = `${fontSize}em`;
    } else if (typeof fontSize === 'string' && !fontSize.match(/(em|px|pt|rem)$/)) {
      fontSize = `${fontSize}em`;
    }
    set({ fontSize });
  },

  setStrokeWidth: (width) => set({ strokeWidth: Number(width) }),

  setConnectorStrokeWidth: (width) => set({ connectorStrokeWidth: Number(width) }),

  setNodeSize: (size) => {
    const numericSize = Number(size);
    set({ nodeSize: Math.max(0.1, Math.min(10, numericSize)) });
  },

  setBranchTransformation: (transform) => set({ branchTransformation: transform }),

  setLayoutAngleDegrees: (degrees) => {
    const value = Number.isFinite(degrees) ? degrees : 360;
    set({ layoutAngleDegrees: value });
  },

  setLayoutRotationDegrees: (degrees) => {
    const value = Number.isFinite(degrees) ? degrees : 0;
    set({ layoutRotationDegrees: value });
  },

  toggleCameraMode: () => {
    const { cameraMode } = get();
    const newMode = cameraMode === 'orthographic' ? 'orbit' : 'orthographic';
    set({ cameraMode: newMode });
    return newMode;
  },

  setTaxaColoringOpen: (isOpen) => set({ taxaColoringOpen: !!isOpen }),
  setTaxaColoringWindow: (partial) => set((state) => ({
    taxaColoringWindow: { ...state.taxaColoringWindow, ...partial }
  })),

  setMarkedSubtreeOpacity: (opacity) => {
    const value = Math.max(0, Math.min(1, Number(opacity)));
    set({ markedSubtreeOpacity: value });
  },

  setLabelsVisible: (visible) => set({ labelsVisible: !!visible }),
});
