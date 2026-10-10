import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useMSA, useMSAViewport } from './useMSA.js';
import { MSA_VIEWER_CONSTANTS } from '../../msaViewer/config.js';
import {
  calculateScrollbarGeometry,
  getKeyboardScrollTarget,
  getTrackClickTarget,
} from './scrollbarUtils.js';

/**
 * Starts a pointer-capture drag on a scrollbar thumb: tracks pointer moves
 * against the track's bounds along one axis, calling `centerViewportOn` with
 * the resolved item index, until the owning pointer ends or capture is lost.
 */
function startThumbDrag({
  event,
  trackRef,
  itemCount,
  setDragging,
  activeDragCleanupRef,
  getClientPosition,
  getTrackBounds,
  centerViewportOn,
  axisKey,
}) {
  if (event.button !== 0 || activeDragCleanupRef.current) return;
  const track = trackRef.current;
  if (!track) return;

  event.preventDefault();
  event.stopPropagation();
  setDragging(true);
  const thumb = event.currentTarget;
  const pointerId = event.pointerId;
  const ownerWindow = track.ownerDocument.defaultView;

  const onPointerMove = (moveEvent) => {
    if (moveEvent.pointerId !== pointerId) return;
    const { trackStart, trackSize } = getTrackBounds(track.getBoundingClientRect());
    const target = getTrackClickTarget({
      pointerClientPosition: getClientPosition(moveEvent),
      trackStart,
      trackSize,
      itemCount,
    });
    centerViewportOn({ [axisKey]: target });
  };

  const cleanup = () => {
    if (activeDragCleanupRef.current !== cleanup) return;
    activeDragCleanupRef.current = null;
    setDragging(false);
    ownerWindow.removeEventListener('pointermove', onPointerMove);
    ownerWindow.removeEventListener('pointerup', onPointerEnd);
    ownerWindow.removeEventListener('pointercancel', onPointerEnd);
    ownerWindow.removeEventListener('blur', cleanup);
    thumb.removeEventListener('lostpointercapture', onPointerEnd);
    if (thumb.hasPointerCapture?.(pointerId)) {
      thumb.releasePointerCapture(pointerId);
    }
  };
  function onPointerEnd(endEvent) {
    if (endEvent.pointerId === pointerId) cleanup();
  }

  activeDragCleanupRef.current = cleanup;
  ownerWindow.addEventListener('pointermove', onPointerMove);
  ownerWindow.addEventListener('pointerup', onPointerEnd);
  ownerWindow.addEventListener('pointercancel', onPointerEnd);
  ownerWindow.addEventListener('blur', cleanup);
  thumb.addEventListener('lostpointercapture', onPointerEnd);
  try {
    thumb.setPointerCapture?.(pointerId);
  } catch {
    cleanup();
  }
}

/**
 * Custom scrollbar overlays that show viewport position within the MSA alignment
 * and allow clicking/dragging to control the DeckGL view state.
 */
export function MSAScrollbars({ layoutMetrics = null, viewportId }) {
  const { processedData, centerViewportOn } = useMSA();
  const { visibleRange } = useMSAViewport();

  const [isDraggingH, setIsDraggingH] = useState(false);
  const [isDraggingV, setIsDraggingV] = useState(false);
  const hTrackRef = useRef(null);
  const vTrackRef = useRef(null);
  const activeDragCleanupRef = useRef(null);
  const labelsWidth = layoutMetrics?.labelsWidth ?? MSA_VIEWER_CONSTANTS.DEFAULT_LABELS_WIDTH;
  const axisHeight = layoutMetrics?.axisHeight ?? MSA_VIEWER_CONSTANTS.AXIS_HEIGHT;

  useEffect(
    () => () => {
      activeDragCleanupRef.current?.();
    },
    []
  );

  const { rows, cols, r0, r1, c0, c1, hThumbWidth, hThumbLeft, vThumbHeight, vThumbTop } =
    useMemo(() => {
      return calculateScrollbarGeometry({
        rows: processedData?.rows ?? 0,
        cols: processedData?.cols ?? 0,
        visibleRange,
      });
    }, [processedData, visibleRange]);

  // Handle horizontal track click
  const handleHTrackClick = useCallback(
    (e) => {
      if (!hTrackRef.current || !cols) return;
      const rect = hTrackRef.current.getBoundingClientRect();
      const targetCol = getTrackClickTarget({
        pointerClientPosition: e.clientX,
        trackStart: rect.left,
        trackSize: rect.width,
        itemCount: cols,
      });
      centerViewportOn({ column: targetCol });
    },
    [centerViewportOn, cols]
  );

  // Handle vertical track click
  const handleVTrackClick = useCallback(
    (e) => {
      if (!vTrackRef.current || !rows) return;
      const rect = vTrackRef.current.getBoundingClientRect();
      const targetRow = getTrackClickTarget({
        pointerClientPosition: e.clientY,
        trackStart: rect.top,
        trackSize: rect.height,
        itemCount: rows,
      });
      centerViewportOn({ row: targetRow });
    },
    [centerViewportOn, rows]
  );

  const handleHKeyDown = useCallback(
    (e) => {
      if (!cols) return;

      const targetCol = getKeyboardScrollTarget({
        axis: 'horizontal',
        key: e.key,
        rangeStart: c0,
        rangeEnd: c1,
        itemCount: cols,
      });
      if (targetCol === null) return;

      e.preventDefault();
      centerViewportOn({ column: targetCol });
    },
    [c0, c1, centerViewportOn, cols]
  );

  const handleVKeyDown = useCallback(
    (e) => {
      if (!rows) return;

      const targetRow = getKeyboardScrollTarget({
        axis: 'vertical',
        key: e.key,
        rangeStart: r0,
        rangeEnd: r1,
        itemCount: rows,
      });
      if (targetRow === null) return;

      e.preventDefault();
      centerViewportOn({ row: targetRow });
    },
    [centerViewportOn, r0, r1, rows]
  );

  // Handle horizontal thumb drag
  const handleHThumbDrag = useCallback(
    (e) => {
      startThumbDrag({
        event: e,
        trackRef: hTrackRef,
        itemCount: cols,
        setDragging: setIsDraggingH,
        activeDragCleanupRef,
        getClientPosition: (moveEvent) => moveEvent.clientX,
        getTrackBounds: (rect) => ({ trackStart: rect.left, trackSize: rect.width }),
        centerViewportOn,
        axisKey: 'column',
      });
    },
    [centerViewportOn, cols]
  );

  // Handle vertical thumb drag
  const handleVThumbDrag = useCallback(
    (e) => {
      startThumbDrag({
        event: e,
        trackRef: vTrackRef,
        itemCount: rows,
        setDragging: setIsDraggingV,
        activeDragCleanupRef,
        getClientPosition: (moveEvent) => moveEvent.clientY,
        getTrackBounds: (rect) => ({ trackStart: rect.top, trackSize: rect.height }),
        centerViewportOn,
        axisKey: 'row',
      });
    },
    [centerViewportOn, rows]
  );

  // Early return AFTER all hooks have been called
  if (!processedData || !visibleRange) return null;

  return (
    <>
      {/* Horizontal Scrollbar - Bottom */}
      <div
        ref={hTrackRef}
        className="msa-scroll-track msa-scroll-track-horizontal absolute bottom-0 left-0 bg-muted/50 cursor-pointer z-20 border-t border-border"
        onClick={handleHTrackClick}
        style={{ marginLeft: `${labelsWidth}px` }}
        aria-label="Horizontal scroll track"
        role="scrollbar"
        aria-controls={viewportId}
        aria-orientation="horizontal"
        aria-valuetext={`Columns ${c0 + 1} to ${c1 + 1} of ${cols}`}
        aria-valuenow={c0}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, cols - 1)}
        tabIndex={0}
        onKeyDown={handleHKeyDown}
      >
        <div
          className="msa-scroll-thumb absolute inset-y-0"
          data-dragging={isDraggingH}
          style={{
            left: `min(${hThumbLeft}%, calc(100% - max(${hThumbWidth}%, var(--msa-thumb-min-size))))`,
            width: `${hThumbWidth}%`,
          }}
          onPointerDown={handleHThumbDrag}
          onClick={(e) => e.stopPropagation()}
          aria-label="Horizontal scroll thumb"
        >
          <span className="msa-scroll-thumb-fill absolute rounded-md bg-primary/50" />
        </div>
      </div>

      {/* Vertical Scrollbar - Right */}
      <div
        ref={vTrackRef}
        className="msa-scroll-track msa-scroll-track-vertical absolute top-0 right-0 bg-muted/50 cursor-pointer z-20 border-l border-border"
        onClick={handleVTrackClick}
        style={{ marginTop: `${axisHeight}px` }}
        aria-label="Vertical scroll track"
        role="scrollbar"
        aria-controls={viewportId}
        aria-orientation="vertical"
        aria-valuetext={`Rows ${r0 + 1} to ${r1 + 1} of ${rows}`}
        aria-valuenow={r0}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, rows - 1)}
        tabIndex={0}
        onKeyDown={handleVKeyDown}
      >
        <div
          className="msa-scroll-thumb absolute inset-x-0"
          data-dragging={isDraggingV}
          style={{
            top: `min(${vThumbTop}%, calc(100% - max(${vThumbHeight}%, var(--msa-thumb-min-size))))`,
            height: `${vThumbHeight}%`,
          }}
          onPointerDown={handleVThumbDrag}
          onClick={(e) => e.stopPropagation()}
          aria-label="Vertical scroll thumb"
        >
          <span className="msa-scroll-thumb-fill absolute rounded-md bg-primary/50" />
        </div>
      </div>

      {/* Corner piece to fill gap between scrollbars */}
      <div
        className="msa-scroll-corner absolute bottom-0 right-0 bg-muted/50 border-l border-t border-border z-20"
        aria-hidden="true"
      />
    </>
  );
}
