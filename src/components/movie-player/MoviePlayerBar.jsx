import React, { useCallback, useState, useEffect, useRef } from 'react';

import { MovieChartSection } from './MovieChartSection/MovieChartSection.jsx';
import { TransportControls } from './TransportControls.jsx';
import { TimelineScrollControls } from './TimelineScrollControls/TimelineScrollControls.jsx';
import { PlaybackSpeedControl } from './PlaybackSpeedControl/PlaybackSpeedControl.jsx';
import { TimelineSegmentTooltip } from '../timeline/TimelineSegmentTooltip.jsx';
import {
  selectAnimationSpeed,
  selectBackward,
  selectBarOptionValue,
  selectForward,
  selectHoveredSegmentData,
  selectHoveredSegmentIndex,
  selectHoveredSegmentPosition,
  selectLeafNamesByIndex,
  selectMovieTimelineManager,
  selectSetAnimationSpeed,
  selectSetBarOption,
  selectSetHoveredSegment,
  selectSetTooltipHovered,
  useAppStore
} from '../../state/phyloStore/store.js';
import { useSidebar } from '../ui/sidebar';
import { Button } from '../ui/button';
import { Menu, ChevronUp, ChevronDown } from 'lucide-react';

import { Separator } from '../ui/separator';
import { AppTooltip } from '../ui/app-tooltip';

// ==========================================================================
// CONSTANTS
// ==========================================================================
const TOOLTIP_Y_OFFSET = 12;

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
  const movieTimelineManager = useAppStore(selectMovieTimelineManager);
  const leafNamesByIndex = useAppStore(selectLeafNamesByIndex);
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
    if (!leafNamesByIndex || !Array.isArray(leafNamesByIndex)) return [];

    const leafNames = [];
    for (const idx of indices) {
      if (Number.isInteger(idx) && idx >= 0 && idx < leafNamesByIndex.length) {
        leafNames.push(leafNamesByIndex[idx]);
      }
    }
    return leafNames;
  }, [leafNamesByIndex]);

  const { open, toggleSidebar } = useSidebar();
  const handleNavigationToggle = useCallback(() => {
    try {
      toggleSidebar();
    } catch {}
  }, [toggleSidebar]);

  return (
    <>
      <div className="movie-player-bar sticky bottom-0 z-[1000] bg-card border-t shadow-[0_2px_4px_rgba(0,0,0,0.08)]" role="region" aria-label="Movie timeline controls">
        <div className="flex flex-col">
          <div
            className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-border/70 bg-muted/20 px-2 py-1"
            role="group"
            aria-label="Primary playback controls"
          >
            <div className="flex min-w-0 items-center gap-1" role="group" aria-label="Timeline navigation controls">
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

              {toolbarExpanded && (
                <>
                  <Separator orientation="vertical" className="mx-1 h-4" />
                  <TimelineScrollControls />
                </>
              )}
            </div>

            <div className="justify-self-center rounded-md border border-border/70 bg-background/80 px-1 py-0.5 shadow-sm">
              <TransportControls
                onBackward={backward}
                onForward={forward}
              />
            </div>

            <div className="flex min-w-0 items-center justify-end gap-2" role="group" aria-label="Playback settings">
              {toolbarExpanded && (
                <PlaybackSpeedControl
                  value={animationSpeed}
                  setValue={setAnimationSpeed}
                />
              )}

              <AppTooltip content={toolbarExpanded ? "Collapse timeline controls" : "Expand timeline controls"}>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={toolbarExpanded ? "Collapse timeline controls" : "Expand timeline controls"}
                  aria-expanded={toolbarExpanded}
                  onClick={() => setToolbarExpanded(!toolbarExpanded)}
                  className="hover:bg-accent"
                >
                  {toolbarExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </Button>
              </AppTooltip>
            </div>
          </div>

          <div className="w-full border-b border-border/60 bg-background" role="group" aria-label="Timeline track">
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
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 pt-1 pb-0.5 text-2xs font-medium text-muted-foreground"
      role="group"
      aria-label="Timeline legend"
    >
      <LegendItem markerClassName="h-2.5 w-2.5 rounded-full border-2 border-foreground/70 bg-background" label="Source trees" />
      {hasTransitionSegments && (
        <LegendItem markerClassName="h-1 w-5 rounded bg-amber-600/85" label="Generated frames" />
      )}
      <LegendItem markerClassName="h-1.5 w-5 rounded bg-emerald-600" label="Selected segment" />
      <LegendItem markerClassName="h-5 w-1 rounded bg-primary" label="Current position" />
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
