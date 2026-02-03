import React, { useEffect, useRef } from 'react';
import { useAppStore } from '@/js/core/store';
import { MSADeckGLViewer } from '@/js/msaViewer/MSADeckGLViewer';
import { useMSA } from './MSAContext';
import { MSAScrollbars } from './MSAScrollbars';

// ==========================================================================
// STORE SELECTORS
// ==========================================================================
const selectSyncMSAEnabled = (s) => s.syncMSAEnabled;

export function MSAViewer() {
  const { processedData, msaRegion, msaPreviousRegion, showLetters, movieData, viewAction, colorScheme, setVisibleRange, rowColorMap, visibleRange, scrollAction } = useMSA();
  const syncMSAEnabled = useAppStore(selectSyncMSAEnabled);
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  // Handle view actions (zoom/reset)
  useEffect(() => {
    if (!viewAction || !viewerRef.current) return;

    switch (viewAction.action) {
      case 'ZOOM_IN':
        viewerRef.current.zoomIn();
        break;
      case 'ZOOM_OUT':
        viewerRef.current.zoomOut();
        break;
      case 'RESET':
        viewerRef.current.resetView();
        break;
      default:
        break;
    }
  }, [viewAction]);

  // Handle scroll actions from scrollbar overlays
  useEffect(() => {
    if (!scrollAction || !viewerRef.current) return;

    const { row, col } = scrollAction;
    viewerRef.current.scrollTo({ row, col });
  }, [scrollAction]);

  // Keep viewer in sync with external region updates
  useEffect(() => {
    if (msaRegion) {
      if (viewerRef.current) {
        viewerRef.current.setRegion(msaRegion.start, msaRegion.end);

        if (syncMSAEnabled) {
          // Adjust for 1-based to 0-based conversion (approximate center)
          const centerCol = (msaRegion.start + msaRegion.end) / 2 - 0.5;
          viewerRef.current.scrollTo({ col: Math.max(0, centerCol) });
        }
      }
    } else {
      viewerRef.current?.clearRegion();
    }
  }, [msaRegion, syncMSAEnabled]);

  // Keep viewer in sync with previous region updates
  useEffect(() => {
    if (msaPreviousRegion) {
      if (viewerRef.current) {
        viewerRef.current.setPreviousRegion(msaPreviousRegion.start, msaPreviousRegion.end);
      }
    } else {
      viewerRef.current?.clearPreviousRegion();
    }
  }, [msaPreviousRegion]);

  // Initialize DeckGL viewer once
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return undefined;

    const viewer = new MSADeckGLViewer(containerRef.current, { showLetters, colorScheme, rowColorMap });
    viewerRef.current = viewer;

    // Handle view state changes
    let lastUpdate = 0;
    viewer.onViewStateChange = ({ range }) => {
      const now = Date.now();
      if (range && now - lastUpdate > 33) {
        setVisibleRange(range);
        lastUpdate = now;
      }
    };

    // If data already present when viewer mounts, load immediately
    if (processedData) {
      viewer.loadFromPhyloData(movieData);
      if (msaRegion) {
        viewer.setRegion(msaRegion.start, msaRegion.end);
      }
    }

    return () => {
      viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  // Load/refresh data into existing viewer
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !processedData) return;
    // Use preprocessed data to avoid re-parsing and keep order intact
    viewer.loadFromProcessedData(processedData);
    if (msaRegion) {
      viewer.setRegion(msaRegion.start, msaRegion.end);
    } else {
      viewer.clearRegion();
    }
    viewer.render?.();
  }, [processedData, msaRegion]);

  // Toggle letters without recreating viewer
  useEffect(() => {
    const viewer = viewerRef.current;
    if (viewer) {
      viewer.setShowLetters(showLetters);
      viewer.render?.();
    }
  }, [showLetters]);

  // Update color scheme
  useEffect(() => {
    const viewer = viewerRef.current;
    if (viewer) {
      viewer.setColorScheme(colorScheme);
    }
  }, [colorScheme]);

  // Update row label colors (group/taxon colors)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (viewer) {
      viewer.setRowColorMap(rowColorMap);
    }
  }, [rowColorMap]);

  return (
    <div className="msa-rnd-body flex-1 min-h-0 relative bg-white" ref={containerRef}>
      {visibleRange && Number.isFinite(visibleRange.r0) && Number.isFinite(visibleRange.c0) && (
        <div className="absolute right-6 top-3 z-10 rounded-md bg-black/60 text-white text-[11px] px-3 py-1.5 shadow-md backdrop-blur-sm">
          <div className="flex gap-2">
            <span>Rows {visibleRange.r0 + 1}–{visibleRange.r1 + 1}</span>
            <span className="opacity-70">|</span>
            <span>Cols {visibleRange.c0 + 1}–{visibleRange.c1 + 1}</span>
          </div>
        </div>
      )}
      <MSAScrollbars containerRef={containerRef} />
    </div>
  );
}
