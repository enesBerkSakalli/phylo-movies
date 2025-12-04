import { clamp } from '../../domain/math/mathUtils.js';
import { MovieTimelineManager } from '../../timeline/core/MovieTimelineManager.js';

/**
 * UI/appearance slice: UI flags, controls, GUI references, and look/feel settings.
 */
export const createUiSlice = (set, get) => ({
  gui: null,
  treeControllers: [],
  movieTimelineManager: null,
  comparisonMode: false,
  syncMSAEnabled: true,
  isMsaViewerOpen: false,
  msaWindow: { x: 40, y: 40, width: 960, height: 620 },
  fontSize: '2.6em',
  strokeWidth: 1,
  nodeSize: 0.7,
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
  layoutAngleDegrees: 360,
  layoutRotationDegrees: 0,
  viewOffsetX: 0,
  viewOffsetY: 0,
  viewsConnected: false,

  // Timeline tooltip state
  hoveredSegmentIndex: null,
  hoveredSegmentData: null,

  setHoveredSegment: (segmentIndex, segmentData = null) => set({
    hoveredSegmentIndex: segmentIndex,
    hoveredSegmentData: segmentData
  }),

  toggleComparisonMode: () => set((state) => ({ comparisonMode: !state.comparisonMode })),

  openMsaViewer: () => set({ isMsaViewerOpen: true }),
  closeMsaViewer: () => set({ isMsaViewerOpen: false }),
  setMsaWindow: (partial) => set((state) => ({
    msaWindow: { ...state.msaWindow, ...(partial || {}) }
  })),

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
   * Sets the angular extent (in degrees) of the radial tree layout (default 360).
   */
  setLayoutAngleDegrees: (degrees) => {
    const value = Number.isFinite(degrees) ? degrees : 360;
    set({ layoutAngleDegrees: value });
  },

  /**
   * Sets the rotation (in degrees) of the radial tree layout (default 0).
   */
  setLayoutRotationDegrees: (degrees) => {
    const value = Number.isFinite(degrees) ? degrees : 0;
    set({ layoutRotationDegrees: value });
  },

  /**
   * Horizontal spacing offset between trees (comparison view).
   */
  setViewOffsetX: (offset) => {
    const value = clamp(Number(offset) || 0, -5000, 5000);
    set({ viewOffsetX: value });
  },

  /**
   * Vertical offset between trees (comparison view).
   */
  setViewOffsetY: (offset) => {
    const value = clamp(Number(offset) || 0, -5000, 5000);
    set({ viewOffsetY: value });
  },

  /**
   * Sets the branch transformation mode
   * @param {string} transform - Transformation type ('none', 'log', etc.)
   */
  setBranchTransformation: (transform) => set({ branchTransformation: transform }),

  /**
   * Toggle or set whether the two views are linked for connector rendering.
   */
  setViewsConnected: (enabled) => set({ viewsConnected: !!enabled }),

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
    const { gui: currentGui, movieTimelineManager: currentManager } = get();

    // Clean up previous GUI instance if it exists and is being replaced
    if (currentGui && currentGui !== instance) {
      if (typeof currentGui.destroy === 'function') {
        currentGui.destroy();
      }
    }

    // Clean up previous MovieTimelineManager if exists
    if (currentManager && typeof currentManager.destroy === 'function') {
      currentManager.destroy();
    }

    set({ gui: instance });

    // Initialize MovieTimelineManager when GUI is set
    if (instance) {
      const state = get();
      if (state.movieData && state.transitionResolver) {
        try {
          const manager = new MovieTimelineManager(state.movieData, state.transitionResolver);
          set({ movieTimelineManager: manager });
        } catch (error) {
          console.error('[Store] Failed to initialize MovieTimelineManager:', error);
          set({ movieTimelineManager: null });
        }
      }
    } else {
      set({ movieTimelineManager: null });
    }
  },

  // ========================================
  // ANIMATION CONTROLS (Direct Access)
  // ========================================
  /**
   * Start animation playback
   */
  startAnimationPlayback: async () => {
    const { playing, treeControllers, gui } = get();
    if (playing) return;

    // Ensure we have a tree controller ready
    if (!treeControllers.length && gui?.updateMain) {
      await gui.updateMain();
    }

    // Start animation on all controllers
    const controllers = get().treeControllers;
    controllers.forEach(c => {
      if (c?.startAnimation) c.startAnimation();
    });
  },

  /**
   * Stop animation playback
   */
  stopAnimationPlayback: () => {
    const { treeControllers, stop } = get();

    // Stop animation on all controllers
    treeControllers.forEach(c => {
      if (c?.stopAnimation) c.stopAnimation();
    });

    // Update store state
    stop();
  },

  // ========================================
  // TIMELINE CONTROLS (Direct Access)
  // ========================================
  /**
   * Zoom in on timeline
   */
  zoomInTimeline: () => {
    const { movieTimelineManager } = get();
    try {
      const timeline = movieTimelineManager?.timeline;
      if (!timeline?.zoomIn) return;
      // Import constant value inline to avoid circular dependencies
      timeline.zoomIn(0.2); // TIMELINE_CONSTANTS.ZOOM_PERCENTAGE_UI
    } catch (e) {
      console.warn('[Store] zoomInTimeline failed:', e);
    }
  },

  /**
   * Zoom out on timeline
   */
  zoomOutTimeline: () => {
    const { movieTimelineManager } = get();
    try {
      const timeline = movieTimelineManager?.timeline;
      if (!timeline?.zoomOut) return;
      timeline.zoomOut(0.2); // TIMELINE_CONSTANTS.ZOOM_PERCENTAGE_UI
    } catch (e) {
      console.warn('[Store] zoomOutTimeline failed:', e);
    }
  },

  /**
   * Fit timeline to window
   */
  fitTimeline: () => {
    const { movieTimelineManager } = get();
    try {
      const timeline = movieTimelineManager?.timeline;
      if (!timeline?.fit) return;
      timeline.fit();
    } catch (e) {
      console.warn('[Store] fitTimeline failed:', e);
    }
  },

  /**
   * Scroll timeline to start
   */
  scrollToStartTimeline: () => {
    const { movieTimelineManager } = get();
    try {
      const timeline = movieTimelineManager?.timeline;
      if (!timeline?.moveTo) return;
      timeline.moveTo(0); // TIMELINE_CONSTANTS.DEFAULT_PROGRESS
    } catch (e) {
      console.warn('[Store] scrollToStartTimeline failed:', e);
    }
  },

  /**
   * Scroll timeline to end
   */
  scrollToEndTimeline: () => {
    const { movieTimelineManager } = get();
    try {
      const timeline = movieTimelineManager?.timeline;
      if (!timeline) return;

      const total = timeline.getTotalDuration?.();
      const range = timeline.getVisibleTimeRange?.();

      if (typeof total === 'number' && range && typeof range.min === 'number' && typeof range.max === 'number') {
        const visible = Math.max(0, range.max - range.min);
        timeline.moveTo(Math.max(0, total - visible));
      }
    } catch (e) {
      console.warn('[Store] scrollToEndTimeline failed:', e);
    }
  },
});
