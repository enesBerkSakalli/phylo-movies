/**
 * Custom hooks for AlignmentViewer2Component
 */

import { useState, useEffect, useCallback } from 'react';
import { Alignment } from 'alignment-viewer-2';
import { reduxStore } from "alignment-viewer-2/dist/js/redux/ReduxStore";
import { setWorldOffset } from "alignment-viewer-2/dist/js/redux/VirtualizationReducers";
import { 
  AlignmentViewerState, 
  ViewportIndices, 
  WindowSyncData, 
  MSASyncEvent 
} from './types';
import { createAlignmentFromMSA, throttle, calculateWorldOffset, clampPosition } from './utils';

/**
 * Hook for managing alignment parsing and state
 */
export function useAlignment(msaString: string) {
  const [alignment, setAlignment] = useState<Alignment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!msaString) {
      setError("No MSA string provided");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const parsed = createAlignmentFromMSA(msaString);
      setAlignment(parsed);
      setError(null);
      setLoading(false);
    } catch (err: any) {
      setError(`Failed to parse MSA data: ${err.message || err}`);
      setAlignment(null);
      setLoading(false);
    }
  }, [msaString]);

  return { alignment, error, loading };
}

/**
 * Hook for managing AlignmentViewer state
 */
export function useAlignmentViewerState() {
  const [state, setState] = useState<AlignmentViewerState>({
    showSettings: false,
    currentPosition: 1,
    highlightedTaxa: [],
    mainViewportVisibleIdxs: undefined
  });

  const updateState = useCallback((updates: Partial<AlignmentViewerState>) => {
    setState(prevState => ({
      ...prevState,
      ...updates
    }));
  }, []);

  const hideSettings = useCallback(() => {
    updateState({ showSettings: false });
  }, [updateState]);

  const showSettings = useCallback(() => {
    updateState({ showSettings: true });
  }, [updateState]);

  return {
    state,
    updateState,
    hideSettings,
    showSettings
  };
}

/**
 * Hook for viewport synchronization
 */
export function useViewportSync(activeAlignment: Alignment | null, alignmentUUID: string | null, zoomLevel?: number) {
  const dispatch = reduxStore.dispatch;

  const syncViewportWithWindow = useCallback((windowData: WindowSyncData) => {
    if (!activeAlignment || !alignmentUUID || !windowData) return;

    const sequenceLength = activeAlignment.getSequenceLength();
    
    // Convert 1-based window positions to 0-based indices for the viewer
    const posStart = clampPosition(windowData.windowStart - 1, 0, sequenceLength - 1);
    const posEnd = clampPosition(windowData.windowEnd - 1, 0, sequenceLength - 1);

    // Get actual cell size from Redux store for accurate positioning
    const virtualizationId = `x_viewport_virtualization_${alignmentUUID}`;
    const state = reduxStore.getState();
    const virtualizationState = (state as any)?.virtualizations?.[virtualizationId];
    const actualCellSizePx = virtualizationState?.cellSizePx;

    // Calculate world offset using actual cell size
    const worldOffsetPx = calculateWorldOffset(posStart, actualCellSizePx);

    console.log(`[ViewportSync] Position ${posStart}, CellSize: ${actualCellSizePx || 'fallback'}px, ZoomLevel: ${zoomLevel || 'unknown'}, Offset: ${worldOffsetPx}px`);

    // Create viewport indices
    const viewportIdxs: ViewportIndices = {
      seqIdxStart: 0,
      seqIdxEnd: activeAlignment.getSequenceCount() - 1,
      posIdxStart: posStart,
      posIdxEnd: posEnd
    };

    // Dispatch Redux action to set viewport position
    dispatch(setWorldOffset({
      virtualizationId: virtualizationId,
      worldOffsetPx: worldOffsetPx
    }));

    return viewportIdxs;
  }, [activeAlignment, alignmentUUID, dispatch, zoomLevel]);

  const handleViewportChanged = useCallback((newIdxs: ViewportIndices) => {
    return newIdxs;
  }, []);

  return {
    syncViewportWithWindow,
    handleViewportChanged
  };
}

/**
 * Hook for MSA synchronization events
 */
export function useMSASync(
  alignment: Alignment | null | undefined,
  currentPosition: number,
  syncViewportWithWindow: (windowData: WindowSyncData) => ViewportIndices | undefined,
  onStateUpdate: (updates: Partial<AlignmentViewerState>) => void
) {
  const throttledSyncHandler = useCallback(
    throttle((event: MSASyncEvent) => {
      if (!alignment) return;

      const { position, windowInfo, highlightedTaxa: eventHighlightedTaxa } = event.detail;

      // Update position
      if (position && position !== currentPosition) {
        onStateUpdate({ currentPosition: position });
      }

      // Update highlighted taxa
      if (eventHighlightedTaxa && Array.isArray(eventHighlightedTaxa)) {
        onStateUpdate({ highlightedTaxa: eventHighlightedTaxa });
      }

      // Update viewport
      if (windowInfo) {
        const viewportIdxs = syncViewportWithWindow(windowInfo);
        if (viewportIdxs) {
          onStateUpdate({ mainViewportVisibleIdxs: viewportIdxs });
        }
      }
    }, 250),
    [alignment, currentPosition, syncViewportWithWindow, onStateUpdate]
  );

  useEffect(() => {
    window.addEventListener('msa-sync-request', throttledSyncHandler as EventListener);
    return () => {
      window.removeEventListener('msa-sync-request', throttledSyncHandler as EventListener);
    };
  }, [throttledSyncHandler]);

  return { throttledSyncHandler };
}