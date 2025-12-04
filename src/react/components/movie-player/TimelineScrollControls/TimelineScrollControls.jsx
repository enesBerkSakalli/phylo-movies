import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronsLeft, ChevronsRight, ZoomOut, ZoomIn, Scan } from 'lucide-react';
import { useAppStore } from '../../../../js/core/store.js';

export function TimelineScrollControls() {
  const scrollToStartTimeline = useAppStore((s) => s.scrollToStartTimeline);
  const scrollToEndTimeline = useAppStore((s) => s.scrollToEndTimeline);
  const zoomOutTimeline = useAppStore((s) => s.zoomOutTimeline);
  const zoomInTimeline = useAppStore((s) => s.zoomInTimeline);
  const fitTimeline = useAppStore((s) => s.fitTimeline);

  const handleScrollToStart = useCallback(() => {
    scrollToStartTimeline();
  }, [scrollToStartTimeline]);

  const handleScrollToEnd = useCallback(() => {
    scrollToEndTimeline();
  }, [scrollToEndTimeline]);

  const handleZoomOut = useCallback(() => {
    zoomOutTimeline();
  }, [zoomOutTimeline]);

  const handleZoomIn = useCallback(() => {
    zoomInTimeline();
  }, [zoomInTimeline]);

  const handleFitTimeline = useCallback(() => {
    fitTimeline();
  }, [fitTimeline]);

  return (
    <>
      <div className="timeline-zoom-controls" role="group" aria-label="Timeline zoom controls">
        <Button
          id="zoomOutBtn"
          variant="ghost"
          size="icon"
          title="Zoom out timeline (Ctrl + -)"
          onClick={handleZoomOut}
        >
          <ZoomOut className="size-5" />
        </Button>
        <Button
          id="fitToWindowBtn"
          variant="ghost"
          size="icon"
          title="Fit entire timeline to window (Ctrl + 0)"
          onClick={handleFitTimeline}
        >
          <Scan className="size-5" />
        </Button>
        <Button
          id="zoomInBtn"
          variant="ghost"
          size="icon"
          title="Zoom in timeline (Ctrl + +)"
          onClick={handleZoomIn}
        >
          <ZoomIn className="size-5" />
        </Button>
      </div>

      <div className="timeline-scroll-controls" role="group" aria-label="Timeline scroll controls">
      <Button
        id="scrollToStartBtn"
        variant="ghost"
        size="icon"
        title="Scroll to start (Home)"
        onClick={handleScrollToStart}
      >
        <ChevronsLeft className="size-5" />
      </Button>
      <Button
        id="scrollToEndBtn"
        variant="ghost"
        size="icon"
        title="Scroll to end (End)"
        onClick={handleScrollToEnd}
      >
        <ChevronsRight className="size-5" />
      </Button>
    </div>
    </>
  );
}
