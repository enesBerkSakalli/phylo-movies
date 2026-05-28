const MIN_NODE_SIZE = 0.01;

export const createTreeAppearanceSlice = (set) => ({
  // ==========================================================================
  // STATE
  // ==========================================================================
  fontSize: '1.8em',
  strokeWidth: 1,
  nodeSize: 0.5,
  styleConfig: { labelOffsets: { DEFAULT: 1, EXTENSION: 1 } },
  labelsVisible: true, // Whether node/taxa labels are displayed
  branchAnnotationLabelKey: 'none', // Parsed branch annotation field shown on internal branches

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
    set({ nodeSize: Math.max(MIN_NODE_SIZE, Math.min(10, numericSize)) });
  },

  setLabelsVisible: (visible) => set({ labelsVisible: !!visible }),
  setBranchAnnotationLabelKey: (valueKey) => {
    const branchAnnotationLabelKey =
      typeof valueKey === 'string' && valueKey.length > 0 ? valueKey : 'none';
    set({ branchAnnotationLabelKey });
  },
});
