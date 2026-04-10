import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/store.js';
import { calculateWindow } from '@/utils/msa/msaWindowCalculator.js';
import { getMSAFrameIndex } from '@/utils/indexing/IndexMapping.js';

/**
 * Headless synchronization daemon. Hooks into the global state and
 * runs MSA window calculations or Color Manager resets based on timeline progress.
 * Does NOT interact with WebGL directly.
 */
export function useTreeMSASync() {
  const prevMsaFrameRef = useRef(-1);

  useEffect(() => {
    const syncColorManager = (state) => {
      if (!state.playing && state.updateColorManagerForCurrentIndex) {
        state.updateColorManagerForCurrentIndex();
      }
    };

    const syncMsaRegion = (state) => {
      // Opt out if completely unconfigured or not active
      if (!state.syncMSAEnabled || !state.transitionResolver || !state.msaColumnCount) return;

      const frameIndex = getMSAFrameIndex();
      if (frameIndex < 0 || frameIndex === prevMsaFrameRef.current) return;

      prevMsaFrameRef.current = frameIndex;

      // Retain older bounds for effect layers
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

    const unsubscribe = useAppStore.subscribe((state, prevState) => {
      const isTimelineScrubbing = state.movieTimelineManager?.scrubController?.isScrubbing ?? false;

      // Color syncing relies entirely on currentTreeIndex
      if (state.currentTreeIndex !== prevState.currentTreeIndex && !isTimelineScrubbing) {
        syncColorManager(state);
      }

      // MSA bounds update if temporal progression changes or config parameters shift
      if (
        (state.currentTreeIndex !== prevState.currentTreeIndex && !isTimelineScrubbing) ||
        (state.animationProgress !== prevState.animationProgress && !isTimelineScrubbing) ||
        state.transitionResolver !== prevState.transitionResolver ||
        state.syncMSAEnabled !== prevState.syncMSAEnabled ||
        state.msaWindowSize !== prevState.msaWindowSize ||
        state.msaStepSize !== prevState.msaStepSize ||
        state.msaColumnCount !== prevState.msaColumnCount
      ) {
        syncMsaRegion(state);
      }
    });

    return () => unsubscribe();
  }, []);
}
