import React from 'react';
import { Rnd } from 'react-rnd';
import {
  selectCloseMsaViewer,
  selectIsMsaViewerOpen,
  selectMsaWindow,
  selectSetMsaWindow,
  useAppStore
} from '../../state/phyloStore/store.js';
import { Button } from '../ui/button';
import { X, Columns } from 'lucide-react';
import { useMSA } from './useMSA.js';
import { MSAControls } from './MSAControls';
import { MSAViewer } from './MSAViewer';
import {
  fitFloatingWindowRect,
  getBrowserViewportSize,
  getFloatingWindowViewportInsets,
  hasFloatingWindowRectChanged,
  toFloatingWindowRect,
} from '../ui/floatingWindowGeometry.js';

const MSA_WINDOW_BOUNDS = {
  minWidth: 840,
  minHeight: 400,
  margin: 16,
};

function fitMsaWindowRect(rect) {
  const viewport = getBrowserViewportSize();
  const insets = getFloatingWindowViewportInsets();
  return fitFloatingWindowRect(rect, {
    ...MSA_WINDOW_BOUNDS,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    leftInset: insets.left,
    rightInset: insets.right,
    topInset: insets.top,
    bottomInset: insets.bottom,
  });
}

function MSAWindowContent() {
  const closeMsaViewer = useAppStore(selectCloseMsaViewer);
  const { processedData } = useMSA();

  const summary = processedData
    ? `${processedData.rows} sequences · ${processedData.cols} columns · ${processedData.type.toUpperCase()}`
    : 'No alignment loaded';

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-md border border-border/40">
      <div className="msa-rnd-header flex items-center justify-between gap-2 px-2 py-1 border-b border-border/40 bg-muted/20 backdrop-blur-sm cursor-move select-none shrink-0">
        <div className="flex min-w-0 items-center gap-2">
          <Columns className="size-3.5 shrink-0 text-primary" aria-hidden />
          <div className="flex min-w-0 items-center gap-2">
            <div className="shrink-0 text-xs font-bold leading-tight tracking-tight uppercase">MSA Viewer</div>
            <div className="min-w-0 truncate text-[10px] text-muted-foreground/80 leading-tight font-medium" aria-live="polite">{summary}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
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

export function MsaRndWindow({ isActive = false, onFocus } = {}) {
  const isOpen = useAppStore(selectIsMsaViewerOpen);
  const msaWindow = useAppStore(selectMsaWindow);
  const setMsaWindow = useAppStore(selectSetMsaWindow);
  const fittedWindow = fitMsaWindowRect(msaWindow);

  React.useEffect(() => {
    if (!isOpen) return undefined;

    const fitWindow = () => {
      const currentRect = useAppStore.getState().msaWindow;
      const nextRect = fitMsaWindowRect(currentRect);
      if (hasFloatingWindowRectChanged(currentRect, nextRect)) {
        setMsaWindow(toFloatingWindowRect(nextRect));
      }
    };

    fitWindow();
    window.addEventListener('resize', fitWindow);
    return () => window.removeEventListener('resize', fitWindow);
  }, [isOpen, setMsaWindow]);

  React.useEffect(() => {
    if (isOpen) onFocus?.();
  }, [isOpen, onFocus]);

  if (!isOpen) return null;

  return (
    <Rnd
      position={{
        x: fittedWindow.x,
        y: fittedWindow.y,
      }}
      size={{
        width: fittedWindow.width,
        height: fittedWindow.height,
      }}
      minWidth={fittedWindow.minWidth}
      minHeight={fittedWindow.minHeight}
      bounds="window"
      dragHandleClassName="msa-rnd-header"
      cancel=".msa-rnd-body"
      onMouseDown={onFocus}
      onDragStop={(_e, d) => {
        const nextRect = fitMsaWindowRect({ ...fittedWindow, x: d.x, y: d.y });
        setMsaWindow(toFloatingWindowRect(nextRect));
      }}
      onResizeStop={(_e, _dir, ref, _delta, pos) => {
        const nextRect = fitMsaWindowRect({
          width: parseInt(ref.style.width, 10),
          height: parseInt(ref.style.height, 10),
          x: pos.x,
          y: pos.y,
        });
        setMsaWindow(toFloatingWindowRect(nextRect));
      }}
      className={`fixed ${isActive ? 'z-[1200]' : 'z-[1100]'} pointer-events-auto shadow-2xl bg-card`}
    >
      <MSAWindowContent />
    </Rnd>
  );
}

export default MsaRndWindow;
