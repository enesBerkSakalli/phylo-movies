import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import { useAppStore } from '../../../js/core/store.js';
import { MSADeckGLViewer } from '../../../js/msaViewer/MSADeckGLViewer.js';
import { processPhyloData } from '../../../js/msaViewer/utils/dataUtils.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X, Columns } from 'lucide-react';

const clampPositive = (value) => Math.max(1, Math.round(Number(value) || 1));

export function MsaRndWindow() {
  const isOpen = useAppStore((s) => s.isMsaViewerOpen);
  const msaWindow = useAppStore((s) => s.msaWindow);
  const setMsaWindow = useAppStore((s) => s.setMsaWindow);
  const closeMsaViewer = useAppStore((s) => s.closeMsaViewer);
  const setMsaRegion = useAppStore((s) => s.setMsaRegion);
  const clearMsaRegion = useAppStore((s) => s.clearMsaRegion);
  const msaRegion = useAppStore((s) => s.msaRegion);
  const hasMsa = useAppStore((s) => s.hasMsa);
  const movieData = useAppStore((s) => s.movieData);

  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  const [startValue, setStartValue] = useState('');
  const [endValue, setEndValue] = useState('');
  const [showLetters, setShowLetters] = useState(true);
  const resizeObserverRef = useRef(null);

  const processed = useMemo(() => {
    if (!hasMsa || !movieData) return null;
    try {
      return processPhyloData(movieData);
    } catch (err) {
      console.warn('[MSA rnd] Failed to process MSA data:', err);
      return null;
    }
  }, [hasMsa, movieData]);

  // Keep form inputs in sync with external region updates
  useEffect(() => {
    if (msaRegion) {
      setStartValue(String(msaRegion.start));
      setEndValue(String(msaRegion.end));
      if (viewerRef.current) {
        viewerRef.current.setRegion(msaRegion.start, msaRegion.end);
      }
    } else {
      setStartValue('');
      setEndValue('');
      viewerRef.current?.clearRegion();
    }
  }, [msaRegion]);

  // Initialize DeckGL viewer
  useEffect(() => {
    if (!isOpen || !containerRef.current) return undefined;

    const viewer = new MSADeckGLViewer(containerRef.current, { showLetters });
    viewerRef.current = viewer;

    if (processed) {
      viewer.loadFromPhyloData(movieData);
      if (msaRegion) {
        viewer.setRegion(msaRegion.start, msaRegion.end);
      }
    }

    // Resize observer to keep DeckGL in sync with container size
    resizeObserverRef.current = new ResizeObserver(() => {
      viewer.resize?.();
    });
    resizeObserverRef.current.observe(containerRef.current);

    return () => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [isOpen, processed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload data when movieData changes while open
  useEffect(() => {
    if (!isOpen) return;
    const viewer = viewerRef.current;
    if (viewer && processed) {
      viewer.loadFromPhyloData(movieData);
      if (msaRegion) {
        viewer.setRegion(msaRegion.start, msaRegion.end);
      } else {
        viewer.clearRegion();
      }
    }
  }, [isOpen, processed, movieData, msaRegion]);

  // Toggle letters without recreating viewer
  useEffect(() => {
    const viewer = viewerRef.current;
    if (viewer) {
      viewer.setShowLetters(showLetters);
      viewer.render?.();
    }
  }, [showLetters]);

  if (!isOpen) return null;

  const handleSetRegion = () => {
    const start = clampPositive(startValue);
    const end = clampPositive(endValue);
    if (Number.isFinite(start) && Number.isFinite(end) && start < end) {
      setMsaRegion(start, end);
      viewerRef.current?.setRegion(start, end);
    }
  };

  const handleClear = () => {
    clearMsaRegion();
    viewerRef.current?.clearRegion();
  };

  const summary = processed
    ? `${processed.rows} sequences · ${processed.cols} columns · ${processed.type.toUpperCase()}`
    : 'No alignment loaded';

  return (
    <Rnd
      default={{
        x: msaWindow?.x ?? 40,
        y: msaWindow?.y ?? 40,
        width: msaWindow?.width ?? 960,
        height: msaWindow?.height ?? 620,
      }}
      position={{
        x: msaWindow?.x ?? 40,
        y: msaWindow?.y ?? 40,
      }}
      size={{
        width: msaWindow?.width ?? 960,
        height: msaWindow?.height ?? 620,
      }}
      minWidth={600}
      minHeight={400}
      bounds="window"
      dragHandleClassName="msa-rnd-header"
      cancel=".msa-rnd-body"
      onDragStop={(_e, d) => setMsaWindow({ x: d.x, y: d.y })}
      onResizeStop={(_e, _dir, ref, delta, pos) => {
        setMsaWindow({
          width: parseInt(ref.style.width, 10),
          height: parseInt(ref.style.height, 10),
          x: pos.x,
          y: pos.y,
        });
        viewerRef.current?.resize?.();
      }}
      className="fixed z-40 pointer-events-auto shadow-2xl border border-border rounded-lg bg-card overflow-hidden"
    >
      <div className="flex flex-col h-full">
        <div className="msa-rnd-header flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card cursor-move select-none">
          <div className="flex items-center gap-3">
            <Columns className="size-5 text-primary" aria-hidden />
            <div>
              <div className="font-semibold">MSA Viewer</div>
              <div className="text-xs text-muted-foreground" aria-live="polite">{summary}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={closeMsaViewer} aria-label="Close MSA viewer">
              <X className="size-5" />
            </Button>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="msa-start" className="text-sm font-medium">Region</label>
            <Input
              id="msa-start"
              type="number"
              min={1}
              value={startValue}
              onChange={(e) => setStartValue(e.target.value)}
              className="w-28"
              aria-label="Start column"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              id="msa-end"
              type="number"
              min={1}
              value={endValue}
              onChange={(e) => setEndValue(e.target.value)}
              className="w-28"
              aria-label="End column"
            />
            <Button size="sm" onClick={handleSetRegion} disabled={!startValue || !endValue}>Set</Button>
            <Button size="sm" variant="outline" onClick={handleClear}>Clear</Button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Switch id="msa-toggle-letters" checked={showLetters} onCheckedChange={setShowLetters} aria-label="Toggle residue letters" />
            <label htmlFor="msa-toggle-letters" className="text-sm">Letters</label>
            {processed ? (
              <Badge variant="secondary" className="text-xs">{processed.type.toUpperCase()}</Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">No data</Badge>
            )}
          </div>
        </div>

        <div className="msa-rnd-body flex-1 min-h-0 relative bg-white" ref={containerRef} />
      </div>
    </Rnd>
  );
}

export default MsaRndWindow;
