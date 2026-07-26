import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Columns, GitBranch, Maximize2, Minimize2 } from 'lucide-react';
import {
  selectMsaColumnCount,
  selectMsaStepSize,
  selectMsaWindowSize,
  selectSyncMsaEnabled,
  selectTimelineCursor,
  useAppStore,
} from '../../state/phyloStore/store.js';
import { AppTooltip } from '../ui/app-tooltip';
import { Button } from '../ui/button';
import { MSADeckGLViewer } from '../../msaViewer/MSADeckGLViewer';
import { useMSA, useMSAViewport, useSetMSAVisibleRange } from './useMSA.js';
import { MSAScrollbars } from './MSAScrollbars';
import {
  buildMsaWindowOverlapStatus,
  buildMsaWindowStatus,
  buildMsaTreeStatus,
  formatMsaWindowOverlapLabel,
  formatMsaWindowOverlapTooltip,
  formatMsaWindowStatusLabel,
  formatMsaWindowStatusTooltip,
  formatMsaTreeStatusLabel,
  formatMsaTreeStatusTooltip,
} from './msaViewportStatus.js';

function rangesEqual(left, right) {
  if (left === right) return true;
  return Boolean(
    left &&
    right &&
    left.r0 === right.r0 &&
    left.r1 === right.r1 &&
    left.c0 === right.c0 &&
    left.c1 === right.c1
  );
}

export function MSAViewer() {
  const {
    processedData,
    msaRegion,
    msaPreviousRegion,
    showLetters,
    colorScheme,
    rowColorMap,
    connectViewerCommands,
  } = useMSA();
  const setVisibleRange = useSetMSAVisibleRange();
  const syncMSAEnabled = useAppStore(selectSyncMsaEnabled);
  const [layoutMetrics, setLayoutMetrics] = useState(null);
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const pendingRangeRef = useRef(null);
  const publishedRangeRef = useRef(null);
  const rangeFrameRef = useRef(null);
  const setVisibleRangeRef = useRef(setVisibleRange);

  useEffect(() => {
    setVisibleRangeRef.current = setVisibleRange;
  }, [setVisibleRange]);

  // Initialize DeckGL viewer once
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return undefined;

    const viewer = new MSADeckGLViewer(containerRef.current);
    viewerRef.current = viewer;
    const disconnectViewerCommands = connectViewerCommands({
      zoomIn: () => viewer.zoomIn(),
      zoomOut: () => viewer.zoomOut(),
      fitAlignment: () => viewer.fitAlignment(),
      centerViewportOn: (position) => viewer.centerViewportOn(position),
    });

    viewer.onViewStateChange = ({ range, layoutMetrics }) => {
      if (layoutMetrics) {
        setLayoutMetrics((current) => {
          if (
            current?.labelsWidth === layoutMetrics.labelsWidth &&
            current?.axisHeight === layoutMetrics.axisHeight
          ) {
            return current;
          }
          return layoutMetrics;
        });
      }
      if (range) {
        pendingRangeRef.current = range;
        if (rangeFrameRef.current === null) {
          rangeFrameRef.current = requestAnimationFrame(() => {
            rangeFrameRef.current = null;
            const pendingRange = pendingRangeRef.current;
            pendingRangeRef.current = null;
            if (pendingRange && !rangesEqual(publishedRangeRef.current, pendingRange)) {
              publishedRangeRef.current = pendingRange;
              setVisibleRangeRef.current(pendingRange);
            }
          });
        }
      }
    };

    return () => {
      if (rangeFrameRef.current !== null) {
        cancelAnimationFrame(rangeFrameRef.current);
        rangeFrameRef.current = null;
      }
      pendingRangeRef.current = null;
      publishedRangeRef.current = null;
      disconnectViewerCommands();
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [connectViewerCommands]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    viewer.update({
      data: processedData,
      currentRegion: msaRegion,
      previousRegion: msaPreviousRegion,
      showLetters,
      colorScheme,
      rowColorMap,
    });

    if (!processedData) {
      if (rangeFrameRef.current !== null) {
        cancelAnimationFrame(rangeFrameRef.current);
        rangeFrameRef.current = null;
      }
      pendingRangeRef.current = null;
      publishedRangeRef.current = null;
      setVisibleRangeRef.current(null);
      setLayoutMetrics(null);
    }
  }, [colorScheme, msaPreviousRegion, msaRegion, processedData, rowColorMap, showLetters]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (viewer && processedData && syncMSAEnabled && msaRegion) {
      viewer.centerRegion(msaRegion.start, msaRegion.end);
    }
  }, [msaRegion, processedData, syncMSAEnabled]);

  return (
    <div className="msa-rnd-body relative flex-1 min-h-0 bg-background" ref={containerRef}>
      <MSAStatusOverlay />
      <MSAScrollbars layoutMetrics={layoutMetrics} />
    </div>
  );
}

function MSAStatusOverlay() {
  const { visibleRange } = useMSAViewport();
  const timelineCursor = useAppStore(selectTimelineCursor);
  const msaStepSize = useAppStore(selectMsaStepSize);
  const msaWindowSize = useAppStore(selectMsaWindowSize);
  const msaColumnCount = useAppStore(selectMsaColumnCount);
  const [statusClipped, setStatusClipped] = useState(false);

  if (!visibleRange || !Number.isFinite(visibleRange.r0) || !Number.isFinite(visibleRange.c0)) {
    return null;
  }

  const windowStatus = buildMsaWindowStatus(
    timelineCursor,
    msaStepSize,
    msaWindowSize,
    msaColumnCount
  );
  const overlapStatus = buildMsaWindowOverlapStatus(
    timelineCursor,
    msaStepSize,
    msaWindowSize,
    msaColumnCount
  );
  const treeStatus = buildMsaTreeStatus(timelineCursor);

  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex justify-end">
      {statusClipped ? (
        <MSAStatusClipButton clipped onToggle={() => setStatusClipped(false)} />
      ) : (
        <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-end gap-1.5 rounded-md border border-border/60 bg-background/85 px-2 py-1.5 text-[11px] text-foreground shadow-md backdrop-blur-sm tabular-nums">
          <span>
            Rows: {visibleRange.r0 + 1}-{visibleRange.r1 + 1}
          </span>
          <span className="text-muted-foreground/60">|</span>
          <span>
            Cols: {visibleRange.c0 + 1}-{visibleRange.c1 + 1}
          </span>
          {windowStatus && (
            <>
              <span className="text-muted-foreground/60">|</span>
              <MSAWindowStatus status={windowStatus} />
            </>
          )}
          {treeStatus && (
            <>
              <span className="text-muted-foreground/60">|</span>
              <MSATreeStatus status={treeStatus} />
            </>
          )}
          {overlapStatus && (
            <>
              <span className="text-muted-foreground/60">|</span>
              <MSAWindowOverlapStatus status={overlapStatus} />
            </>
          )}
          <MSAStatusClipButton clipped={false} onToggle={() => setStatusClipped(true)} />
        </div>
      )}
    </div>
  );
}

function MSAStatusClipButton({ clipped, onToggle }) {
  const Icon = clipped ? Maximize2 : Minimize2;
  const label = clipped ? 'Show alignment status overlay' : 'Clip alignment status overlay';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={clipped}
      title={label}
      className="pointer-events-auto size-6 border border-border/50 bg-background/85 text-muted-foreground shadow-sm backdrop-blur-sm hover:bg-background hover:text-foreground"
    >
      <Icon className="size-3.5" aria-hidden />
    </Button>
  );
}

function MSAWindowOverlapStatus({ status }) {
  const tooltip = formatMsaWindowOverlapTooltip(status);
  const label = formatMsaWindowOverlapLabel(status);
  const tooltipContent = (
    <div className="flex flex-col gap-2 text-muted-foreground">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium text-foreground">{label}</span>
        <span>
          source W{status.sourceWindowIndex + 1} {status.source.startPosition}-
          {status.source.endPosition}
        </span>
        <span>
          target W{status.targetWindowIndex + 1} {status.target.startPosition}-
          {status.target.endPosition}
        </span>
      </div>
      <MSAWindowOverlapTrack status={status} />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
        <OverlapLegendItem className="bg-amber-500/45" label="leaving" />
        <OverlapLegendItem className="bg-primary/35" label="shared" />
        <OverlapLegendItem className="bg-emerald-500/45" label="entering" />
      </div>
    </div>
  );

  return (
    <AppTooltip
      content={tooltipContent}
      side="bottom"
      contentClassName="border border-border/60 bg-popover p-2 text-2xs text-popover-foreground shadow-lg"
    >
      <span
        className="inline-flex shrink-0 items-center rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-semibold leading-none text-primary"
        aria-label={`${tooltip}; ${label}`}
        tabIndex={0}
      >
        {label}
      </span>
    </AppTooltip>
  );
}

function MSAWindowOverlapTrack({ status }) {
  return (
    <div
      className="grid w-[24rem] max-w-[70vw] shrink-0 grid-cols-[4.75rem_minmax(14rem,1fr)] gap-x-2 gap-y-1"
      aria-hidden
    >
      <span className="self-center text-[10px] font-semibold uppercase leading-none text-sky-700 dark:text-sky-300">
        Source W{status.sourceWindowIndex + 1}
      </span>
      <div className="relative row-span-2 h-10">
        {status.overlap && (
          <div
            className="absolute inset-y-0 z-0 rounded-sm border-x border-primary/70 bg-primary/10"
            style={getOverlapTrackStyle(status.overlap, status)}
          />
        )}
        <div className="absolute left-0 right-0 top-1 z-10 h-3 rounded-sm bg-muted/70" />
        <div className="absolute left-0 right-0 bottom-1 z-10 h-3 rounded-sm bg-muted/70" />
        <div
          className="absolute top-1 z-20 h-3 rounded-sm border border-sky-500/70 bg-sky-500/15"
          style={getOverlapTrackStyle(status.source, status)}
        />
        <div
          className="absolute bottom-1 z-20 h-3 rounded-sm border border-emerald-500/70 bg-emerald-500/15"
          style={getOverlapTrackStyle(status.target, status)}
        />
        {status.leavingRanges.map((range) => (
          <div
            key={`leaving-${range.startPosition}-${range.endPosition}`}
            className="absolute top-1 z-30 h-3 rounded-sm bg-amber-500/45"
            style={getOverlapTrackStyle(range, status)}
          />
        ))}
        {status.enteringRanges.map((range) => (
          <div
            key={`entering-${range.startPosition}-${range.endPosition}`}
            className="absolute bottom-1 z-30 h-3 rounded-sm bg-emerald-500/45"
            style={getOverlapTrackStyle(range, status)}
          />
        ))}
        {status.overlap && (
          <>
            <div
              className="absolute top-1 z-40 h-3 rounded-sm border border-primary/70 bg-primary/35"
              style={getOverlapTrackStyle(status.overlap, status)}
            />
            <div
              className="absolute bottom-1 z-40 h-3 rounded-sm border border-primary/70 bg-primary/35"
              style={getOverlapTrackStyle(status.overlap, status)}
            />
          </>
        )}
      </div>
      <span className="self-center text-[10px] font-semibold uppercase leading-none text-emerald-700 dark:text-emerald-300">
        Target W{status.targetWindowIndex + 1}
      </span>
    </div>
  );
}

function OverlapLegendItem({ className, label }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-2 w-3 rounded-sm ${className}`} aria-hidden />
      <span>{label}</span>
    </span>
  );
}

function getOverlapTrackStyle(range, status) {
  const totalColumns = Math.max(1, status.totalEndPosition - status.totalStartPosition + 1);
  return {
    left: `${((range.startPosition - status.totalStartPosition) / totalColumns) * 100}%`,
    width: `${((range.endPosition - range.startPosition + 1) / totalColumns) * 100}%`,
  };
}

function MSAWindowStatus({ status }) {
  const tooltip = formatMsaWindowStatusTooltip(status);
  const label = formatMsaWindowStatusLabel(status);

  return (
    <AppTooltip content={tooltip} contentClassName="text-2xs">
      <span
        className="inline-flex w-[7.5rem] shrink-0 items-center justify-center gap-1 rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-primary"
        aria-label={`${tooltip}; ${label}`}
      >
        <Columns className="size-3.5 shrink-0" aria-hidden />
        <span className="shrink-0 text-center font-semibold leading-none">{label}</span>
      </span>
    </AppTooltip>
  );
}

function MSATreeStatus({ status }) {
  const tooltip = formatMsaTreeStatusTooltip(status);
  const label = formatMsaTreeStatusLabel(status);
  const sourceLabel = String(status.sourceInputTreeIndex + 1);
  const targetLabel =
    status.targetInputTreeIndex === null ? null : String(status.targetInputTreeIndex + 1);

  return (
    <AppTooltip content={tooltip} contentClassName="text-2xs">
      <span
        className="inline-flex w-[7rem] shrink-0 items-center justify-center gap-1 rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-primary"
        aria-label={`${tooltip}; ${label}`}
      >
        <GitBranch className="size-3 shrink-0" aria-hidden />
        <span className="min-w-[1.25rem] shrink-0 text-center font-semibold leading-none">
          {sourceLabel}
        </span>
        {status.kind === 'transition' && (
          <>
            <ArrowRight className="size-3 shrink-0 text-muted-foreground" aria-hidden />
            <GitBranch className="size-3 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-[1.25rem] shrink-0 text-center font-semibold leading-none text-muted-foreground">
              {targetLabel}
            </span>
          </>
        )}
      </span>
    </AppTooltip>
  );
}
