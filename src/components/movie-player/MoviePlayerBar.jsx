import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { TransportControls } from './TransportControls.jsx';
import {
  TimelineScrollControls,
  TIMELINE_VIEW_BUTTON_CLASS,
} from './TimelineScrollControls/TimelineScrollControls.jsx';
import { PlaybackSpeedControl } from './PlaybackSpeedControl/PlaybackSpeedControl.jsx';
import { TimelineStatusStrip } from './TimelineStatusStrip.jsx';
import { usePlaybackShortcuts } from './playbackShortcuts.js';
import { TimelineSegmentTooltip } from '../timeline/TimelineSegmentTooltip.jsx';
import { TimelineController } from '../../timeline/timelineController.js';
import {
  selectAnimationSpeed,
  selectBackward,
  selectCurrentAnimationStage,
  selectForward,
  selectHoveredSegment,
  selectHasMsa,
  selectLeafNamesByIndex,
  selectOpenMsaViewer,
  selectPairChanges,
  selectPlaying,
  selectSelectedTimelineSegmentIndex,
  selectSetAnimationSpeed,
  selectSetHoveredSegment,
  selectTimeline,
  useAppStore,
} from '../../state/phyloStore/store.js';
import { openPanel, togglePanel, useIsPanelOpen } from '../dock/dockRuntime.js';
import { SETTINGS_PANEL_ID } from '../dock/panelRegistry.js';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Activity, CircleHelp, Dna, Menu, PanelRightOpen } from 'lucide-react';
import { AppTooltip } from '../ui/app-tooltip';
import { cn } from '../../lib/utils';
import { clampTooltipLeft } from '../timeline/timelineSegmentTooltipUtils.js';
import { MOVIE_PLAYER_ARIA_LABELS, TIMELINE_LEGEND_ITEMS } from './MoviePlayerBar.contract.js';

// ==========================================================================
// CONSTANTS
// ==========================================================================
const TOOLTIP_MARGIN = 8;

export function MoviePlayerBar() {
  const forward = useAppStore(selectForward);
  const backward = useAppStore(selectBackward);
  const setAnimationSpeed = useAppStore(selectSetAnimationSpeed);
  const animationSpeed = useAppStore(selectAnimationSpeed);
  const hasMsa = useAppStore(selectHasMsa);
  const openMsaViewer = useAppStore(selectOpenMsaViewer);
  const pairChanges = useAppStore(selectPairChanges);
  const selectedSegmentIndex = useAppStore(selectSelectedTimelineSegmentIndex);

  const timeline = useAppStore(selectTimeline);
  const timelineHostRef = useRef(null);
  const playerBarRef = useRef(null);

  const hasTimeline = Boolean(timeline);
  usePlaybackShortcuts(hasTimeline);
  const hasTransitionSegments = Boolean(
    timeline?.segments.some((segment) => !segment.isInputTreeSegment)
  );

  const canInspect = timeline?.segments[selectedSegmentIndex]?.isInputTreeSegment === false;

  useEffect(() => {
    const container = timelineHostRef.current;
    if (!timeline || !container) return;

    const controller = new TimelineController(useAppStore);
    controller.mount(container);

    return () => controller.unmount();
  }, [timeline]);

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

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updatePlayerBarHeight) : null;
    resizeObserver?.observe(playerBar);

    return () => {
      resizeObserver?.disconnect();
      layoutRoot.style.removeProperty('--movie-player-bar-height');
    };
  }, []);

  const settingsOpen = useIsPanelOpen(SETTINGS_PANEL_ID);
  const handleNavigationToggle = useCallback(() => togglePanel(SETTINGS_PANEL_ID), []);
  const handleOpenMsaViewer = useCallback(() => {
    if (!hasMsa) return;
    openMsaViewer();
    openPanel('alignment'); // the flag may already be set, with the panel behind another tab
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
            className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border/70 bg-muted/20 px-2 py-1 lg:flex-nowrap"
            role="group"
            aria-label={MOVIE_PLAYER_ARIA_LABELS.primaryControls}
          >
            <AppTooltip content="Toggle settings (Ctrl/⌘+B)">
              <Button
                id="nav-toggle-button"
                variant="ghost"
                size="icon-sm"
                aria-label="Toggle settings"
                aria-expanded={settingsOpen ? 'true' : 'false'}
                onClick={handleNavigationToggle}
              >
                <Menu className="size-4" />
              </Button>
            </AppTooltip>

            <div className="rounded-md border border-border/70 bg-background/80 px-1 py-0.5 shadow-sm">
              <TransportControls onBackward={backward} onForward={forward} />
            </div>

            {hasTimeline && (
              <div
                className="flex min-w-0 items-center gap-2"
                role="group"
                aria-label={MOVIE_PLAYER_ARIA_LABELS.timelineNavigation}
              >
                <TimelineStatusStrip />
                <MotionStageLabel />
                <InspectTransitionAction canInspect={canInspect} />
                <MsaPlayerBarAction hasMsa={hasMsa} onOpen={handleOpenMsaViewer} />
              </div>
            )}

            <div
              className="ml-auto flex items-center"
              role="group"
              aria-label={MOVIE_PLAYER_ARIA_LABELS.playbackSettings}
            >
              <PlaybackSpeedControl value={animationSpeed} setValue={setAnimationSpeed} />
            </div>
          </div>

          <div className="flex items-center bg-background">
            <div
              className="min-w-0 flex-1"
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
            {hasTimeline && (
              <div className="flex shrink-0 items-center gap-0.5 px-1">
                <TimelineScrollControls />
                <TimelineLegend
                  hasTransitionSegments={hasTransitionSegments}
                  maxRf={pairChanges.maxRf}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <TimelineSegmentTooltipOverlay playerBarRef={playerBarRef} pairChanges={pairChanges} />
    </>
  );
}

function TimelineSegmentTooltipOverlay({ playerBarRef, pairChanges }) {
  const hovered = useAppStore(selectHoveredSegment);
  const timeline = useAppStore(selectTimeline);
  const selectedSegmentIndex = useAppStore(selectSelectedTimelineSegmentIndex);
  const playing = useAppStore(selectPlaying);
  const setHoveredSegment = useAppStore(selectSetHoveredSegment);
  const leafNamesByIndex = useAppStore(selectLeafNamesByIndex);
  const tooltipRef = useRef(null);
  const segment = timeline?.segments[hovered?.index];
  const anchorX = hovered?.x;
  const [placement, setPlacement] = useState(null);

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

  // Picking a segment or starting playback is a decision; the hover preview has done its job.
  useEffect(() => {
    setHoveredSegment(null);
  }, [selectedSegmentIndex, playing, setHoveredSegment]);

  // Sits just above the whole player bar so it never covers the controls; only x follows the pointer.
  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    const playerBar = playerBarRef.current;
    if (!tooltip || !playerBar) {
      setPlacement(null);
      return undefined;
    }

    const updatePlacement = () => {
      const next = {
        left: clampTooltipLeft(anchorX, tooltip.getBoundingClientRect().width, window.innerWidth),
        top: playerBarRef.current.getBoundingClientRect().top - TOOLTIP_MARGIN,
      };
      setPlacement((current) =>
        current?.left === next.left && current?.top === next.top ? current : next
      );
    };

    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updatePlacement) : null;
    resizeObserver?.observe(tooltip);

    return () => {
      window.removeEventListener('resize', updatePlacement);
      resizeObserver?.disconnect();
    };
  }, [anchorX, segment, playerBarRef]);

  if (!segment) return null;

  return (
    <div
      ref={tooltipRef}
      style={{
        position: 'fixed',
        left: `${placement?.left ?? 0}px`,
        top: `${placement?.top ?? 0}px`,
        transform: 'translateY(-100%)',
        zIndex: 10000,
        pointerEvents: 'none',
        width: 'max-content',
        minWidth: '200px',
        maxWidth: `min(300px, calc(100vw - ${TOOLTIP_MARGIN * 2}px))`,
        visibility: placement ? 'visible' : 'hidden',
      }}
      className="animate-in fade-in-0 duration-200"
    >
      <div className="rounded-lg border bg-card p-2 shadow-lg">
        <TimelineSegmentTooltip
          segment={segment}
          pairChange={pairChanges.byPairId.get(segment.pairId)}
          pairCount={pairChanges.byPairId.size}
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

// The inspector opens on demand: selecting a segment only enables this button.
function InspectTransitionAction({ canInspect }) {
  return (
    <AppTooltip
      content={
        canInspect ? 'Inspect transition' : 'Select a transition on the timeline to inspect it'
      }
    >
      <span className="inline-flex shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Inspect transition"
          disabled={!canInspect}
          onClick={() => openPanel('inspector')}
          className="hover:bg-accent"
        >
          <PanelRightOpen className="size-4" />
        </Button>
      </span>
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

// Swatches mirror what the timeline strip draws; the label alone carries the meaning.
function TimelineLegend({ hasTransitionSegments, maxRf }) {
  return (
    <Popover>
      <AppTooltip content="Timeline legend">
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Show timeline legend"
            className={TIMELINE_VIEW_BUTTON_CLASS}
          >
            <CircleHelp className="size-3.5" aria-hidden />
          </Button>
        </PopoverTrigger>
      </AppTooltip>
      <PopoverContent
        side="top"
        align="end"
        className="z-[1300] flex w-auto flex-col gap-1.5 p-3 text-xs font-medium text-muted-foreground"
        aria-label={MOVIE_PLAYER_ARIA_LABELS.timelineLegend}
      >
        {hasTransitionSegments && (
          <>
            <LegendItem
              swatchClassName="h-2 w-4 rounded-sm bg-slate-500"
              label={TIMELINE_LEGEND_ITEMS.rfChange}
            >
              <span className="font-normal tabular-nums">(max {maxRf.toFixed(2)})</span>
            </LegendItem>
            <LegendItem
              swatchClassName="size-2 rounded-full bg-slate-700"
              label={TIMELINE_LEGEND_ITEMS.sprMove}
              title="size = taxa moved"
            />
            <LegendItem
              swatchClassName="w-5 border-t-2 border-dashed border-slate-500"
              label={TIMELINE_LEGEND_ITEMS.branchLengthsOnly}
            />
          </>
        )}
        <LegendItem
          swatchClassName="h-1.5 w-px bg-slate-500"
          label={TIMELINE_LEGEND_ITEMS.inputTree}
        />
        <LegendItem
          swatchClassName="h-1.5 w-5 rounded bg-emerald-600"
          label={TIMELINE_LEGEND_ITEMS.selected}
        />
      </PopoverContent>
    </Popover>
  );
}

function LegendItem({ swatchClassName, label, title, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap" title={title}>
      <span className={swatchClassName} aria-hidden />
      <span>{label}</span>
      {children}
    </span>
  );
}
