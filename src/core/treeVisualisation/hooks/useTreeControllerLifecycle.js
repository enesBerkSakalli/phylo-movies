import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/store.js';
import { DeckGLTreeAnimationController } from '@/core/treeVisualisation/DeckGLTreeAnimationController.js';

/**
 * Handles the instantiation, registration, and destruction
 * of the DeckGLTreeAnimationController.
 */
export function useTreeControllerLifecycle() {
  const controllerRef = useRef(null);

  useEffect(() => {
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

    ensureController();

    const unsubscribe = useAppStore.subscribe((state, prevState) => {
      // Re-initialize or reset properties if critical project state changes
      if (state.movieData !== prevState.movieData || state.comparisonMode !== prevState.comparisonMode) {
        const ctrl = controllerRef.current || state.treeControllers?.[0];
        if (state.comparisonMode !== prevState.comparisonMode) {
          ctrl?.layerManager?.comparisonRenderer?.resetAutoFit?.();
        }
        ensureController();
      }

      // Sync reference if store controllers are modified externally
      if (state.treeControllers !== prevState.treeControllers) {
        controllerRef.current = Array.isArray(state.treeControllers) ? state.treeControllers[0] : null;
      }
    });

    return () => {
      unsubscribe();
      const controller = controllerRef.current;
      if (controller) {
        try {
          controller.destroy();
        } catch (err) {
          console.warn('[useTreeControllerLifecycle] Failed to destroy controller:', err);
        }
        controllerRef.current = null;
      }

      const state = useAppStore.getState();
      if (state.treeControllers?.length) {
        state.setTreeControllers([]);
      }
    };
  }, []);

  return controllerRef;
}
