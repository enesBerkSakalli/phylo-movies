import React, { useCallback, useRef, useState, useMemo } from 'react';
import { useMSA } from './MSAContext';

/**
 * Custom scrollbar overlays that show viewport position within the MSA alignment
 * and allow clicking/dragging to control the DeckGL view state.
 */
export function MSAScrollbars({ containerRef }) {
  const { processedData, visibleRange, scrollToPosition } = useMSA();

  const [isDraggingH, setIsDraggingH] = useState(false);
  const [isDraggingV, setIsDraggingV] = useState(false);
  const hTrackRef = useRef(null);
  const vTrackRef = useRef(null);

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

    const hThumbWidth = Math.max(10, (visibleCols / cols) * 100); // min 10%
    const hThumbLeft = (c0 / cols) * 100;

    const vThumbHeight = Math.max(10, (visibleRows / rows) * 100); // min 10%
    const vThumbTop = (r0 / rows) * 100;

    return { rows, cols, r0, r1, c0, c1, hThumbWidth, hThumbLeft, vThumbHeight, vThumbTop };
  }, [processedData, visibleRange]);

  // Handle horizontal track click
  const handleHTrackClick = useCallback((e) => {
    if (!hTrackRef.current || !scrollToPosition || !cols) return;
    const rect = hTrackRef.current.getBoundingClientRect();
    const clickRatio = (e.clientX - rect.left) / rect.width;
    const targetCol = Math.floor(clickRatio * cols);
    scrollToPosition({ col: targetCol });
  }, [cols, scrollToPosition]);

  // Handle vertical track click
  const handleVTrackClick = useCallback((e) => {
    if (!vTrackRef.current || !scrollToPosition || !rows) return;
    const rect = vTrackRef.current.getBoundingClientRect();
    const clickRatio = (e.clientY - rect.top) / rect.height;
    const targetRow = Math.floor(clickRatio * rows);
    scrollToPosition({ row: targetRow });
  }, [rows, scrollToPosition]);

  // Handle horizontal thumb drag
  const handleHThumbDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingH(true);

    const track = hTrackRef.current;
    if (!track) return;

    const onMouseMove = (moveEvent) => {
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
      const targetCol = Math.floor(ratio * cols);
      scrollToPosition?.({ col: targetCol });
    };

    const onMouseUp = () => {
      setIsDraggingH(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [cols, scrollToPosition]);

  // Handle vertical thumb drag
  const handleVThumbDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingV(true);

    const track = vTrackRef.current;
    if (!track) return;

    const onMouseMove = (moveEvent) => {
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (moveEvent.clientY - rect.top) / rect.height));
      const targetRow = Math.floor(ratio * rows);
      scrollToPosition?.({ row: targetRow });
    };

    const onMouseUp = () => {
      setIsDraggingV(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
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
        style={{ marginLeft: '140px' }} // Match LABELS_WIDTH
        aria-label="Horizontal scroll track"
        role="scrollbar"
        aria-orientation="horizontal"
        aria-valuenow={c0}
        aria-valuemin={0}
        aria-valuemax={cols}
      >
        <div
          className={`absolute top-0.5 bottom-0.5 rounded-full transition-colors ${
            isDraggingH ? 'bg-primary/80' : 'bg-primary/50 hover:bg-primary/70'
          }`}
          style={{
            left: `${hThumbLeft}%`,
            width: `${hThumbWidth}%`,
            minWidth: '24px',
          }}
          onMouseDown={handleHThumbDrag}
          aria-label="Horizontal scroll thumb"
        />
      </div>

      {/* Vertical Scrollbar - Right */}
      <div
        ref={vTrackRef}
        className="absolute top-0 right-0 bottom-3 w-3 bg-muted/50 backdrop-blur-sm cursor-pointer z-20 border-l border-border"
        onClick={handleVTrackClick}
        style={{ marginTop: '28px' }} // Match AXIS_HEIGHT
        aria-label="Vertical scroll track"
        role="scrollbar"
        aria-orientation="vertical"
        aria-valuenow={r0}
        aria-valuemin={0}
        aria-valuemax={rows}
      >
        <div
          className={`absolute left-0.5 right-0.5 rounded-full transition-colors ${
            isDraggingV ? 'bg-primary/80' : 'bg-primary/50 hover:bg-primary/70'
          }`}
          style={{
            top: `${vThumbTop}%`,
            height: `${vThumbHeight}%`,
            minHeight: '24px',
          }}
          onMouseDown={handleVThumbDrag}
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
