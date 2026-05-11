import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useMSA } from './MSAContext';
import { MSA_VIEWER_CONSTANTS } from '@/msaViewer/config.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

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

  // Memoize calculations - will return defaults if data not available
  const { rows, cols, r0, r1, c0, c1, hThumbWidth, hThumbLeft, vThumbHeight, vThumbTop } = useMemo(() => {
    if (!processedData || !visibleRange) {
      return { rows: 0, cols: 0, r0: 0, r1: 0, c0: 0, c1: 0, hThumbWidth: 0, hThumbLeft: 0, vThumbHeight: 0, vThumbTop: 0 };
    }

    const { rows, cols } = processedData;
    const { r0, r1, c0, c1 } = visibleRange;

    // Calculate thumb sizes and positions (as percentages)
    const visibleCols = c1 - c0 + 1;
    const visibleRows = r1 - r0 + 1;

    const hThumbWidth = Math.min(100, Math.max(10, (visibleCols / cols) * 100)); // min 10%
    const hThumbLeft = Math.min(100 - hThumbWidth, (c0 / cols) * 100);

    const vThumbHeight = Math.min(100, Math.max(10, (visibleRows / rows) * 100)); // min 10%
    const vThumbTop = Math.min(100 - vThumbHeight, (r0 / rows) * 100);

    return { rows, cols, r0, r1, c0, c1, hThumbWidth, hThumbLeft, vThumbHeight, vThumbTop };
  }, [processedData, visibleRange]);

  // Handle horizontal track click
  const handleHTrackClick = useCallback((e) => {
    if (!hTrackRef.current || !scrollToPosition || !cols) return;
    const rect = hTrackRef.current.getBoundingClientRect();
    const clickRatio = (e.clientX - rect.left) / rect.width;
    const targetCol = clamp(Math.floor(clickRatio * cols), 0, cols - 1);
    scrollToPosition({ col: targetCol });
  }, [cols, scrollToPosition]);

  // Handle vertical track click
  const handleVTrackClick = useCallback((e) => {
    if (!vTrackRef.current || !scrollToPosition || !rows) return;
    const rect = vTrackRef.current.getBoundingClientRect();
    const clickRatio = (e.clientY - rect.top) / rect.height;
    const targetRow = clamp(Math.floor(clickRatio * rows), 0, rows - 1);
    scrollToPosition({ row: targetRow });
  }, [rows, scrollToPosition]);

  const handleHKeyDown = useCallback((e) => {
    if (!scrollToPosition || !cols) return;

    const visibleCols = Math.max(1, c1 - c0 + 1);
    let targetCol = null;

    switch (e.key) {
      case 'ArrowLeft':
        targetCol = c0 - 1;
        break;
      case 'ArrowRight':
        targetCol = c0 + 1;
        break;
      case 'PageUp':
      case 'PageLeft':
        targetCol = c0 - visibleCols;
        break;
      case 'PageDown':
      case 'PageRight':
        targetCol = c0 + visibleCols;
        break;
      case 'Home':
        targetCol = 0;
        break;
      case 'End':
        targetCol = cols - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    scrollToPosition({ col: clamp(targetCol, 0, cols - 1) });
  }, [c0, c1, cols, scrollToPosition]);

  const handleVKeyDown = useCallback((e) => {
    if (!scrollToPosition || !rows) return;

    const visibleRows = Math.max(1, r1 - r0 + 1);
    let targetRow = null;

    switch (e.key) {
      case 'ArrowUp':
        targetRow = r0 - 1;
        break;
      case 'ArrowDown':
        targetRow = r0 + 1;
        break;
      case 'PageUp':
        targetRow = r0 - visibleRows;
        break;
      case 'PageDown':
        targetRow = r0 + visibleRows;
        break;
      case 'Home':
        targetRow = 0;
        break;
      case 'End':
        targetRow = rows - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    scrollToPosition({ row: clamp(targetRow, 0, rows - 1) });
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
      const ratio = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
      const targetCol = clamp(Math.floor(ratio * cols), 0, cols - 1);
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
      const ratio = Math.max(0, Math.min(1, (moveEvent.clientY - rect.top) / rect.height));
      const targetRow = clamp(Math.floor(ratio * rows), 0, rows - 1);
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
