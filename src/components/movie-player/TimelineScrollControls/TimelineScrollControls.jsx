import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { AppTooltip } from '@/components/ui/app-tooltip';
import { ChevronsLeft, ChevronsRight, ZoomOut, ZoomIn, Scan } from 'lucide-react';
import { useAppStore } from '@/state/phyloStore/store.js';

// ==========================================================================
// STORE SELECTORS
// ==========================================================================
const selectScrollToStartTimeline = (s) => s.scrollToStartTimeline;
const selectScrollToEndTimeline = (s) => s.scrollToEndTimeline;
const selectZoomOutTimeline = (s) => s.zoomOutTimeline;
const selectZoomInTimeline = (s) => s.zoomInTimeline;
const selectFitTimeline = (s) => s.fitTimeline;

export function TimelineScrollControls() {
  const scrollToStartTimeline = useAppStore(selectScrollToStartTimeline);
  const scrollToEndTimeline = useAppStore(selectScrollToEndTimeline);
  const zoomOutTimeline = useAppStore(selectZoomOutTimeline);
  const zoomInTimeline = useAppStore(selectZoomInTimeline);
  const fitTimeline = useAppStore(selectFitTimeline);

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
      <div className="timeline-zoom-controls flex items-center gap-1" role="group" aria-label="Timeline zoom controls">
        <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground px-1">Timeline zoom</span>
        <AppTooltip content="Zoom out timeline (Ctrl + -)">
          <Button
            id="zoomOutBtn"
            variant="ghost"
            size="icon"
            aria-label="Zoom out timeline"
            onClick={handleZoomOut}
          >
            <ZoomOut className="size-4" />
          </Button>
        </AppTooltip>

        <AppTooltip content="Fit entire timeline to window (Ctrl + 0)">
          <Button
            id="fitToWindowBtn"
            variant="ghost"
            size="icon"
            aria-label="Fit entire timeline to window"
            onClick={handleFitTimeline}
          >
            <Scan className="size-4" />
          </Button>
        </AppTooltip>

        <AppTooltip content="Zoom in timeline (Ctrl + +)">
          <Button
            id="zoomInBtn"
            variant="ghost"
            size="icon"
            aria-label="Zoom in timeline"
            onClick={handleZoomIn}
          >
            <ZoomIn className="size-4" />
          </Button>
        </AppTooltip>
      </div>

      <div className="timeline-scroll-controls flex items-center gap-1" role="group" aria-label="Timeline scroll controls">
        <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground px-1">Timeline pan</span>
        <AppTooltip content="Scroll to start (Home)">
          <Button
            id="scrollToStartBtn"
            variant="ghost"
            size="icon"
            aria-label="Scroll timeline to start"
            onClick={handleScrollToStart}
          >
            <ChevronsLeft className="size-4" />
          </Button>
        </AppTooltip>

        <AppTooltip content="Scroll to end (End)">
          <Button
            id="scrollToEndBtn"
            variant="ghost"
            size="icon"
            aria-label="Scroll timeline to end"
            onClick={handleScrollToEnd}
          >
            <ChevronsRight className="size-4" />
          </Button>
        </AppTooltip>
      </div>
    </>
  );
}
