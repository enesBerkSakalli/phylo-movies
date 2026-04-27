export const createTreeAppearanceSlice = (set) => ({
  // ==========================================================================
  // STATE
  // ==========================================================================
  fontSize: '1.8em',
  strokeWidth: 1,
  nodeSize: 0.5,
  styleConfig: { labelOffsets: { DEFAULT: 1, EXTENSION: 1 } },
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

  setNodeSize: (size) => {
    const numericSize = Number(size);
    set({ nodeSize: Math.max(0.1, Math.min(10, numericSize)) });
  },

  setLabelsVisible: (visible) => set({ labelsVisible: !!visible }),
});
