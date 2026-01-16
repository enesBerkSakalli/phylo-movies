import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
      <div className="timeline-zoom-controls flex items-center" role="group" aria-label="Timeline zoom controls">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              id="zoomOutBtn"
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
            >
              <ZoomOut className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom out timeline (Ctrl + -)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              id="fitToWindowBtn"
              variant="ghost"
              size="icon"
              onClick={handleFitTimeline}
            >
              <Scan className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fit entire timeline to window (Ctrl + 0)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              id="zoomInBtn"
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
            >
              <ZoomIn className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom in timeline (Ctrl + +)</TooltipContent>
        </Tooltip>
      </div>

      <div className="timeline-scroll-controls flex items-center" role="group" aria-label="Timeline scroll controls">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              id="scrollToStartBtn"
              variant="ghost"
              size="icon"
              onClick={handleScrollToStart}
            >
              <ChevronsLeft className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Scroll to start (Home)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              id="scrollToEndBtn"
              variant="ghost"
              size="icon"
              onClick={handleScrollToEnd}
            >
              <ChevronsRight className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Scroll to end (End)</TooltipContent>
        </Tooltip>
      </div>
    </>
  );
}
