import { useEffect, useRef } from 'react';
import { useAppStore } from '../js/core/store.js';
import { DeckGLTreeAnimationController } from '../js/treeVisualisation/DeckGLTreeAnimationController.js';
import { calculateWindow } from "../js/domain/msa/msaWindowCalculator.js";
import { getMSAFrameIndex } from "../js/domain/indexing/IndexMapping.js";

/**
 * Hook to manage the Tree Controller and rendering lifecycle.
 * Replaces the legacy Gui.js controller.
 */
export function useTreeController() {
  const movieData = useAppStore((s) => s.movieData);
  const currentTreeIndex = useAppStore((s) => s.currentTreeIndex);
  const comparisonMode = useAppStore((s) => s.comparisonMode);
  const treeList = useAppStore((s) => s.treeList);
  const transitionResolver = useAppStore((s) => s.transitionResolver);
  const setTreeControllers = useAppStore((s) => s.setTreeControllers);
  const setRenderInProgress = useAppStore((s) => s.setRenderInProgress);
  const treeControllers = useAppStore((s) => s.treeControllers);
  const playing = useAppStore((s) => s.playing);

  // MSA Sync dependencies
  const syncMSAEnabled = useAppStore((s) => s.syncMSAEnabled);
  const msaWindowSize = useAppStore((s) => s.msaWindowSize);
  const msaStepSize = useAppStore((s) => s.msaStepSize);
  const msaColumnCount = useAppStore((s) => s.msaColumnCount);
  const setMsaRegion = useAppStore((s) => s.setMsaRegion);
  const movieTimelineManager = useAppStore((s) => s.movieTimelineManager);

  // Refs to track previous state for diffing
  const prevTreeIndexRef = useRef(currentTreeIndex);
  const lastSyncTimeRef = useRef(0);

  // Initialize Controller
  useEffect(() => {
    if (!movieData) return;

    // Create controller if it doesn't exist
    if (treeControllers.length === 0) {
      const controller = new DeckGLTreeAnimationController('#webgl-container', {
        animations: true,
        comparisonMode
      });
      setTreeControllers([controller]);
    }

    return () => {
      // Cleanup handled by store or App unmount
    };
  }, [movieData, treeControllers.length, comparisonMode, setTreeControllers]);

  // Handle Rendering
  useEffect(() => {
    const controller = treeControllers[0];
    if (!controller || !movieData) return;

    const render = async () => {
      // Wait for DeckGL to finish initializing before rendering
      if (!controller.ready) {
        try {
          await controller.readyPromise;
        } catch {
          return;
        }
      }

      // Skip static rendering if animation is playing to avoid conflict with animation loop
      if (playing) return;

      setRenderInProgress(true);
      try {
        if (comparisonMode) {
          const full = transitionResolver?.fullTreeIndices || [];
          const sourceAnchorIndex = transitionResolver?.getSourceTreeIndex(currentTreeIndex) ?? 0;
          const rightIndex = full.find((i) => i > sourceAnchorIndex) ?? full[full.length - 1];

          await controller.renderAllElements({
            leftIndex: currentTreeIndex,
            rightIndex,
            comparisonMode: true
          });
        } else {
          await controller.renderAllElements({ treeIndex: currentTreeIndex });
        }
      } catch (error) {
        console.error('Error during tree rendering:', error);
      } finally {
        setRenderInProgress(false);

        // Update auxiliary components
        if (movieTimelineManager) {
          movieTimelineManager.updateCurrentPosition();
        }
      }
    };

    render();

  }, [currentTreeIndex, comparisonMode, treeControllers, movieData, transitionResolver, setRenderInProgress, movieTimelineManager, playing]);

  // Handle MSA Sync
  useEffect(() => {
    if (!syncMSAEnabled || !transitionResolver || !msaColumnCount) return;

    // Only sync if tree index changed
    if (currentTreeIndex === prevTreeIndexRef.current) return;
    prevTreeIndexRef.current = currentTreeIndex;

    // Throttle sync
    const now = Date.now();
    if (now - lastSyncTimeRef.current < 100) return;
    lastSyncTimeRef.current = now;

    const frameIndex = getMSAFrameIndex();
    if (frameIndex < 0) return;

    const windowData = calculateWindow(frameIndex, msaStepSize, msaWindowSize, msaColumnCount);
    setMsaRegion(windowData.startPosition, windowData.endPosition);

  }, [currentTreeIndex, syncMSAEnabled, transitionResolver, msaColumnCount, msaStepSize, msaWindowSize, setMsaRegion]);
}
