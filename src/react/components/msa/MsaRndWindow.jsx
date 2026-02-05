import React from 'react';
import { Rnd } from 'react-rnd';
import { useAppStore } from '@/js/core/store';
import { Button } from '@/components/ui/button';
import { X, Columns } from 'lucide-react';
import { useMSA } from './MSAContext';
import { MSAControls } from './MSAControls';
import { MSAViewer } from './MSAViewer';

// ==========================================================================
// STORE SELECTORS
// ==========================================================================
const selectCloseMsaViewer = (s) => s.closeMsaViewer;
const selectIsMsaViewerOpen = (s) => s.isMsaViewerOpen;
const selectMsaWindow = (s) => s.msaWindow;
const selectSetMsaWindow = (s) => s.setMsaWindow;

function MSAWindowContent() {
  const closeMsaViewer = useAppStore(selectCloseMsaViewer);
  const { processedData } = useMSA();

  const summary = processedData
    ? `${processedData.rows} sequences · ${processedData.cols} columns · ${processedData.type.toUpperCase()}`
    : 'No alignment loaded';

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-md border border-border/40">
      <div className="msa-rnd-header flex items-center justify-between gap-2 px-2 py-2 border-b border-border/40 bg-muted/20 backdrop-blur-sm cursor-move select-none shrink-0">
        <div className="flex items-center gap-2">
          <Columns className="size-4 text-primary" aria-hidden />
          <div className="flex flex-col">
            <div className="text-xs font-bold leading-tight tracking-tight uppercase">MSA Viewer</div>
            <div className="text-[9px] text-muted-foreground/80 leading-tight font-medium" aria-live="polite">{summary}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-xs" onClick={closeMsaViewer} aria-label="Close MSA viewer" className="hover:bg-destructive/10 hover:text-destructive transition-colors">
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <MSAControls />

      <MSAViewer />
    </div>
  );
}

export function MsaRndWindow() {
  const isOpen = useAppStore(selectIsMsaViewerOpen);
  const msaWindow = useAppStore(selectMsaWindow);
  const setMsaWindow = useAppStore(selectSetMsaWindow);

  if (!isOpen) return null;

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
      }}
      className="fixed z-40 pointer-events-auto shadow-2xl bg-card"
    >
      <MSAWindowContent />
    </Rnd>
  );
}

export default MsaRndWindow;
