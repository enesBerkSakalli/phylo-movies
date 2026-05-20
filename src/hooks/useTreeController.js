import { useEffect, useRef } from 'react';
import { useAppStore } from '../state/phyloStore/store.js';
import { selectInputFrameIndices } from '../state/phyloStore/selectors/treeSelectors.js';
import { DeckGLTreeAnimationController } from '../treeVisualisation/DeckGLTreeAnimationController.js';
import { calculateWindow } from '../domain/msa/msaWindowCalculator.js';
import { getMsaColumnCount } from '../domain/msa/msaSequenceSummary.js';

// =============================================================================
// HOOK
// =============================================================================

export function useTreeController() {
  const controllerRef = useRef(null);
  const renderRafRef = useRef(null);
  const renderInFlightRef = useRef(false);
  const renderQueuedRef = useRef(false);
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
      if (state.treeList.length === 0) return;

      if (state.treeControllers.length > 0) {
        controllerRef.current = state.treeControllers[0];
        return;
      }

      const controller = new DeckGLTreeAnimationController({
        animations: true,
      });

      state.setTreeControllers([controller]);
      controllerRef.current = controller;
    };

    const scheduleRender = () => {
      if (disposed) return;

      if (renderInFlightRef.current) {
        renderQueuedRef.current = true;
        return;
      }

      if (renderRafRef.current != null) return;

      renderRafRef.current = schedule(async () => {
        renderRafRef.current = null;
        if (disposed) return;
        renderInFlightRef.current = true;
        renderQueuedRef.current = false;

        try {
          const state = useAppStore.getState();
          if (state.movieTimelineManager?.scrubController?.isScrubbing) return;
          if (state.playing) return;

          const controller = controllerRef.current || state.treeControllers[0];
          if (!controller || state.treeList.length === 0) return;

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
              await renderComparisonMode(controller, state, state.frameIndex, state.timelineCursor);
            } else if (state.playhead?.timelineProgress != null && typeof controller.renderTimelineProgress === 'function') {
              await controller.renderTimelineProgress(state.playhead.timelineProgress);
            } else {
              await controller.renderProgress(state.playhead?.animationProgress ?? 0);
            }
          } catch (error) {
            console.error('Error during tree rendering:', error);
          } finally {
            if (!disposed) {
              state.setRenderInProgress(false);
            }
          }
        } finally {
          renderInFlightRef.current = false;
          if (renderQueuedRef.current && !disposed) {
            scheduleRender();
          }
        }
      });
    };

    const syncMsaRegion = ({ force = false } = {}) => {
      const state = useAppStore.getState();
      const msaColumnCount = getMsaColumnCount(state.msaSequences);
      if (!state.syncMSAEnabled || !msaColumnCount) {
        if (force) {
          state.clearMsaRegion?.();
          state.clearMsaPreviousRegion?.();
        }
        return;
      }

      const frameIndex = state.timelineCursor?.msaWindowIndex;
      if (!Number.isInteger(frameIndex) || frameIndex < 0) return;
      if (!force && frameIndex === prevMsaFrameRef.current) return;

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
        msaColumnCount
      );
      state.setMsaRegion(windowData.startPosition, windowData.endPosition);
    };

    ensureController();
    syncMsaRegion({ force: true });
    scheduleRender();

    const unsubscribe = useAppStore.subscribe((state, prevState) => {
      const isTimelineScrubbing = state.movieTimelineManager?.scrubController?.isScrubbing ?? false;

      if (state.treeList !== prevState.treeList || state.comparisonMode !== prevState.comparisonMode) {
        // Reset comparison auto-fit when toggling comparison mode so the camera
        // refits properly for the new layout (single ↔ side-by-side).
        const ctrl = controllerRef.current || state.treeControllers[0];
        if (state.comparisonMode !== prevState.comparisonMode) {
          ctrl?.layerManager?.comparisonRenderer?.resetAutoFit?.();
        }
        ensureController();
        scheduleRender();
      }

      if (state.treeControllers !== prevState.treeControllers) {
        controllerRef.current = state.treeControllers[0] ?? null;
      }

      const frameIndexChanged = state.frameIndex !== prevState.frameIndex;
      const timelineCursorChanged = state.timelineCursor !== prevState.timelineCursor;

      if (frameIndexChanged || timelineCursorChanged) {
        syncMsaRegion();
      }

      if (state.playhead !== prevState.playhead && !frameIndexChanged && !timelineCursorChanged) {
        syncMsaRegion();
        if (!isTimelineScrubbing) {
          scheduleRender();
        }
      }

      if (state.clipboardTreeIndex !== prevState.clipboardTreeIndex) {
        scheduleRender();
      }

      // Ensure every controller reacts to branch length transforms, even if the change
      // originated outside the TreeStructure dropdown.
      if (state.branchTransformation !== prevState.branchTransformation) {
        const controller = controllerRef.current || state.treeControllers[0];
        if (controller) {
          controller.resetInterpolationCaches();
          controller.initializeUniformScaling(state.branchTransformation);
        }
        scheduleRender();
      }

      if (
        state.movieTimelineManager !== prevState.movieTimelineManager ||
        state.syncMSAEnabled !== prevState.syncMSAEnabled ||
        state.msaWindowSize !== prevState.msaWindowSize ||
        state.msaStepSize !== prevState.msaStepSize ||
        state.msaSequences !== prevState.msaSequences
      ) {
        syncMsaRegion({ force: true });
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
      renderQueuedRef.current = false;
      renderInFlightRef.current = false;
      unsubscribe?.();

      const controller = controllerRef.current;
      const state = useAppStore.getState();
      controllerRef.current = null;

      if (state.treeControllers.length) {
        state.setTreeControllers([]);
      } else if (controller) {
        controller.destroy();
      }
    };
  }, []);
}

// =============================================================================
// HELPERS
// =============================================================================

async function renderComparisonMode(controller, state, frameIndex, timelineCursor) {
  const inputTreeIndices = selectInputFrameIndices(state);
  const sourceInputTreeIndex = timelineCursor?.sourceFrameIndex ?? frameIndex;
  const rightIndex = inputTreeIndices.find((i) => i > sourceInputTreeIndex) ?? inputTreeIndices[inputTreeIndices.length - 1];

  await controller.renderAllElements({
    leftIndex: frameIndex,
    rightIndex,
    comparisonMode: true
  });
}
