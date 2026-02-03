import { useEffect, useRef } from 'react';
import { useAppStore } from '../js/core/store.js';
import { DeckGLTreeAnimationController } from '../js/treeVisualisation/DeckGLTreeAnimationController.js';
import { calculateWindow } from '../js/domain/msa/msaWindowCalculator.js';
import { getMSAFrameIndex } from '../js/domain/indexing/IndexMapping.js';

// =============================================================================
// HOOK
// =============================================================================

export function useTreeController() {
  const controllerRef = useRef(null);
  const renderRafRef = useRef(null);
  const prevMsaFrameRef = useRef(-1);

  useEffect(() => {
    let disposed = false;

    const schedule = typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (cb) => setTimeout(cb, 16);

    const cancelSchedule = (id) => {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(id);
      } else {
        clearTimeout(id);
      }
    };

    const ensureController = () => {
      const state = useAppStore.getState();
      if (!state.movieData) return;

      if (Array.isArray(state.treeControllers) && state.treeControllers.length > 0) {
        controllerRef.current = state.treeControllers[0];
        return;
      }

      const controller = new DeckGLTreeAnimationController('#webgl-container', {
        animations: true,
        comparisonMode: state.comparisonMode,
        useReactDeckGL: true
      });

      state.setTreeControllers([controller]);
      controllerRef.current = controller;
    };

    const scheduleRender = () => {
      if (renderRafRef.current != null) return;

      renderRafRef.current = schedule(async () => {
        renderRafRef.current = null;
        if (disposed) return;

        const state = useAppStore.getState();
        if (state.playing) return;

        const controller = controllerRef.current || state.treeControllers?.[0];
        if (!controller || !state.movieData) return;

        if (!controller.ready) {
          try {
            await controller.readyPromise;
          } catch {
            return;
          }
        }

        state.setRenderInProgress(true);
        try {
          if (state.comparisonMode) {
            await renderComparisonMode(controller, state.transitionResolver, state.currentTreeIndex);
          } else {
            await controller.renderProgress(state.animationProgress);
          }
        } catch (error) {
          console.error('Error during tree rendering:', error);
        } finally {
          state.setRenderInProgress(false);
        }
      });
    };

    const syncColorManager = () => {
      const state = useAppStore.getState();
      if (!state.playing && state.updateColorManagerForCurrentIndex) {
        state.updateColorManagerForCurrentIndex();
      }
    };

    const syncMsaRegion = () => {
      const state = useAppStore.getState();
      if (!state.syncMSAEnabled || !state.transitionResolver || !state.msaColumnCount) return;

      const frameIndex = getMSAFrameIndex();
      if (frameIndex < 0) return;
      if (frameIndex === prevMsaFrameRef.current) return;

      prevMsaFrameRef.current = frameIndex;

      // Save current region as previous before updating
      const currentRegion = state.msaRegion;
      if (currentRegion) {
        state.setMsaPreviousRegion(currentRegion.start, currentRegion.end);
      }

      const windowData = calculateWindow(
        frameIndex,
        state.msaStepSize,
        state.msaWindowSize,
        state.msaColumnCount
      );
      state.setMsaRegion(windowData.startPosition, windowData.endPosition);
    };

    ensureController();
    scheduleRender();

    const unsubscribe = useAppStore.subscribe((state, prevState) => {
      if (state.movieData !== prevState.movieData || state.comparisonMode !== prevState.comparisonMode) {
        ensureController();
        scheduleRender();
      }

      if (state.treeControllers !== prevState.treeControllers) {
        controllerRef.current = Array.isArray(state.treeControllers) ? state.treeControllers[0] : null;
      }

      if (state.currentTreeIndex !== prevState.currentTreeIndex) {
        syncColorManager();
        syncMsaRegion();
        scheduleRender();
      }

      if (state.animationProgress !== prevState.animationProgress) {
        syncMsaRegion();
        scheduleRender();
      }

      if (state.clipboardTreeIndex !== prevState.clipboardTreeIndex) {
        scheduleRender();
      }

      // Ensure every controller reacts to branch length transforms, even if the change
      // originated outside the TreeStructure dropdown.
      if (state.branchTransformation !== prevState.branchTransformation) {
        const controller = controllerRef.current || state.treeControllers?.[0];
        controller?.resetInterpolationCaches?.();
        controller?.initializeUniformScaling?.(state.branchTransformation);
        scheduleRender();
      }

      if (
        state.transitionResolver !== prevState.transitionResolver ||
        state.syncMSAEnabled !== prevState.syncMSAEnabled ||
        state.msaWindowSize !== prevState.msaWindowSize ||
        state.msaStepSize !== prevState.msaStepSize ||
        state.msaColumnCount !== prevState.msaColumnCount
      ) {
        syncMsaRegion();
        scheduleRender();
      }

      if (state.playing !== prevState.playing && !state.playing) {
        scheduleRender();
      }
    });

    return () => {
      disposed = true;
      if (renderRafRef.current != null) {
        cancelSchedule(renderRafRef.current);
        renderRafRef.current = null;
      }
      unsubscribe?.();

      // Properly destroy the controller to clean up deck.gl instances and DOM elements
      // This prevents React DOM reconciliation errors when the component unmounts
      const controller = controllerRef.current;
      if (controller) {
        try {
          controller.destroy();
        } catch (err) {
          console.warn('[useTreeController] Failed to destroy controller:', err);
        }
        controllerRef.current = null;
      }

      // Clear tree controllers from store to prevent stale references
      const state = useAppStore.getState();
      if (state.treeControllers?.length) {
        state.setTreeControllers([]);
      }
    };
  }, []);
}

// =============================================================================
// HELPERS
// =============================================================================

async function renderComparisonMode(controller, transitionResolver, currentTreeIndex) {
  const full = transitionResolver?.fullTreeIndices || [];
  const sourceAnchorIndex = transitionResolver?.getSourceTreeIndex(currentTreeIndex) ?? 0;
  const rightIndex = full.find((i) => i > sourceAnchorIndex) ?? full[full.length - 1];

  await controller.renderAllElements({
    leftIndex: currentTreeIndex,
    rightIndex,
    comparisonMode: true
  });
}
