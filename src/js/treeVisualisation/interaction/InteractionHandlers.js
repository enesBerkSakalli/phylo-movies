import { useAppStore } from '../../core/store.js';

// ==========================================================================
// INTERACTIVE DRAGGING (Trees)
// ==========================================================================

export function handleDragStart(controller, info) {
  // Only allow dragging if we picked a tree element (node, link, extension, label)
  const treeSide = info.object?.treeSide;
  if (!treeSide) return false;

  const state = useAppStore.getState();

  // Store starting offsets
  let startOffset;
  if (treeSide === 'left') {
    startOffset = { x: state.leftTreeOffsetX, y: state.leftTreeOffsetY };
  } else if (treeSide === 'right') {
    startOffset = { x: state.viewOffsetX, y: state.viewOffsetY };
  } else if (treeSide === 'clipboard') {
    startOffset = { x: state.clipboardOffsetX, y: state.clipboardOffsetY };
  } else {
    return false;
  }

  const deckContext = controller.deckContext;
  const controllerConfig = deckContext.getControllerConfig?.() || null;

  controller._dragState = {
    side: treeSide,
    startOffset,
    startPos: { x: info.x, y: info.y },
    controllerConfig: controllerConfig ? { ...controllerConfig } : null
  };

  // Prevent map panning while dragging a tree - use callback mechanism for React compatibility
  deckContext.setControllerConfig({
    ...(controllerConfig || deckContext.getControllerConfig()),
    dragPan: false
  });
  return true;
}

export function handleDrag(controller, info) {
  if (!controller._dragState) return false;

  const { side, startOffset, startPos } = controller._dragState;
  const viewState = controller.deckContext.getViewState();
  const zoom = viewState.zoom ?? 0;
  const [zoomX, zoomY] = Array.isArray(zoom) ? zoom : [zoom, zoom];
  const safeZoomX = Number.isFinite(zoomX) ? zoomX : 0;
  const safeZoomY = Number.isFinite(zoomY) ? zoomY : 0;

  // Convert total screen pixel displacement to world units
  // Formula for Orthographic: world = pixel * 2^-zoom
  const totalPixelDeltaX = info.x - startPos.x;
  const totalPixelDeltaY = info.y - startPos.y;

  if (!Number.isFinite(totalPixelDeltaX) || !Number.isFinite(totalPixelDeltaY)) {
    return false;
  }

  const worldDeltaX = totalPixelDeltaX * Math.pow(2, -safeZoomX);
  const worldDeltaY = totalPixelDeltaY * Math.pow(2, -safeZoomY);

  const state = useAppStore.getState();
  if (side === 'left') {
    state.setLeftTreeOffsetX(startOffset.x + worldDeltaX);
    state.setLeftTreeOffsetY(startOffset.y + worldDeltaY);
  } else if (side === 'right') {
    state.setViewOffsetX(startOffset.x + worldDeltaX);
    state.setViewOffsetY(startOffset.y + worldDeltaY);
  } else if (side === 'clipboard') {
    state.setClipboardOffsetX(startOffset.x + worldDeltaX);
    state.setClipboardOffsetY(startOffset.y + worldDeltaY);
  }

  // Trigger a render update
  controller.renderAllElements();

  return true;
}

export function handleDragEnd(controller) {
  if (!controller._dragState) return;

  const controllerConfig = controller._dragState.controllerConfig;
  controller._dragState = null;

  // Re-enable map panning - use callback mechanism for React compatibility
  if (controllerConfig) {
    controller.deckContext.setControllerConfig(controllerConfig);
  } else {
    controller.deckContext.setControllerConfig(controller.deckContext.getControllerConfig());
  }
}

// ==========================================================================
// CONTAINER RESIZE
// ==========================================================================

export function handleContainerResize(controller) {
  if (controller._resizeRenderScheduled) return;
  controller._resizeRenderScheduled = true;

  const schedule = typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : (cb) => setTimeout(cb, 16);

  schedule(async () => {
    controller._resizeRenderScheduled = false;
    const { playing } = useAppStore.getState();
    if (playing) return;
    // controller._lastFocusedTreeIndex = null; // Removed to prevent auto-focus reset on resize
    controller.layerManager?.comparisonRenderer?.resetAutoFit?.();
    try {
      await controller.renderAllElements();
    } catch (err) {
      console.warn('[DeckGLTreeAnimationController] Resize render failed:', err);
    }
  });
}
