import React from 'react';
import { Rnd } from 'react-rnd';
import { useAppStore } from '../../../js/core/store.js';
import { Button } from '@/components/ui/button';
import { X, Columns } from 'lucide-react';
import { MSAProvider, useMSA } from './MSAContext';
import { MSAControls } from './MSAControls';
import { MSAViewer } from './MSAViewer';

function MSAWindowContent() {
  const closeMsaViewer = useAppStore((s) => s.closeMsaViewer);
  const { processedData } = useMSA();

  const summary = processedData
    ? `${processedData.rows} sequences · ${processedData.cols} columns · ${processedData.type.toUpperCase()}`
    : 'No alignment loaded';

  return (
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

      <MSAControls />

      <MSAViewer />
    </div>
  );
}

export function MsaRndWindow() {
  const isOpen = useAppStore((s) => s.isMsaViewerOpen);
  const msaWindow = useAppStore((s) => s.msaWindow);
  const setMsaWindow = useAppStore((s) => s.setMsaWindow);

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
      className="fixed z-40 pointer-events-auto shadow-2xl border border-border rounded-lg bg-card overflow-hidden"
    >
      <MSAProvider>
        <MSAWindowContent />
      </MSAProvider>
    </Rnd>
  );
}

export default MsaRndWindow;
