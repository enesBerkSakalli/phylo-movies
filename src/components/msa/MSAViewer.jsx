import React, { useEffect, useRef, useState } from 'react';
import { selectSyncMsaEnabled, useAppStore } from '@/state/phyloStore/store.js';
import { MSADeckGLViewer } from '@/msaViewer/MSADeckGLViewer';
import { useMSA } from './MSAContext';
import { MSAScrollbars } from './MSAScrollbars';

export function MSAViewer() {
  const { processedData, msaRegion, msaPreviousRegion, showLetters, viewAction, colorScheme, setVisibleRange, rowColorMap, visibleRange, scrollAction } = useMSA();
  const syncMSAEnabled = useAppStore(selectSyncMsaEnabled);
  const [layoutMetrics, setLayoutMetrics] = useState(null);
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
    let lastRangeUpdate = 0;
    viewer.onViewStateChange = ({ range, layoutMetrics }) => {
      const now = Date.now();
      if (layoutMetrics) {
        setLayoutMetrics((current) => {
          if (
            current?.labelsWidth === layoutMetrics.labelsWidth &&
            current?.axisHeight === layoutMetrics.axisHeight
          ) {
            return current;
          }
          return layoutMetrics;
        });
      }
      if (range && now - lastRangeUpdate > 33) {
        setVisibleRange(range);
        lastRangeUpdate = now;
      }
    };

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
    if (msaPreviousRegion) {
      viewer.setPreviousRegion(msaPreviousRegion.start, msaPreviousRegion.end);
    } else {
      viewer.clearPreviousRegion();
    }
  }, [processedData]);

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
    <div className="msa-rnd-body relative flex-1 min-h-0 bg-background" ref={containerRef}>
      {visibleRange && Number.isFinite(visibleRange.r0) && Number.isFinite(visibleRange.c0) && (
        <div className="absolute left-3 top-3 z-10 rounded-md border border-border/60 bg-background/85 px-3 py-2 text-[11px] text-foreground shadow-md backdrop-blur-sm tabular-nums">
          <div className="flex gap-3">
            <span>Rows: {visibleRange.r0 + 1}-{visibleRange.r1 + 1}</span>
            <span className="text-muted-foreground/60">|</span>
            <span>Cols: {visibleRange.c0 + 1}-{visibleRange.c1 + 1}</span>
          </div>
        </div>
      )}
      <MSAScrollbars layoutMetrics={layoutMetrics} />
    </div>
  );
}
