import { clamp } from '../../utils/MathUtils.js';

/**
 * UI/appearance slice: UI flags, controls, GUI references, and look/feel settings.
 */
export const createUiSlice = (set, get) => ({
  gui: null,
  treeControllers: [],
  comparisonMode: false,
  syncMSAEnabled: true,
  fontSize: '2.6em',
  strokeWidth: 2,
  nodeSize: 1,
  branchTransformation: 'none',
  dimmingEnabled: false,
  dimmingOpacity: 0.3,
  cameraMode: 'orthographic',
  styleConfig: { contourWidthOffset: 2, labelOffsets: { DEFAULT: 20, WITH_EXTENSIONS: 40, EXTENSION: 5 } },
  trailsEnabled: false,
  trailLength: 12,
  trailOpacity: 0.5,
  trailThickness: 0.5,
  barOptionValue: 'rfd',

  toggleComparisonMode: () => set((state) => ({ comparisonMode: !state.comparisonMode })),

  /**
   * Toggle syncing of MSA window/step with timeline progression.
   * @param {boolean} enabled
   */
  setSyncMSAEnabled: (enabled) => set({ syncMSAEnabled: !!enabled }),

  // --- Appearance Actions ---
  /**
   * Sets the font size for tree labels
   * @param {string|number} size - Font size (auto-converts to em units)
   */
  setFontSize: (size) => {
    let fontSize = size;
    if (typeof fontSize === 'number') {
      fontSize = `${fontSize}em`;
    } else if (typeof fontSize === 'string' && !fontSize.match(/(em|px|pt|rem)$/)) {
      fontSize = `${fontSize}em`;
    }
    set({ fontSize });
  },

  /**
   * Sets the stroke width for tree branches
   * @param {string|number} width - Stroke width in pixels
   */
  setStrokeWidth: (width) => {
    const numericWidth = Number(width);
    set({ strokeWidth: numericWidth });
  },

  /**
   * Sets the node size multiplier
   * @param {number} size - Node size multiplier (1.0 = default)
   */
  setNodeSize: (size) => {
    const numericSize = Number(size);
    set({ nodeSize: Math.max(0.1, Math.min(10, numericSize)) });
  },


  /**
   * Enables or disables dimming of non-descendant elements.
   * @param {boolean} enabled - Whether dimming is enabled.
   */
  setDimmingEnabled: (enabled) => set({ dimmingEnabled: enabled }),

  /**
   * Sets the opacity level for dimmed elements.
   * @param {number} opacity - Opacity level (0-1) for dimmed elements.
   */
  setDimmingOpacity: (opacity) => set({ dimmingOpacity: Math.max(0, Math.min(1, opacity)) }),


  /**
   * Motion trails toggles and parameters
   */
  setTrailsEnabled: (enabled) => set({ trailsEnabled: !!enabled }),
  setTrailLength: (length) => set({ trailLength: Math.max(2, Math.min(50, Math.round(Number(length) || 12))) }),
  setTrailOpacity: (opacity) => set({ trailOpacity: Math.max(0, Math.min(1, Number(opacity) || 0.5)) }),
  setTrailThickness: (thickness) => set({ trailThickness: Math.max(0.1, Math.min(5, Number(thickness) || 0.5)) }),

  /**
   * Sets the branch transformation mode
   * @param {string} transform - Transformation type ('none', 'log', etc.)
   */
  setBranchTransformation: (transform) => set({ branchTransformation: transform }),

  /**
   * Toggles between orthographic and orbit camera modes
   */
  toggleCameraMode: () => {
    const { cameraMode } = get();
    const newMode = cameraMode === 'orthographic' ? 'orbit' : 'orthographic';
    set({ cameraMode: newMode });
    return newMode;
  },

  /**
   * Sets the chart display option (rfd, wrfd, etc.)
   * @param {string} option - Chart type option
   */
  setBarOption: (option) => set({ barOptionValue: option }),

  /**
   * Sets the tree controller instance with cleanup of previous instance
   * @param {Object} controller - Tree controller instance
   */
  setTreeControllers: (controllers) => {
    const { treeControllers: currentControllers } = get();
    const nextControllers = Array.isArray(controllers) ? controllers : [];
    const nextSet = new Set(nextControllers);

    currentControllers.forEach((controller) => {
      if (!nextSet.has(controller) && typeof controller?.destroy === 'function') {
        controller.destroy();
      }
    });

    set({ treeControllers: nextControllers });
  },

  /**
   * Sets the GUI instance reference with cleanup of previous instance
   * @param {Object} instance - GUI instance
   */
  setGui: (instance) => {
    const { gui: currentGui } = get();

    // Clean up previous GUI instance if it exists and is being replaced
    if (currentGui && currentGui !== instance) {
      if (typeof currentGui.destroy === 'function') {
        currentGui.destroy();
      }
    }

    set({ gui: instance });
  },
});
