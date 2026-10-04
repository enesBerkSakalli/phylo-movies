import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { MovieChartSection } from './MovieChartSection/MovieChartSection.jsx';
import { TransportControls } from './TransportControls.jsx';
import { TimelineScrollControls } from './TimelineScrollControls/TimelineScrollControls.jsx';
import { PlaybackSpeedControl } from './PlaybackSpeedControl/PlaybackSpeedControl.jsx';
import { TimelineStatusStrip } from './TimelineStatusStrip.jsx';
import { usePlaybackShortcuts } from './playbackShortcuts.js';
import { TimelineSegmentTooltip } from '../timeline/TimelineSegmentTooltip.jsx';
import {
  selectAnimationSpeed,
  selectBackward,
  selectCurrentAnimationStage,
  selectForward,
  selectHoveredSegmentData,
  selectHoveredSegmentIndex,
  selectHoveredSegmentPosition,
  selectHasMsa,
  selectLeafNamesByIndex,
  selectMovieTimelineManager,
  selectOpenMsaViewer,
  selectSetAnimationSpeed,
  selectSetHoveredSegment,
  selectSetTooltipHovered,
  useAppStore,
} from '../../state/phyloStore/store.js';
import { useSidebar } from '../ui/sidebar';
import { Button } from '../ui/button';
import { Activity, Menu, ChevronUp, ChevronDown, Dna } from 'lucide-react';
import { AppTooltip } from '../ui/app-tooltip';
import { cn } from '../../lib/utils';
import { MOVIE_PLAYER_ARIA_LABELS, TIMELINE_LEGEND_ITEMS } from './MoviePlayerBar.contract.js';

// ==========================================================================
// CONSTANTS
// ==========================================================================
const TOOLTIP_Y_OFFSET = 12;

export function MoviePlayerBar() {
  const forward = useAppStore(selectForward);
  const backward = useAppStore(selectBackward);
  const setAnimationSpeed = useAppStore(selectSetAnimationSpeed);
  const animationSpeed = useAppStore(selectAnimationSpeed);
  const hasMsa = useAppStore(selectHasMsa);
  const openMsaViewer = useAppStore(selectOpenMsaViewer);
  const [toolbarExpanded, setToolbarExpanded] = useState(true);

  const movieTimelineManager = useAppStore(selectMovieTimelineManager);
  const timelineHostRef = useRef(null);
  const playerBarRef = useRef(null);

  const hasTimeline = Boolean(movieTimelineManager);
  usePlaybackShortcuts(hasTimeline);
  const hasTransitionSegments = React.useMemo(
    () => (hasTimeline ? (movieTimelineManager?.hasTransitionSegments?.() ?? false) : false),
    [hasTimeline, movieTimelineManager]
  );

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

    const layoutRoot =
      playerBar.closest('[data-slot="sidebar-wrapper"]') || document.documentElement;
    const updatePlayerBarHeight = () => {
      const height = Math.ceil(playerBar.getBoundingClientRect().height);
      layoutRoot.style.setProperty('--movie-player-bar-height', `${height}px`);
    };

    updatePlayerBarHeight();
    window.addEventListener('resize', updatePlayerBarHeight);

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updatePlayerBarHeight) : null;
    resizeObserver?.observe(playerBar);

    return () => {
      window.removeEventListener('resize', updatePlayerBarHeight);
      resizeObserver?.disconnect();
      layoutRoot.style.removeProperty('--movie-player-bar-height');
    };
  }, []);

  const { open, toggleSidebar } = useSidebar();
  const handleNavigationToggle = useCallback(() => {
    try {
      toggleSidebar();
    } catch {}
  }, [toggleSidebar]);
  const handleOpenMsaViewer = useCallback(() => {
    if (!hasMsa) return;
    openMsaViewer();
  }, [hasMsa, openMsaViewer]);

  return (
    <>
      <div
        ref={playerBarRef}
        className="movie-player-bar relative z-[1000] w-full shrink-0 bg-card border-t shadow-[0_2px_4px_rgba(0,0,0,0.08)]"
        role="region"
        aria-label={MOVIE_PLAYER_ARIA_LABELS.root}
        data-tour-id="workspace-timeline"
      >
        <div className="flex flex-col">
          <div
            className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border/70 bg-muted/20 px-2 py-1 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_auto] xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
            role="group"
            aria-label={MOVIE_PLAYER_ARIA_LABELS.primaryControls}
          >
            <div
              className="flex min-w-0 basis-full items-center gap-1 lg:basis-auto"
              role="group"
              aria-label={MOVIE_PLAYER_ARIA_LABELS.timelineNavigation}
            >
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

              {hasTimeline && (
                <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                  <TimelineStatusStrip />
                  <MsaPlayerBarAction hasMsa={hasMsa} onOpen={handleOpenMsaViewer} />
                  <MotionStageLabel />
                </div>
              )}
            </div>

            <div className="rounded-md border border-border/70 bg-background/80 px-1 py-0.5 shadow-sm xl:justify-self-center">
              <TransportControls onBackward={backward} onForward={forward} />
            </div>

            <div
              className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2"
              role="group"
              aria-label={MOVIE_PLAYER_ARIA_LABELS.playbackSettings}
            >
              {toolbarExpanded && (
                <PlaybackSpeedControl value={animationSpeed} setValue={setAnimationSpeed} />
              )}

              <AppTooltip
                content={
                  toolbarExpanded ? 'Collapse timeline controls' : 'Expand timeline controls'
                }
              >
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={
                    toolbarExpanded ? 'Collapse timeline controls' : 'Expand timeline controls'
                  }
                  aria-expanded={toolbarExpanded}
                  onClick={() => setToolbarExpanded((expanded) => !expanded)}
                  className="hover:bg-accent"
                >
                  {toolbarExpanded ? (
                    <ChevronUp className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </Button>
              </AppTooltip>
            </div>
          </div>

          <div
            className="w-full border-b border-border/60 bg-background"
            role="group"
            aria-label={MOVIE_PLAYER_ARIA_LABELS.timelineTrack}
          >
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

          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-muted/10 px-2 py-1"
            role="group"
            aria-label={MOVIE_PLAYER_ARIA_LABELS.timelineFooter}
          >
            {/* Chart toggle (first), metric picker and chart panel (last, full width). */}
            <MovieChartSection />
            {hasTimeline && <TimelineLegend hasTransitionSegments={hasTransitionSegments} />}
            {hasTimeline && toolbarExpanded && (
              <div className="order-4 shrink-0">
                <TimelineScrollControls />
              </div>
            )}
          </div>
        </div>
      </div>

      <TimelineSegmentTooltipOverlay />
    </>
  );
}

function getTimelineTooltipPosition(position) {
  const x = Number(position?.x);
  const y = Number(position?.y);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return { x, y };
}

function clampTimelineTooltipPosition(anchor, element) {
  if (!anchor || !element || typeof window === 'undefined') return null;

  const margin = 8;
  const bounds = element.getBoundingClientRect();
  const availableHalfWidth = Math.max(0, (window.innerWidth - margin * 2) / 2);
  const halfWidth = Math.min(bounds.width / 2, availableHalfWidth);
  const minimumX = margin + halfWidth;
  const maximumX = Math.max(minimumX, window.innerWidth - margin - halfWidth);
  const minimumY = Math.min(window.innerHeight - margin, margin + bounds.height);
  const maximumY = Math.max(minimumY, window.innerHeight - margin);

  return {
    x: Math.min(Math.max(anchor.x, minimumX), maximumX),
    y: Math.min(Math.max(anchor.y - TOOLTIP_Y_OFFSET, minimumY), maximumY),
  };
}

function positionsEqual(left, right) {
  return left?.x === right?.x && left?.y === right?.y;
}

function TimelineSegmentTooltipOverlay() {
  const hoveredSegmentIndex = useAppStore(selectHoveredSegmentIndex);
  const hoveredSegmentData = useAppStore(selectHoveredSegmentData);
  const hoveredSegmentPosition = useAppStore(selectHoveredSegmentPosition);
  const setTooltipHovered = useAppStore(selectSetTooltipHovered);
  const setHoveredSegment = useAppStore(selectSetHoveredSegment);
  const movieTimelineManager = useAppStore(selectMovieTimelineManager);
  const leafNamesByIndex = useAppStore(selectLeafNamesByIndex);
  const tooltipRef = useRef(null);
  const anchorPosition = getTimelineTooltipPosition(hoveredSegmentPosition);
  const anchorX = anchorPosition?.x;
  const anchorY = anchorPosition?.y;
  const [tooltipPosition, setTooltipPosition] = useState(null);
  const totalSegments = movieTimelineManager?.getSegmentCount?.() ?? 0;

  const getLeafNames = useCallback(
    (indices) => {
      if (!Array.isArray(leafNamesByIndex)) return [];

      const leafNames = [];
      for (const index of indices) {
        if (Number.isInteger(index) && index >= 0 && index < leafNamesByIndex.length) {
          leafNames.push(leafNamesByIndex[index]);
        }
      }
      return leafNames;
    },
    [leafNamesByIndex]
  );

  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    if (!Number.isFinite(anchorX) || !Number.isFinite(anchorY) || !tooltip) {
      setTooltipPosition(null);
      return undefined;
    }

    const updatePosition = () => {
      const nextPosition = clampTimelineTooltipPosition({ x: anchorX, y: anchorY }, tooltip);
      setTooltipPosition((currentPosition) =>
        positionsEqual(currentPosition, nextPosition) ? currentPosition : nextPosition
      );
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updatePosition) : null;
    resizeObserver?.observe(tooltip);

    return () => {
      window.removeEventListener('resize', updatePosition);
      resizeObserver?.disconnect();
    };
  }, [anchorX, anchorY, hoveredSegmentIndex]);

  if (hoveredSegmentIndex === null || !hoveredSegmentData || !anchorPosition) {
    return null;
  }

  const visiblePosition = tooltipPosition ?? anchorPosition;

  return (
    <div
      ref={tooltipRef}
      style={{
        position: 'fixed',
        left: `${visiblePosition.x}px`,
        top: `${visiblePosition.y}px`,
        transform: 'translate(-50%, -100%)',
        zIndex: 10000,
        pointerEvents: 'auto',
        minWidth: '200px',
        maxWidth: '300px',
        visibility: tooltipPosition ? 'visible' : 'hidden',
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
  );
}

function MsaPlayerBarAction({ hasMsa, onOpen }) {
  if (!hasMsa) return null;

  return (
    <AppTooltip content="Open alignment viewer">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Open alignment viewer"
        onClick={onOpen}
        className="shrink-0 hover:bg-accent"
      >
        <Dna className="size-4" />
      </Button>
    </AppTooltip>
  );
}

// Topology-change phase of the current transition. Its own component so stage
// updates during playback do not re-render the status strip; the slot keeps its
// width while idle (where there is room) so nothing shifts when a transition starts.
function MotionStageLabel() {
  const stage = useAppStore(selectCurrentAnimationStage);
  const active = Boolean(stage);
  const label = formatAnimationStage(stage);

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-primary sm:w-[5.5rem]',
        !active && 'invisible max-sm:hidden'
      )}
      aria-hidden={!active}
    >
      <Activity className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">
        <span className="sr-only">Transition phase: </span>
        {label}
      </span>
    </span>
  );
}

function formatAnimationStage(stage) {
  switch (stage) {
    case 'COLLAPSE':
      return 'Collapse';
    case 'EXPAND':
      return 'Expand';
    case 'REORDER':
      return 'Reorder';
    case null:
    case undefined:
    case '':
      return 'Idle';
    default:
      return String(stage);
  }
}

function TimelineLegend({ hasTransitionSegments }) {
  return (
    <div
      className="order-5 flex min-w-0 basis-full flex-wrap items-center gap-x-3 gap-y-1 overflow-hidden text-2xs font-medium text-muted-foreground sm:order-2 sm:flex-1 sm:basis-auto"
      role="group"
      aria-label={MOVIE_PLAYER_ARIA_LABELS.timelineLegend}
    >
      <LegendItem
        markerClassName="h-2.5 w-2.5 rounded-full border-2 border-foreground/70 bg-background"
        label={TIMELINE_LEGEND_ITEMS.inputTrees}
      />
      {hasTransitionSegments && (
        <LegendItem
          markerClassName="h-1 w-5 rounded bg-amber-600/85"
          label={TIMELINE_LEGEND_ITEMS.generatedFrames}
        />
      )}
      <LegendItem
        markerClassName="h-1.5 w-5 rounded bg-emerald-600"
        label={TIMELINE_LEGEND_ITEMS.selectedSegment}
      />
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
