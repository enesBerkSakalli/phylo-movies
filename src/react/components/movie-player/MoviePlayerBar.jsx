import React, { useCallback, useState, useEffect, useRef } from 'react';

import { MovieChartSection } from './MovieChartSection/MovieChartSection.jsx';
import { TransportControls } from './TransportControls.jsx';
import { RecordingControls } from '../media/RecordingControls.jsx';
import { SaveImageButton } from '../media/SaveImageButton.jsx';
import { TimelineScrollControls } from './TimelineScrollControls/TimelineScrollControls.jsx';
import { PlaybackSpeedControl } from './PlaybackSpeedControl/PlaybackSpeedControl.jsx';
import { TimelineSegmentTooltip } from '../timeline/TimelineSegmentTooltip.jsx';
import { useAppStore } from '../../../js/core/store.js';
import { useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Menu, ChevronUp, ChevronDown } from 'lucide-react';

import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function MoviePlayerBar() {
  // ... existing hooks ...
  const forward = useAppStore((s) => s.forward);
  const backward = useAppStore((s) => s.backward);
  const setAnimationSpeed = useAppStore((s) => s.setAnimationSpeed);
  const animationSpeed = useAppStore((s) => s.animationSpeed);
  const barOptionValue = useAppStore((s) => s.barOptionValue);
  const setBarOption = useAppStore((s) => s.setBarOption);
  const [toolbarExpanded, setToolbarExpanded] = useState(true);

  // ... rest of state and effects ...
  // Timeline tooltip state
  const hoveredSegmentIndex = useAppStore((s) => s.hoveredSegmentIndex);
  const hoveredSegmentData = useAppStore((s) => s.hoveredSegmentData);
  const hoveredSegmentPosition = useAppStore((s) => s.hoveredSegmentPosition);
  const setTooltipHovered = useAppStore((s) => s.setTooltipHovered);
  const setHoveredSegment = useAppStore((s) => s.setHoveredSegment);
  const movieData = useAppStore((s) => s.movieData);
  const movieTimelineManager = useAppStore((s) => s.movieTimelineManager);
  const tooltipRef = useRef(null);

  // Get segments from timeline manager
  const segments = movieTimelineManager?.segments || [];

  // Reinitialize timeline when component mounts and container is available
  useEffect(() => {
    if (movieTimelineManager) {
      // Check if timeline exists and is attached to the DOM
      const isTimelineAttached = movieTimelineManager.timeline &&
                                 movieTimelineManager.timeline.container &&
                                 document.body.contains(movieTimelineManager.timeline.container);

      if (!isTimelineAttached) {
        movieTimelineManager._createTimeline();
        if (movieTimelineManager.timeline) {
          movieTimelineManager._setupEvents();
        }
      }
    }
  }, [movieTimelineManager]);

  // Get leaf names function for tooltip
  const getLeafNames = useCallback((indices) => {
    const sortedLeaves = movieData?.sorted_leaves;
    if (!sortedLeaves || !Array.isArray(sortedLeaves)) return [];

    const leafNames = [];
    for (const idx of indices) {
      if (Number.isInteger(idx) && idx >= 0 && idx < sortedLeaves.length) {
        leafNames.push(sortedLeaves[idx]);
      }
    }
    return leafNames;
  }, [movieData?.sorted_leaves]);

  const { open, toggleSidebar } = useSidebar();
  const handleNavigationToggle = useCallback(() => {
    try {
      toggleSidebar();
    } catch {}
  }, [toggleSidebar]);

  return (
    <>
      <div className="sticky bottom-0 z-[1000] bg-card border-t shadow-[0_2px_4px_rgba(0,0,0,0.08)] p-1" role="region" aria-label="Movie Player Controls">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between" role="group" aria-label="Transport controls and chart controls">
            <div className="flex items-center gap-1 flex-wrap transition-all duration-300" role="group" aria-label="Transport controls and position">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    id="nav-toggle-button"
                    variant="ghost"
                    size="icon"
                    aria-label="Toggle sidebar"
                    aria-controls="app-sidebar"
                    aria-expanded={open ? 'true' : 'false'}
                    onClick={handleNavigationToggle}
                  >
                    <Menu className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle sidebar</TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-5 mx-1" />

              {toolbarExpanded && (
                <>
                  <TimelineScrollControls />

                  <Separator orientation="vertical" className="h-5 mx-1" />

                  <PlaybackSpeedControl
                    value={animationSpeed}
                    setValue={setAnimationSpeed}
                  />

                  <Separator orientation="vertical" className="h-5 mx-1" />
                </>
              )}

              <TransportControls
                onBackward={backward}
                onForward={forward}
              />

              {toolbarExpanded && (
                <>
                  <Separator orientation="vertical" className="h-5 mx-1" />

                  <RecordingControls />

                  <Separator orientation="vertical" className="h-5 mx-1" />

                  <SaveImageButton />
                </>
              )}

              <Separator orientation="vertical" className="h-5 mx-1" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={toolbarExpanded ? "Collapse toolbar" : "Expand toolbar"}
                    aria-expanded={toolbarExpanded}
                    onClick={() => setToolbarExpanded(!toolbarExpanded)}
                    className="hover:bg-accent"
                  >
                    {toolbarExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{toolbarExpanded ? "Collapse toolbar" : "Expand toolbar"}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="w-full">
            <div className="interpolation-timeline-container min-h-[12px]">
              {/* Timeline container will be created dynamically by MovieTimelineManager */}
            </div>
          </div>

          <MovieChartSection barOptionValue={barOptionValue} onBarOptionChange={setBarOption} />
        </div>
      </div>



      {/* Timeline segment tooltip - positioned above segment center */}
      {hoveredSegmentIndex !== null && hoveredSegmentData && hoveredSegmentPosition && (
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            left: `${hoveredSegmentPosition.x}px`,
            top: `${hoveredSegmentPosition.y - 12}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 10000,
            pointerEvents: 'auto',
            minWidth: '200px',
            maxWidth: '300px'
          }}
          className="animate-in fade-in-0 zoom-in-95 duration-200"
          onMouseEnter={() => setTooltipHovered(true)}
          onMouseLeave={() => {
            setTooltipHovered(false);
            setHoveredSegment(null, null);
          }}
        >
          <div className="rounded-lg border bg-card p-2 shadow-lg">
            <TimelineSegmentTooltip
              segment={hoveredSegmentData}
              segmentIndex={hoveredSegmentIndex}
              totalSegments={segments.length}
              getLeafNames={getLeafNames}
            />
          </div>
        </div>
      )}
    </>
  );
}
