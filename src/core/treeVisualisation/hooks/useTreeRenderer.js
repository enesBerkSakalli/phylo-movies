import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/store.js';

/**
 * Visual Renderer scheduling. Drives requestAnimationFrame manually
 * depending on what layout or tree index settings change.
 */
export function useTreeRenderer(controllerRef) {
  const renderRafRef = useRef(null);

  useEffect(() => {
    let disposed = false;

    const schedule = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (cb) => setTimeout(cb, 16);
    const cancelSchedule = (id) => { if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id); else clearTimeout(id); };

    const scheduleRender = () => {
      if (renderRafRef.current != null) return;

      renderRafRef.current = schedule(async () => {
        renderRafRef.current = null;
        if (disposed) return;

        const state = useAppStore.getState();

        // Let the internal animation runner or scrubber take primary control
        if (state.movieTimelineManager?.scrubController?.isScrubbing) return;
        if (state.playing) return;

        const controller = controllerRef.current || state.treeControllers?.[0];
        if (!controller || !state.movieData) return;

        if (!controller.ready) {
          try { await controller.readyPromise; } catch { return; }
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

    // Trigger initial evaluation immediately
    scheduleRender();

    const unsubscribe = useAppStore.subscribe((state, prevState) => {
      const isTimelineScrubbing = state.movieTimelineManager?.scrubController?.isScrubbing ?? false;

      // Group layout checks that force uniform scaling caches to invalidate
      if (state.branchTransformation !== prevState.branchTransformation) {
        const controller = controllerRef.current || state.treeControllers?.[0];
        controller?.resetInterpolationCaches?.();
        controller?.initializeUniformScaling?.(state.branchTransformation);
        scheduleRender();
        return; // Prevents duplicate check schedules
      }

      // Standard re-render triggers (Play state, dataset change, progression, UI features)
      if (
        state.movieData !== prevState.movieData ||
        state.comparisonMode !== prevState.comparisonMode ||
        state.clipboardTreeIndex !== prevState.clipboardTreeIndex ||
        state.transitionResolver !== prevState.transitionResolver ||
        state.syncMSAEnabled !== prevState.syncMSAEnabled ||
        state.msaWindowSize !== prevState.msaWindowSize ||
        state.msaStepSize !== prevState.msaStepSize ||
        state.msaColumnCount !== prevState.msaColumnCount ||
        (state.playing !== prevState.playing && !state.playing) ||
        (state.currentTreeIndex !== prevState.currentTreeIndex && !isTimelineScrubbing) ||
        (state.animationProgress !== prevState.animationProgress && !isTimelineScrubbing)
      ) {
        scheduleRender();
      }
    });

    return () => {
      disposed = true;
      if (renderRafRef.current != null) {
        cancelSchedule(renderRafRef.current);
        renderRafRef.current = null;
      }
      unsubscribe();
    };
  }, [controllerRef]);

  return { requestRender: () => {} }; // Expose if any other hook needed manual triggering, omitted logic for now
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
