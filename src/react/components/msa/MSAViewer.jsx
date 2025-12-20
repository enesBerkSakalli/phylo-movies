import React, { useEffect, useRef } from 'react';
import { MSADeckGLViewer } from '../../../js/msaViewer/MSADeckGLViewer.js';
import { useMSA } from './MSAContext';

export function MSAViewer() {
  const { processedData, msaRegion, showLetters, movieData, viewAction, colorScheme, setVisibleRange } = useMSA();
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

  // Keep viewer in sync with external region updates
  useEffect(() => {
    if (msaRegion) {
      if (viewerRef.current) {
        viewerRef.current.setRegion(msaRegion.start, msaRegion.end);
      }
    } else {
      viewerRef.current?.clearRegion();
    }
  }, [msaRegion]);

  // Initialize DeckGL viewer
  useEffect(() => {
    if (!containerRef.current) return undefined;

    const viewer = new MSADeckGLViewer(containerRef.current, { showLetters, colorScheme });
    viewerRef.current = viewer;

    // Handle view state changes
    let lastUpdate = 0;
    viewer.onViewStateChange = ({ range }) => {
      const now = Date.now();
      if (range && now - lastUpdate > 100) {
        setVisibleRange({
          start: range.c0 + 1,
          end: range.c1 + 1
        });
        lastUpdate = now;
      }
    };

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
  }, [processedData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload data when movieData changes while open
  useEffect(() => {
    const viewer = viewerRef.current;
    if (viewer && processedData) {
      viewer.loadFromPhyloData(movieData);
      // Re-apply region if exists, but don't trigger this effect on msaRegion change
      if (msaRegion) {
        viewer.setRegion(msaRegion.start, msaRegion.end);
      } else {
        viewer.clearRegion();
      }
    }
  }, [processedData, movieData]); // Removed msaRegion from dependencies

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

  return <div className="msa-rnd-body flex-1 min-h-0 relative bg-white" ref={containerRef} />;
}
