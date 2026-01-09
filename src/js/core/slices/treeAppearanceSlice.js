export const createTreeAppearanceSlice = (set, get) => ({
  // ==========================================================================
  // STATE
  // ==========================================================================
  fontSize: '1.8em',
  strokeWidth: 1,
  nodeSize: 0.5,
  branchTransformation: 'none',
  cameraMode: 'orthographic',
  layoutAngleDegrees: 360,
  layoutRotationDegrees: 0,
  styleConfig: { contourWidthOffset: 2, labelOffsets: { DEFAULT: 16, WITH_EXTENSIONS: 32, EXTENSION: 4 } },
  taxaColoringOpen: false,
  taxaColoringWindow: { x: 40, y: 40, width: 980, height: 720 },

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
});
