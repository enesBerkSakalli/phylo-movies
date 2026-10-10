import React, {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

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
  selectCurrentAnimationStage,
  selectHoveredSegment,
  selectHasMsa,
  selectInspectedSegmentIndex,
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
import { Separator } from '../ui/separator';
import { Activity, CircleHelp, Dna, Ellipsis, Menu, PanelRightOpen } from 'lucide-react';
import { AppTooltip } from '../ui/app-tooltip';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../lib/utils';

// Below Tailwind's sm (40rem) row 1 keeps the menu, transport and position, and the rest moves
// into the More popover. The same width the sm: classes switch at.
const COMPACT_QUERY = '(max-width: 39.99rem)';
const watchCompact = (notify) => {
  const query = window.matchMedia?.(COMPACT_QUERY);
  query?.addEventListener('change', notify);
  return () => query?.removeEventListener('change', notify);
};
const isCompact = () => Boolean(window.matchMedia?.(COMPACT_QUERY).matches);

export function MoviePlayerBar() {
  const compact = useSyncExternalStore(watchCompact, isCompact, () => false);
  const setAnimationSpeed = useAppStore(selectSetAnimationSpeed);
  const animationSpeed = useAppStore(selectAnimationSpeed);
  const hasMsa = useAppStore(selectHasMsa);
  const openMsaViewer = useAppStore(selectOpenMsaViewer);
  const pairChanges = useAppStore(selectPairChanges);
  const inspectedSegmentIndex = useAppStore(selectInspectedSegmentIndex);

  const timeline = useAppStore(selectTimeline);
  const timelineHostRef = useRef(null);
  const playerBarRef = useRef(null);

  const hasTimeline = Boolean(timeline);
  usePlaybackShortcuts(hasTimeline);
  const hasTransitionSegments = Boolean(
    timeline?.segments.some((segment) => !segment.isInputTreeSegment)
  );

  const canInspect = timeline?.segments[inspectedSegmentIndex]?.isInputTreeSegment === false;

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
        aria-label="Movie timeline and playback controls"
        data-tour-id="workspace-timeline"
      >
        <div className="flex flex-col">
          <div
            className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border/70 bg-muted/20 px-2 py-1 lg:flex-nowrap"
            role="group"
            aria-label="Primary playback controls"
          >
            <AppTooltip content="Toggle settings (Ctrl/⌘+B)">
              <Button
                id="nav-toggle-button"
                variant="ghost"
                size="icon-sm"
                aria-label="Toggle settings"
                aria-expanded={settingsOpen ? 'true' : 'false'}
                onClick={handleNavigationToggle}
                className="max-sm:size-[44px]"
              >
                <Menu className="size-4" />
              </Button>
            </AppTooltip>

            <div className="rounded-md border border-border/70 bg-background/80 px-1 py-0.5 shadow-sm max-sm:border-0 max-sm:bg-transparent max-sm:p-0 max-sm:shadow-none">
              <TransportControls />
            </div>

            {compact && (
              <MoreMenu
                hasTimeline={hasTimeline}
                canInspect={canInspect}
                hasMsa={hasMsa}
                onOpenMsa={handleOpenMsaViewer}
                speed={animationSpeed}
                onSpeedChange={setAnimationSpeed}
                hasTransitionSegments={hasTransitionSegments}
                maxRf={pairChanges.maxRf}
              />
            )}

            {hasTimeline && (
              <div
                className={cn('flex min-w-0 flex-wrap items-center gap-2', compact && 'basis-full')}
                role="group"
                aria-label="Timeline navigation controls"
              >
                <TimelineStatusStrip />
                <MotionStageLabel />
                {!compact && (
                  <>
                    <InspectTransitionAction canInspect={canInspect} />
                    <MsaPlayerBarAction hasMsa={hasMsa} onOpen={handleOpenMsaViewer} />
                  </>
                )}
              </div>
            )}

            {!compact && (
              <div
                className="ml-auto flex items-center"
                role="group"
                aria-label="Playback settings"
              >
                <PlaybackSpeedControl value={animationSpeed} setValue={setAnimationSpeed} />
              </div>
            )}
          </div>

          <div className="flex items-center bg-background">
            <div className="min-w-0 flex-1" role="group" aria-label="Timeline track">
              {hasTimeline ? (
                <div className="interpolation-timeline-container">
                  <div ref={timelineHostRef} className="timeline-visual-layer" />
                </div>
              ) : (
                <div
                  className="interpolation-timeline-container flex items-center justify-center text-xs text-muted-foreground"
                  role="status"
                  aria-live="polite"
                >
                  Loading movie timeline...
                </div>
              )}
            </div>
            {hasTimeline && !compact && (
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

      <TimelineSegmentTooltipOverlay pairChanges={pairChanges} />
    </>
  );
}

function TimelineSegmentTooltipOverlay({ pairChanges }) {
  const selectedSegmentIndex = useAppStore(selectSelectedTimelineSegmentIndex);
  const playing = useAppStore(selectPlaying);
  const setHoveredSegment = useAppStore(selectSetHoveredSegment);

  // Picking a segment or starting playback is a decision; the hover preview has done its job.
  useEffect(() => {
    setHoveredSegment(null);
  }, [selectedSegmentIndex, playing, setHoveredSegment]);

  return (
    <TimelineSegmentTooltipPreview
      key={`${selectedSegmentIndex}:${playing}`}
      pairChanges={pairChanges}
    />
  );
}

function TimelineSegmentTooltipPreview({ pairChanges }) {
  const hovered = useAppStore(selectHoveredSegment);
  const timeline = useAppStore(selectTimeline);
  const setHoveredSegment = useAppStore(selectSetHoveredSegment);
  const leafNamesByIndex = useAppStore(selectLeafNamesByIndex);
  // Keep the preview while it is being read, after the strip's delayed pointer-leave clears.
  const [heldHover, setHeldHover] = useState(null);
  const contentRef = useRef(null);
  const pointerX = useRef(null);
  const preview = hovered ?? heldHover;
  const segment = timeline?.segments[preview?.index];
  const dismiss = useCallback(() => {
    setHeldHover(null);
    setHoveredSegment(null);
  }, [setHoveredSegment]);

  const trackPointer = useCallback(
    (event) => {
      if (event.pointerType !== 'mouse') return;
      const strip = document.querySelector('.movie-player-bar .interpolation-timeline-container');
      if (strip?.contains(event.target)) {
        pointerX.current = event.clientX;
        return;
      }
      if (!preview) return;
      const bounds = contentRef.current?.getBoundingClientRect();
      if (!bounds || !strip) return;
      const stripTop = strip.getBoundingClientRect().top;
      const { clientX: x, clientY: y } = event;
      const exitX = pointerX.current ?? preview.x;
      // The control row separates the strip and preview. Keep a path across that gap without
      // covering any controls with an invisible hit target or making slow pointers race a timer.
      const insidePreview =
        x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
      const insideGap =
        x >= Math.min(exitX, bounds.left) - 8 &&
        x <= Math.max(exitX, bounds.right) + 8 &&
        y >= Math.min(bounds.bottom, stripTop) &&
        y <= Math.max(bounds.bottom, stripTop);
      if (insidePreview || insideGap) setHeldHover(preview);
      else dismiss();
    },
    [preview, dismiss]
  );

  useEffect(() => {
    document.addEventListener('pointermove', trackPointer);
    return () => document.removeEventListener('pointermove', trackPointer);
  }, [trackPointer]);

  useEffect(() => {
    if (!preview) return;
    // Crossing the control row can open another tooltip. Radix sends Escape only to that
    // highest layer, so the segment preview also listens while it is visible.
    const onKeyDown = (event) => {
      if (event.key === 'Escape') dismiss();
    };
    // Scrubbing and panning keep selection unchanged, so end the preview on the initial press.
    const onPointerDown = (event) => {
      if (event.target?.closest?.('.movie-player-bar .interpolation-timeline-container')) dismiss();
    };
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [preview, dismiss]);

  if (!segment) return null;

  // A 0x0 point on the player bar's top edge (the bar sits at the viewport bottom), at the
  // segment's x. The tooltip floats 8px above it, clear of the controls, and is shifted to stay
  // 8px inside the viewport even when that moves it past the point. floating-ui does not watch a
  // 0x0 anchor move, so it re-places the tooltip every frame.
  return (
    <Tooltip open>
      <TooltipTrigger asChild>
        <span
          aria-hidden
          className="pointer-events-none fixed bottom-[var(--movie-player-bar-height)] size-0"
          style={{ left: preview.x }}
        />
      </TooltipTrigger>
      <TooltipContent
        ref={contentRef}
        arrow={false}
        side="top"
        sideOffset={8}
        collisionPadding={8}
        sticky="always"
        updatePositionStrategy="always"
        onPointerEnter={() => setHeldHover(preview)}
        onPointerLeave={trackPointer}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          dismiss();
        }}
        className="min-w-[200px] max-w-[min(300px,calc(100vw-1rem))] rounded-lg border p-2 shadow-lg"
      >
        <TimelineSegmentTooltip
          segment={segment}
          pairChange={pairChanges.byPairId.get(segment.pairId)}
          pairCount={pairChanges.byPairId.size}
          leafNamesByIndex={leafNamesByIndex}
        />
      </TooltipContent>
    </Tooltip>
  );
}

// `label` shows the name beside the icon, for the More popover
function MsaPlayerBarAction({ hasMsa, onOpen, label }) {
  if (!hasMsa) return null;

  return (
    <AppTooltip content="Open alignment viewer">
      <Button
        type="button"
        variant="ghost"
        size={label ? 'default' : 'icon-sm'}
        aria-label="Open alignment viewer"
        onClick={onOpen}
        className={cn('shrink-0 hover:bg-accent', label && 'max-sm:h-[44px] justify-start')}
      >
        <Dna className="size-4" />
        {label}
      </Button>
    </AppTooltip>
  );
}

// The inspector opens on demand: a selected transition, or the one playing, makes this button
// available. Unavailable it is aria-disabled, not disabled, so the keyboard still reaches it and
// hears why.
export function InspectTransitionAction({ canInspect, label, onDone }) {
  const reasonId = useId();
  const reason = 'Move to a transition to inspect it';

  return (
    <AppTooltip content={canInspect ? 'Inspect transition' : reason}>
      <span className={cn('inline-flex shrink-0', label && 'w-full')}>
        <Button
          type="button"
          variant="ghost"
          size={label ? 'default' : 'icon-sm'}
          aria-label="Inspect transition"
          aria-disabled={!canInspect}
          aria-describedby={canInspect ? undefined : reasonId}
          onClick={() => {
            if (!canInspect) return;
            openPanel('inspector');
            onDone?.();
          }}
          className={cn('hover:bg-accent', label && 'max-sm:h-[44px] w-full justify-start')}
        >
          <PanelRightOpen className="size-4" />
          {label}
        </Button>
        {!canInspect && (
          <span id={reasonId} className="sr-only">
            {reason}
          </span>
        )}
      </span>
    </AppTooltip>
  );
}

const ANIMATION_STAGE_LABELS = { COLLAPSE: 'Collapse', EXPAND: 'Expand', REORDER: 'Reorder' };

// Topology-change phase of the current transition. Its own component so stage
// updates during playback do not re-render the status strip; the slot keeps its
// width while idle (where there is room) so nothing shifts when a transition starts.
function MotionStageLabel() {
  const stage = useAppStore(selectCurrentAnimationStage);
  const active = Boolean(stage);
  const label = ANIMATION_STAGE_LABELS[stage] ?? 'Idle';

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

// What row 1 leaves out on a phone: speed, zoom, the two actions and the legend.
function MoreMenu({
  hasTimeline,
  canInspect,
  hasMsa,
  onOpenMsa,
  speed,
  onSpeedChange,
  hasTransitionSegments,
  maxRf,
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="More playback and timeline options"
          className="ml-auto size-[44px]"
        >
          <Ellipsis className="size-4" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        collisionPadding={8}
        aria-label="Playback and timeline options"
        className="movie-player-options z-[1300] flex max-h-[var(--radix-popover-content-available-height)] w-[min(20rem,calc(100vw-1rem))] flex-col gap-1 overflow-y-auto overscroll-contain p-3 [&>*]:shrink-0"
      >
        <PlaybackSpeedControl value={speed} setValue={onSpeedChange} />
        {hasTimeline && (
          <>
            <TimelineScrollControls />
            <InspectTransitionAction
              canInspect={canInspect}
              label="Inspect transition"
              onDone={close}
            />
            <MsaPlayerBarAction
              hasMsa={hasMsa}
              label="Alignment viewer"
              onOpen={() => {
                onOpenMsa();
                close();
              }}
            />
            <Separator className="my-1" />
            <div className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              <LegendItems hasTransitionSegments={hasTransitionSegments} maxRf={maxRf} />
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
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
        aria-label="Timeline legend"
      >
        <LegendItems hasTransitionSegments={hasTransitionSegments} maxRf={maxRf} />
      </PopoverContent>
    </Popover>
  );
}

function LegendItems({ hasTransitionSegments, maxRf }) {
  return (
    <>
      {hasTransitionSegments && (
        <>
          <LegendItem swatchClassName="h-2 w-4 rounded-sm bg-data-mark" label="RF change">
            <span className="font-normal tabular-nums">(max {maxRf.toFixed(2)})</span>
          </LegendItem>
          <LegendItem
            swatchClassName="size-2 rounded-full bg-data-mark-strong"
            label="SPR move"
            title="one dot per move (size = taxa moved); merged per transition (size = moves) when zoomed out"
          />
          <LegendItem
            swatchClassName="w-5 border-t-2 border-dashed border-data-mark"
            label="Branch lengths only"
          />
        </>
      )}
      <LegendItem swatchClassName="h-1.5 w-px bg-data-mark" label="Input tree" />
      {/* The ink bar in its bracket: the colours TimelineView reads from the same tokens */}
      <LegendItem
        swatchClassName="h-[11px] w-5 border-2 border-t-0 border-primary bg-primary bg-clip-content pb-[2px]"
        label="Selected"
        title="dark, with a bracket under it"
      />
      {/* The strip's playhead; drag its knob (the top) to scrub */}
      <LegendItem swatchClassName="h-3 w-0.5 bg-signal" label="Playhead" />
    </>
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
