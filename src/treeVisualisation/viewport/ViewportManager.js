/**
 * ViewportManager
 *
 * Handles viewport calculations, camera positioning, bounds checking,
 * and screen space projections for tree visualization.
 */
import { useAppStore } from '../../state/phyloStore/store.js';
import { areBoundsInView } from '../spatial/bounds.js';
import { calculateViewportFitAreas } from '../spatial/layout.js';
import { calculateFocusViewport, VIEWPORT_FIT_MODES } from './viewportFit.js';

export class ViewportManager {
  // ==========================================================================
  // CONSTRUCTOR
  // ==========================================================================

  constructor(controller) {
    this.controller = controller;
  }

  // ==========================================================================
  // COMPARISON OFFSETS
  // ==========================================================================

  getRightTreeOffset() {
    const { rightTreeOffsetX = 0, rightTreeOffsetY = 0 } = useAppStore.getState();
    const x = Number.isFinite(Number(rightTreeOffsetX)) ? Number(rightTreeOffsetX) : 0;
    const y = Number.isFinite(Number(rightTreeOffsetY)) ? Number(rightTreeOffsetY) : 0;
    return { x, y };
  }

  // ==========================================================================
  // BOUNDS CALCULATION
  // ==========================================================================

  areBoundsInView(bounds, paddingFactor = 1.05) {
    const viewport = this.controller.deckContext?.getPrimaryViewport?.();
    return areBoundsInView(bounds, viewport, paddingFactor);
  }

  // ==========================================================================
  // CAMERA FOCUS
  // ==========================================================================

  focusOnTree(nodes, labels, options = {}) {
    const { playing } = useAppStore.getState();
    if (playing && !options.allowDuringPlayback) return;
    const fitMode = options.fitMode ?? VIEWPORT_FIT_MODES.BRANCH;
    const { width: canvasWidth, height: canvasHeight } =
      this.controller.deckContext.getCanvasDimensions();
    const fitAreas = this.getViewportFitAreas({
      obstructionScope: options.obstructionScope,
    });
    const getLabelSize =
      options.getLabelSize ??
      this.controller.layerManager.layerStyles.getLabelSize?.bind(
        this.controller.layerManager.layerStyles
      );
    const activeView = this.controller.deckContext.getActiveView();
    const currentViewState = this.controller.deckContext.getViewState();
    const { target, zoom } = calculateFocusViewport({
      nodes,
      labels,
      links: options.links,
      fitMode,
      padding: options.padding,
      labelSizePx: options.labelSizePx,
      getLabelSize,
      canvasWidth,
      canvasHeight,
      fitAreas,
      maxFitAreaCenterDriftRatio: options.maxFitAreaCenterDriftRatio,
      maxZoomOverAutoVisibleFit: options.maxZoomOverAutoVisibleFit,
      activeView,
      currentViewState,
    });

    this.controller.deckContext.transitionTo({
      target,
      zoom,
      duration: options.duration ?? 550,
      easing: options.easing, // DeckGLContext will use default if undefined
      interpolator: options.interpolator,
    });
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  getViewportFitAreas(options = {}) {
    return calculateViewportFitAreas(this.controller.deckContext?.container, {
      obstructionScope: options.obstructionScope,
    });
  }
}
