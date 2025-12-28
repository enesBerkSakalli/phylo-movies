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

/**
 * Hook to manage the Tree Controller and rendering lifecycle.
 *
 * Responsibilities:
 * 1. Controller initialization - creates DeckGLTreeAnimationController
 * 2. Tree rendering - renders trees when currentTreeIndex changes
 * 3. MSA sync - synchronizes MSA viewer region with current tree
 */
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
  // Refs for diffing/throttling
  // ---------------------------------------------------------------------------
  const prevTreeIndexRef = useRef(currentTreeIndex);
  const lastSyncTimeRef = useRef(0);

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
          await controller.renderAllElements({ treeIndex: currentTreeIndex });
        }
      } catch (error) {
        console.error('Error during tree rendering:', error);
      } finally {
        setRenderInProgress(false);
      }
    };

    render();
  }, [currentTreeIndex, comparisonMode, treeControllers, movieData, transitionResolver, setRenderInProgress, playing, clipboardTreeIndex]);

  // ---------------------------------------------------------------------------
  // MSA synchronization
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!syncMSAEnabled || !transitionResolver || !msaColumnCount) return;
    if (currentTreeIndex === prevTreeIndexRef.current) return;

    prevTreeIndexRef.current = currentTreeIndex;

    // Throttle sync to 100ms
    const now = Date.now();
    if (now - lastSyncTimeRef.current < 100) return;
    lastSyncTimeRef.current = now;

    const frameIndex = getMSAFrameIndex();
    if (frameIndex < 0) return;

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
