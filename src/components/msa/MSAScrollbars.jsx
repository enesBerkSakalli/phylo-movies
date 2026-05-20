import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useMSA } from './useMSA.js';
import { MSA_VIEWER_CONSTANTS } from '../../msaViewer/config.js';
import {
  calculateScrollbarGeometry,
  getKeyboardScrollTarget,
  getTrackClickTarget,
} from './scrollbarUtils.js';

/**
 * Custom scrollbar overlays that show viewport position within the MSA alignment
 * and allow clicking/dragging to control the DeckGL view state.
 */
export function MSAScrollbars({ layoutMetrics = null }) {
  const { processedData, visibleRange, scrollToPosition } = useMSA();

  const [isDraggingH, setIsDraggingH] = useState(false);
  const [isDraggingV, setIsDraggingV] = useState(false);
  const hTrackRef = useRef(null);
  const vTrackRef = useRef(null);
  const activeDragCleanupRef = useRef(null);
  const labelsWidth = layoutMetrics?.labelsWidth ?? MSA_VIEWER_CONSTANTS.DEFAULT_LABELS_WIDTH;
  const axisHeight = layoutMetrics?.axisHeight ?? MSA_VIEWER_CONSTANTS.AXIS_HEIGHT;

  useEffect(() => () => {
    activeDragCleanupRef.current?.();
  }, []);

  const { rows, cols, r0, r1, c0, c1, hThumbWidth, hThumbLeft, vThumbHeight, vThumbTop } = useMemo(() => {
    return calculateScrollbarGeometry({
      rows: processedData?.rows ?? 0,
      cols: processedData?.cols ?? 0,
      visibleRange,
    });
  }, [processedData, visibleRange]);

  // Handle horizontal track click
  const handleHTrackClick = useCallback((e) => {
    if (!hTrackRef.current || !scrollToPosition || !cols) return;
    const rect = hTrackRef.current.getBoundingClientRect();
    const targetCol = getTrackClickTarget({
      pointerClientPosition: e.clientX,
      trackStart: rect.left,
      trackSize: rect.width,
      itemCount: cols,
    });
    scrollToPosition({ col: targetCol });
  }, [cols, scrollToPosition]);

  // Handle vertical track click
  const handleVTrackClick = useCallback((e) => {
    if (!vTrackRef.current || !scrollToPosition || !rows) return;
    const rect = vTrackRef.current.getBoundingClientRect();
    const targetRow = getTrackClickTarget({
      pointerClientPosition: e.clientY,
      trackStart: rect.top,
      trackSize: rect.height,
      itemCount: rows,
    });
    scrollToPosition({ row: targetRow });
  }, [rows, scrollToPosition]);

  const handleHKeyDown = useCallback((e) => {
    if (!scrollToPosition || !cols) return;

    const targetCol = getKeyboardScrollTarget({
      axis: 'horizontal',
      key: e.key,
      rangeStart: c0,
      rangeEnd: c1,
      itemCount: cols,
    });
    if (targetCol === null) return;

    e.preventDefault();
    scrollToPosition({ col: targetCol });
  }, [c0, c1, cols, scrollToPosition]);

  const handleVKeyDown = useCallback((e) => {
    if (!scrollToPosition || !rows) return;

    const targetRow = getKeyboardScrollTarget({
      axis: 'vertical',
      key: e.key,
      rangeStart: r0,
      rangeEnd: r1,
      itemCount: rows,
    });
    if (targetRow === null) return;

    e.preventDefault();
    scrollToPosition({ row: targetRow });
  }, [r0, r1, rows, scrollToPosition]);

  // Handle horizontal thumb drag
  const handleHThumbDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingH(true);

    const track = hTrackRef.current;
    if (!track) return;

    e.currentTarget?.setPointerCapture?.(e.pointerId);

    const onPointerMove = (moveEvent) => {
      const rect = track.getBoundingClientRect();
      const targetCol = getTrackClickTarget({
        pointerClientPosition: moveEvent.clientX,
        trackStart: rect.left,
        trackSize: rect.width,
        itemCount: cols,
      });
      scrollToPosition?.({ col: targetCol });
    };

    const onPointerUp = () => {
      setIsDraggingH(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      if (activeDragCleanupRef.current === onPointerUp) {
        activeDragCleanupRef.current = null;
      }
    };

    activeDragCleanupRef.current?.();
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    activeDragCleanupRef.current = onPointerUp;
  }, [cols, scrollToPosition]);

  // Handle vertical thumb drag
  const handleVThumbDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingV(true);

    const track = vTrackRef.current;
    if (!track) return;

    e.currentTarget?.setPointerCapture?.(e.pointerId);

    const onPointerMove = (moveEvent) => {
      const rect = track.getBoundingClientRect();
      const targetRow = getTrackClickTarget({
        pointerClientPosition: moveEvent.clientY,
        trackStart: rect.top,
        trackSize: rect.height,
        itemCount: rows,
      });
      scrollToPosition?.({ row: targetRow });
    };

    const onPointerUp = () => {
      setIsDraggingV(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      if (activeDragCleanupRef.current === onPointerUp) {
        activeDragCleanupRef.current = null;
      }
    };

    activeDragCleanupRef.current?.();
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    activeDragCleanupRef.current = onPointerUp;
  }, [rows, scrollToPosition]);

  // Early return AFTER all hooks have been called
  if (!processedData || !visibleRange) return null;

  return (
    <>
      {/* Horizontal Scrollbar - Bottom */}
      <div
        ref={hTrackRef}
        className="absolute bottom-0 left-0 right-3 h-3 bg-muted/50 backdrop-blur-sm cursor-pointer z-20 border-t border-border"
        onClick={handleHTrackClick}
        style={{ marginLeft: `${labelsWidth}px` }}
        aria-label="Horizontal scroll track"
        role="scrollbar"
        aria-orientation="horizontal"
        aria-valuenow={c0}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, cols - 1)}
        tabIndex={0}
        onKeyDown={handleHKeyDown}
      >
        <div
          className={`absolute top-1 bottom-1 rounded-md transition-colors ${
            isDraggingH ? 'bg-primary/80' : 'bg-primary/50 hover:bg-primary/70'
          }`}
          style={{
            left: `${hThumbLeft}%`,
            width: `${hThumbWidth}%`,
            minWidth: '24px',
          }}
          onPointerDown={handleHThumbDrag}
          onClick={(e) => e.stopPropagation()}
          aria-label="Horizontal scroll thumb"
        />
      </div>

      {/* Vertical Scrollbar - Right */}
      <div
        ref={vTrackRef}
        className="absolute top-0 right-0 bottom-3 w-3 bg-muted/50 backdrop-blur-sm cursor-pointer z-20 border-l border-border"
        onClick={handleVTrackClick}
        style={{ marginTop: `${axisHeight}px` }}
        aria-label="Vertical scroll track"
        role="scrollbar"
        aria-orientation="vertical"
        aria-valuenow={r0}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, rows - 1)}
        tabIndex={0}
        onKeyDown={handleVKeyDown}
      >
        <div
          className={`absolute left-0.5 right-0.5 rounded-md transition-colors ${
            isDraggingV ? 'bg-primary/80' : 'bg-primary/50 hover:bg-primary/70'
          }`}
          style={{
            top: `${vThumbTop}%`,
            height: `${vThumbHeight}%`,
            minHeight: '24px',
          }}
          onPointerDown={handleVThumbDrag}
          onClick={(e) => e.stopPropagation()}
          aria-label="Vertical scroll thumb"
        />
      </div>

      {/* Corner piece to fill gap between scrollbars */}
      <div
        className="absolute bottom-0 right-0 w-3 h-3 bg-muted/50 border-l border-t border-border z-20"
        aria-hidden="true"
      />
    </>
  );
}

export default MSAScrollbars;
