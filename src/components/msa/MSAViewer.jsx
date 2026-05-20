import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Columns, GitBranch } from 'lucide-react';
import {
  selectMsaColumnCount,
  selectMsaStepSize,
  selectMsaWindowSize,
  selectSyncMsaEnabled,
  selectTimelineCursor,
  useAppStore,
} from '../../state/phyloStore/store.js';
import { AppTooltip } from '../ui/app-tooltip';
import { MSADeckGLViewer } from '../../msaViewer/MSADeckGLViewer';
import { useMSA } from './useMSA.js';
import { MSAScrollbars } from './MSAScrollbars';
import {
  buildMsaWindowStatus,
  buildMsaTreeStatus,
  formatMsaWindowStatusLabel,
  formatMsaWindowStatusTooltip,
  formatMsaTreeStatusLabel,
  formatMsaTreeStatusTooltip,
} from './msaViewportStatus.js';

export function MSAViewer() {
  const { processedData, msaRegion, msaPreviousRegion, showLetters, viewAction, colorScheme, setVisibleRange, rowColorMap, visibleRange, scrollAction } = useMSA();
  const syncMSAEnabled = useAppStore(selectSyncMsaEnabled);
  const timelineCursor = useAppStore(selectTimelineCursor);
  const msaStepSize = useAppStore(selectMsaStepSize);
  const msaWindowSize = useAppStore(selectMsaWindowSize);
  const msaColumnCount = useAppStore(selectMsaColumnCount);
  const windowStatus = buildMsaWindowStatus(timelineCursor, msaStepSize, msaWindowSize, msaColumnCount);
  const treeStatus = buildMsaTreeStatus(timelineCursor);
  const [layoutMetrics, setLayoutMetrics] = useState(null);
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const pendingRangeRef = useRef(null);
  const rangeFrameRef = useRef(null);
  const latestViewerInputsRef = useRef({
    showLetters,
    colorScheme,
    rowColorMap,
    setVisibleRange,
    msaRegion,
    msaPreviousRegion,
    syncMSAEnabled,
  });

  useEffect(() => {
    latestViewerInputsRef.current = {
      showLetters,
      colorScheme,
      rowColorMap,
      setVisibleRange,
      msaRegion,
      msaPreviousRegion,
      syncMSAEnabled,
    };
  }, [
    showLetters,
    colorScheme,
    rowColorMap,
    setVisibleRange,
    msaRegion,
    msaPreviousRegion,
    syncMSAEnabled,
  ]);

  // Handle view actions (zoom/reset)
  useEffect(() => {
    if (!viewAction || !viewerRef.current) return;

    switch (viewAction.action) {
      case 'ZOOM_IN':
        viewerRef.current.zoomIn();
        break;
      case 'ZOOM_OUT':
        viewerRef.current.zoomOut();
        break;
      case 'RESET':
        viewerRef.current.resetView();
        break;
      default:
        break;
    }
  }, [viewAction]);

  // Handle scroll actions from scrollbar overlays
  useEffect(() => {
    if (!scrollAction || !viewerRef.current) return;

    const { row, col } = scrollAction;
    viewerRef.current.scrollTo({ row, col });
  }, [scrollAction]);

  // Keep viewer in sync with external region updates
  useEffect(() => {
    if (msaRegion) {
      if (viewerRef.current) {
        viewerRef.current.setRegion(msaRegion.start, msaRegion.end);

        if (syncMSAEnabled) {
          viewerRef.current.scrollToRegion(msaRegion.start, msaRegion.end, { align: 'center' });
        }
      }
    } else {
      viewerRef.current?.clearRegion();
    }
  }, [msaRegion, syncMSAEnabled]);

  // Keep viewer in sync with previous region updates
  useEffect(() => {
    if (msaPreviousRegion) {
      if (viewerRef.current) {
        viewerRef.current.setPreviousRegion(msaPreviousRegion.start, msaPreviousRegion.end);
      }
    } else {
      viewerRef.current?.clearPreviousRegion();
    }
  }, [msaPreviousRegion]);

  // Initialize DeckGL viewer once
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return undefined;

    const { showLetters, colorScheme, rowColorMap } = latestViewerInputsRef.current;
    const viewer = new MSADeckGLViewer(containerRef.current, { showLetters, colorScheme, rowColorMap });
    viewerRef.current = viewer;

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
            if (pendingRange) {
              latestViewerInputsRef.current.setVisibleRange(pendingRange);
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
      viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  // Load/refresh data into existing viewer
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (!processedData) {
      if (rangeFrameRef.current !== null) {
        cancelAnimationFrame(rangeFrameRef.current);
        rangeFrameRef.current = null;
      }
      pendingRangeRef.current = null;
      viewer.clearData();
      latestViewerInputsRef.current.setVisibleRange(null);
      setLayoutMetrics(null);
      return;
    }
    // Use preprocessed data to avoid re-parsing and keep order intact
    viewer.loadFromProcessedData(processedData);
    const { msaRegion, msaPreviousRegion, syncMSAEnabled } = latestViewerInputsRef.current;
    if (msaRegion) {
      viewer.setRegion(msaRegion.start, msaRegion.end);
      if (syncMSAEnabled) {
        viewer.scrollToRegion(msaRegion.start, msaRegion.end, { align: 'center' });
      }
    } else {
      viewer.clearRegion();
    }
    if (msaPreviousRegion) {
      viewer.setPreviousRegion(msaPreviousRegion.start, msaPreviousRegion.end);
    } else {
      viewer.clearPreviousRegion();
    }
  }, [processedData]);

  // Toggle letters without recreating viewer
  useEffect(() => {
    const viewer = viewerRef.current;
    if (viewer) {
      viewer.setShowLetters(showLetters);
      viewer.render?.();
    }
  }, [showLetters]);

  // Update color scheme
  useEffect(() => {
    const viewer = viewerRef.current;
    if (viewer) {
      viewer.setColorScheme(colorScheme);
    }
  }, [colorScheme]);

  // Update row label colors (group/taxon colors)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (viewer) {
      viewer.setRowColorMap(rowColorMap);
    }
  }, [rowColorMap]);

  return (
    <div className="msa-rnd-body relative flex-1 min-h-0 bg-background" ref={containerRef}>
      {visibleRange && Number.isFinite(visibleRange.r0) && Number.isFinite(visibleRange.c0) && (
        <div className="absolute left-3 top-3 z-10 rounded-md border border-border/60 bg-background/85 px-3 py-2 text-[11px] text-foreground shadow-md backdrop-blur-sm tabular-nums">
          <div className="flex items-center gap-2">
            <span>Rows: {visibleRange.r0 + 1}-{visibleRange.r1 + 1}</span>
            <span className="text-muted-foreground/60">|</span>
            <span>Cols: {visibleRange.c0 + 1}-{visibleRange.c1 + 1}</span>
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
          </div>
        </div>
      )}
      <MSAScrollbars layoutMetrics={layoutMetrics} />
    </div>
  );
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
  const targetLabel = status.targetInputTreeIndex === null
    ? null
    : String(status.targetInputTreeIndex + 1);

  return (
    <AppTooltip content={tooltip} contentClassName="text-2xs">
      <span
        className="inline-flex w-[7rem] shrink-0 items-center justify-center gap-1 rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-primary"
        aria-label={`${tooltip}; ${label}`}
      >
        <GitBranch className="size-3.5 shrink-0" aria-hidden />
        <span className="min-w-[1.25rem] shrink-0 text-center font-semibold leading-none">{sourceLabel}</span>
        {status.kind === 'transition' && (
          <>
            <ArrowRight className="size-3 shrink-0 text-muted-foreground" aria-hidden />
            <GitBranch className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-[1.25rem] shrink-0 text-center font-semibold leading-none text-muted-foreground">{targetLabel}</span>
          </>
        )}
      </span>
    </AppTooltip>
  );
}
