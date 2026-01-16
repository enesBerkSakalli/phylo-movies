import { useEffect, useRef } from 'react';
import { useAppStore } from '../js/core/store.js';
import { DeckGLTreeAnimationController } from '../js/treeVisualisation/DeckGLTreeAnimationController.js';
import { calculateWindow } from "../js/domain/msa/msaWindowCalculator.js";
import { getMSAFrameIndex } from "../js/domain/indexing/IndexMapping.js";

// ==========================================================================
// STORE SELECTORS
// ==========================================================================

// Core state
const selectMovieData = (s) => s.movieData;
const selectCurrentTreeIndex = (s) => s.currentTreeIndex;
const selectComparisonMode = (s) => s.comparisonMode;
const selectTransitionResolver = (s) => s.transitionResolver;
const selectTreeControllers = (s) => s.treeControllers;
const selectPlaying = (s) => s.playing;
const selectAnimationProgress = (s) => s.animationProgress;
const selectClipboardTreeIndex = (s) => s.clipboardTreeIndex;

// Actions
const selectSetTreeControllers = (s) => s.setTreeControllers;
const selectSetRenderInProgress = (s) => s.setRenderInProgress;

// MSA sync state
const selectSyncMSAEnabled = (s) => s.syncMSAEnabled;
const selectMsaWindowSize = (s) => s.msaWindowSize;
const selectMsaStepSize = (s) => s.msaStepSize;
const selectMsaColumnCount = (s) => s.msaColumnCount;
const selectSetMsaRegion = (s) => s.setMsaRegion;

// ==========================================================================
// HOOK
// ==========================================================================

export function useTreeController() {
  // ---------------------------------------------------------------------------
  // Store subscriptions
  // ---------------------------------------------------------------------------
  const movieData = useAppStore(selectMovieData);
  const currentTreeIndex = useAppStore(selectCurrentTreeIndex);
  const comparisonMode = useAppStore(selectComparisonMode);
  const transitionResolver = useAppStore(selectTransitionResolver);
  const treeControllers = useAppStore(selectTreeControllers);
  const playing = useAppStore(selectPlaying);
  const animationProgress = useAppStore(selectAnimationProgress);
  const clipboardTreeIndex = useAppStore(selectClipboardTreeIndex);

  const setTreeControllers = useAppStore(selectSetTreeControllers);
  const setRenderInProgress = useAppStore(selectSetRenderInProgress);

  // MSA sync
  const syncMSAEnabled = useAppStore(selectSyncMSAEnabled);

  const msaWindowSize = useAppStore(selectMsaWindowSize);
  const msaStepSize = useAppStore(selectMsaStepSize);
  const msaColumnCount = useAppStore(selectMsaColumnCount);
  const setMsaRegion = useAppStore(selectSetMsaRegion);

  // ---------------------------------------------------------------------------
  // Refs for tracking state changes
  // ---------------------------------------------------------------------------
  const prevMsaFrameRef = useRef(-1);

  // ---------------------------------------------------------------------------
  // Controller initialization
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!movieData) return;
    if (treeControllers.length > 0) return;

    const controller = new DeckGLTreeAnimationController('#webgl-container', {
      animations: true,
      comparisonMode,
      useReactDeckGL: true
    });
    setTreeControllers([controller]);
  }, [movieData, treeControllers.length, comparisonMode, setTreeControllers]);

  // ---------------------------------------------------------------------------
  // Sync Color Manager (Active Edge Highlight)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Whenever tree index changes (e.g. manual scrubbing), ensure highlight is correct
    // Note: During animation, DeckGLTreeAnimationController handles this per-frame.
    const { playing, updateColorManagerForCurrentIndex } = useAppStore.getState();
    if (!playing && updateColorManagerForCurrentIndex) {
        updateColorManagerForCurrentIndex();
    }
  }, [currentTreeIndex]);

  // ---------------------------------------------------------------------------
  // Tree rendering
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const controller = treeControllers[0];
    if (!controller || !movieData) return;

    const render = async () => {
      // Wait for DeckGL to finish initializing
      if (!controller.ready) {
        try {
          await controller.readyPromise;
        } catch {
          return;
        }
      }

      // Skip static rendering during animation playback
      if (playing) return;

      setRenderInProgress(true);
      try {
        if (comparisonMode) {
          await renderComparisonMode(controller, transitionResolver, currentTreeIndex);
        } else {
          // Render based on current animation progress (handles static interpolation)
          await controller.renderProgress(animationProgress);
        }
      } catch (error) {
        console.error('Error during tree rendering:', error);
      } finally {
        setRenderInProgress(false);
      }
    };

    render();
  }, [currentTreeIndex, comparisonMode, treeControllers, movieData, transitionResolver, setRenderInProgress, playing, clipboardTreeIndex, animationProgress]);


  // ---------------------------------------------------------------------------
  // MSA synchronization - only update when reaching a new anchor tree
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!syncMSAEnabled || !transitionResolver || !msaColumnCount) return;

    const frameIndex = getMSAFrameIndex();
    if (frameIndex < 0) return;

    // Only update region when the MSA frame (anchor tree) actually changes
    if (frameIndex === prevMsaFrameRef.current) return;
    prevMsaFrameRef.current = frameIndex;

    const windowData = calculateWindow(frameIndex, msaStepSize, msaWindowSize, msaColumnCount);
    setMsaRegion(windowData.startPosition, windowData.endPosition);
  }, [currentTreeIndex, syncMSAEnabled, transitionResolver, msaColumnCount, msaStepSize, msaWindowSize, setMsaRegion]);
}

// ==========================================================================
// HELPERS
// ==========================================================================

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
