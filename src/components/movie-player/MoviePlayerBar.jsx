import React, { useCallback, useState, useEffect, useRef } from 'react';

import { MovieChartSection } from './MovieChartSection/MovieChartSection.jsx';
import { TransportControls } from './TransportControls.jsx';
import { RecordingControls } from '../media/RecordingControls.jsx';
import { SaveImageButton } from '../media/SaveImageButton.jsx';
import { TimelineScrollControls } from './TimelineScrollControls/TimelineScrollControls.jsx';
import { PlaybackSpeedControl } from './PlaybackSpeedControl/PlaybackSpeedControl.jsx';
import { TimelineSegmentTooltip } from '../timeline/TimelineSegmentTooltip.jsx';
import { useAppStore } from '@/state/phyloStore/store.js';
import { useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Menu, ChevronUp, ChevronDown } from 'lucide-react';

import { Separator } from '@/components/ui/separator';
import { AppTooltip } from '@/components/ui/app-tooltip';

// ==========================================================================
// CONSTANTS
// ==========================================================================
const TOOLTIP_Y_OFFSET = 12;

// ==========================================================================
// STORE SELECTORS
// ==========================================================================
const selectForward = (s) => s.forward;
const selectBackward = (s) => s.backward;
const selectSetAnimationSpeed = (s) => s.setAnimationSpeed;
const selectAnimationSpeed = (s) => s.animationSpeed;
const selectBarOptionValue = (s) => s.barOptionValue;
const selectSetBarOption = (s) => s.setBarOption;
const selectHoveredSegmentIndex = (s) => s.hoveredSegmentIndex;
const selectHoveredSegmentData = (s) => s.hoveredSegmentData;
const selectHoveredSegmentPosition = (s) => s.hoveredSegmentPosition;
const selectSetTooltipHovered = (s) => s.setTooltipHovered;
const selectSetHoveredSegment = (s) => s.setHoveredSegment;
const selectMovieData = (s) => s.movieData;
const selectMovieTimelineManager = (s) => s.movieTimelineManager;

export function MoviePlayerBar() {
  const forward = useAppStore(selectForward);
  const backward = useAppStore(selectBackward);
  const setAnimationSpeed = useAppStore(selectSetAnimationSpeed);
  const animationSpeed = useAppStore(selectAnimationSpeed);
  const barOptionValue = useAppStore(selectBarOptionValue);
  const setBarOption = useAppStore(selectSetBarOption);
  const [toolbarExpanded, setToolbarExpanded] = useState(true);

  const hoveredSegmentIndex = useAppStore(selectHoveredSegmentIndex);
  const hoveredSegmentData = useAppStore(selectHoveredSegmentData);
  const hoveredSegmentPosition = useAppStore(selectHoveredSegmentPosition);
  const setTooltipHovered = useAppStore(selectSetTooltipHovered);
  const setHoveredSegment = useAppStore(selectSetHoveredSegment);
  const movieData = useAppStore(selectMovieData);
  const movieTimelineManager = useAppStore(selectMovieTimelineManager);
  const tooltipRef = useRef(null);
  const timelineHostRef = useRef(null);

  const totalSegments = movieTimelineManager?.getSegmentCount?.() ?? 0;
  const hasTransitionSegments = movieTimelineManager?.hasTransitionSegments?.() ?? false;

  useEffect(() => {
    const container = timelineHostRef.current;
    if (!movieTimelineManager || !container) return;

    movieTimelineManager.mount(container);

    return () => {
      movieTimelineManager.unmount();
    };
  }, [movieTimelineManager]);

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
      <div className="sticky bottom-0 z-1000 bg-card border-t shadow-[0_2px_4px_rgba(0,0,0,0.08)]" role="region" aria-label="Tree Sequence Controls">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between" role="group" aria-label="Transport controls and chart controls">
            <div className="flex items-center gap-1 flex-wrap transition-all duration-300" role="group" aria-label="Transport controls and position">
              <AppTooltip content="Toggle sidebar">
                <Button
                  id="nav-toggle-button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Toggle sidebar"
                  aria-controls="app-sidebar"
                  aria-expanded={open ? 'true' : 'false'}
                  onClick={handleNavigationToggle}
                >
                  <Menu className="size-4" />
                </Button>
              </AppTooltip>

              <Separator orientation="vertical" className="h-4 mx-1" />

              {toolbarExpanded && (
                <>
                  <TimelineScrollControls />

                  <Separator orientation="vertical" className="h-4 mx-1" />

                  <PlaybackSpeedControl
                    value={animationSpeed}
                    setValue={setAnimationSpeed}
                  />

                  <Separator orientation="vertical" className="h-4 mx-1" />
                </>
              )}

              <TransportControls
                onBackward={backward}
                onForward={forward}
              />

              {toolbarExpanded && (
                <>
                  <Separator orientation="vertical" className="h-4 mx-1" />

                  <RecordingControls disabled={!movieData} />

                  <Separator orientation="vertical" className="h-4 mx-1" />

                  <SaveImageButton disabled={!movieData} />
                </>
              )}

              <Separator orientation="vertical" className="h-4 mx-1" />

              <AppTooltip content={toolbarExpanded ? "Collapse toolbar" : "Expand toolbar"}>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={toolbarExpanded ? "Collapse toolbar" : "Expand toolbar"}
                  aria-expanded={toolbarExpanded}
                  onClick={() => setToolbarExpanded(!toolbarExpanded)}
                  className="hover:bg-accent"
                >
                  {toolbarExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </Button>
              </AppTooltip>
            </div>
          </div>

          <div className="w-full">
            <TimelineLegend hasTransitionSegments={hasTransitionSegments} />
            <div className="interpolation-timeline-container">
              <div ref={timelineHostRef} className="timeline-visual-layer" />
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
            top: `${hoveredSegmentPosition.y - TOOLTIP_Y_OFFSET}px`,
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
              totalSegments={totalSegments}
              getLeafNames={getLeafNames}
            />
          </div>
        </div>
      )}
    </>
  );
}

function TimelineLegend({ hasTransitionSegments }) {
  return (
    <div className="flex items-center gap-4 px-2 pt-1 pb-0.5 text-2xs font-medium text-muted-foreground">
      <LegendItem markerClassName="h-4 w-0.5 rounded bg-foreground/70" label="Source tree" />
      {hasTransitionSegments && (
        <LegendItem markerClassName="h-1 w-5 rounded bg-amber-600/85" label="Generated frames" />
      )}
      <LegendItem markerClassName="h-5 w-1 rounded bg-primary" label="Current position" />
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className="flex h-3 w-4 items-end gap-0.5" aria-hidden>
          <span className="h-1.5 w-0.5 bg-primary/70" />
          <span className="h-2.5 w-0.5 bg-primary/70" />
          <span className="h-1 w-0.5 bg-primary/70" />
          <span className="h-2 w-0.5 bg-primary/70" />
        </span>
        <span>Tree difference</span>
      </span>
    </div>
  );
}

function LegendItem({ markerClassName, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={markerClassName} aria-hidden />
      <span>{label}</span>
    </span>
  );
}
