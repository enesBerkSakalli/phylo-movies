import React, { useCallback, useState, useEffect, useRef } from 'react';

import { MovieChartSection } from './MovieChartSection/MovieChartSection.jsx';
import { TransportControls } from './TransportControls.jsx';
import { TimelineScrollControls } from './TimelineScrollControls/TimelineScrollControls.jsx';
import { PlaybackSpeedControl } from './PlaybackSpeedControl/PlaybackSpeedControl.jsx';
import { TimelineStatusStrip } from './TimelineStatusStrip.jsx';
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
import { AppTooltip } from '../ui/app-tooltip';
import {
  MOVIE_PLAYER_ARIA_LABELS,
  TIMELINE_LEGEND_ITEMS,
} from './MoviePlayerBar.contract.js';

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
  const playerBarRef = useRef(null);

  const hasTimeline = Boolean(movieTimelineManager);
  const totalSegments = hasTimeline ? movieTimelineManager?.getSegmentCount?.() ?? 0 : 0;
  const hasTransitionSegments = hasTimeline ? movieTimelineManager?.hasTransitionSegments?.() ?? false : false;

  useEffect(() => {
    const container = timelineHostRef.current;
    if (!movieTimelineManager || !container) return;

    movieTimelineManager.mount(container);

    return () => {
      movieTimelineManager.unmount();
    };
  }, [movieTimelineManager]);

  useEffect(() => {
    const playerBar = playerBarRef.current;
    if (!playerBar || typeof document === 'undefined') return undefined;

    const layoutRoot = playerBar.closest('[data-slot="sidebar-wrapper"]') || document.documentElement;
    const updatePlayerBarHeight = () => {
      const height = Math.ceil(playerBar.getBoundingClientRect().height);
      layoutRoot.style.setProperty('--movie-player-bar-height', `${height}px`);
    };

    updatePlayerBarHeight();
    window.addEventListener('resize', updatePlayerBarHeight);

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updatePlayerBarHeight)
      : null;
    resizeObserver?.observe(playerBar);

    return () => {
      window.removeEventListener('resize', updatePlayerBarHeight);
      resizeObserver?.disconnect();
      layoutRoot.style.removeProperty('--movie-player-bar-height');
    };
  }, []);

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
      <div ref={playerBarRef} className="movie-player-bar relative z-[1000] w-full shrink-0 bg-card border-t shadow-[0_2px_4px_rgba(0,0,0,0.08)]" role="region" aria-label={MOVIE_PLAYER_ARIA_LABELS.root}>
        <div className="flex flex-col">
          <div
            className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-border/70 bg-muted/20 px-2 py-1"
            role="group"
            aria-label={MOVIE_PLAYER_ARIA_LABELS.primaryControls}
          >
            <div className="flex min-w-0 items-center gap-1" role="group" aria-label={MOVIE_PLAYER_ARIA_LABELS.timelineNavigation}>
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

              {hasTimeline && <TimelineStatusStrip />}
            </div>

            <div className="justify-self-center rounded-md border border-border/70 bg-background/80 px-1 py-0.5 shadow-sm">
              <TransportControls
                onBackward={backward}
                onForward={forward}
              />
            </div>

            <div className="flex min-w-0 items-center justify-end gap-2" role="group" aria-label={MOVIE_PLAYER_ARIA_LABELS.playbackSettings}>
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

          <div className="w-full border-b border-border/60 bg-background" role="group" aria-label={MOVIE_PLAYER_ARIA_LABELS.timelineTrack}>
            {hasTimeline && (
              <TimelineLayerControls
                hasTransitionSegments={hasTransitionSegments}
                showViewportControls={toolbarExpanded}
              />
            )}
            {hasTimeline ? (
              <div className="interpolation-timeline-container">
                <div ref={timelineHostRef} className="timeline-visual-layer" />
              </div>
            ) : (
              <div
                className="interpolation-timeline-container flex items-center justify-center text-xs text-muted-foreground/60"
                role="status"
                aria-live="polite"
              >
                {MOVIE_PLAYER_ARIA_LABELS.loadingTimeline}
              </div>
            )}
          </div>

          <MovieChartSection barOptionValue={barOptionValue} onBarOptionChange={setBarOption} />
        </div>
      </div>

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

function TimelineLayerControls({ hasTransitionSegments, showViewportControls }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 bg-muted/10 px-2 py-1">
      <TimelineLegend hasTransitionSegments={hasTransitionSegments} />
      {showViewportControls && <TimelineScrollControls />}
    </div>
  );
}

function TimelineLegend({ hasTransitionSegments }) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs font-medium text-muted-foreground"
      role="group"
      aria-label={MOVIE_PLAYER_ARIA_LABELS.timelineLegend}
    >
      <LegendItem markerClassName="h-2.5 w-2.5 rounded-full border-2 border-foreground/70 bg-background" label={TIMELINE_LEGEND_ITEMS.inputTrees} />
      {hasTransitionSegments && (
        <LegendItem markerClassName="h-1 w-5 rounded bg-amber-600/85" label={TIMELINE_LEGEND_ITEMS.generatedFrames} />
      )}
      <LegendItem markerClassName="h-1.5 w-5 rounded bg-emerald-600" label={TIMELINE_LEGEND_ITEMS.selectedSegment} />
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
