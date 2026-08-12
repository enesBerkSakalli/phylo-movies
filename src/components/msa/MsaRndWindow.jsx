import React from 'react';
import { Rnd } from 'react-rnd';
import {
  selectCloseMsaViewer,
  selectMsaWindow,
  selectSetMsaWindow,
  useAppStore,
} from '../../state/phyloStore/store.js';
import { Button } from '../ui/button';
import { X, Columns } from 'lucide-react';
import { useMSA } from './useMSA.js';
import { MSAControls } from './MSAControls';
import { MSAViewer } from './MSAViewer';
import { cn } from '../../lib/utils';
import {
  fitFloatingWindowRect,
  getBrowserViewportSize,
  hasFloatingWindowRectChanged,
  toFloatingWindowRect,
} from '../ui/floatingWindowGeometry.js';
import {
  FLOATING_WINDOW_SURFACE_CLASS,
  getFloatingWindowLayerClass,
} from '../ui/floating-window-layer.js';
import { MSAProvider } from './MSAContext.jsx';

const MSA_WINDOW_BOUNDS = {
  minWidth: 840,
  minHeight: 400,
  margin: 16,
};

function fitMsaWindowRect(rect, viewport) {
  return fitFloatingWindowRect(rect, {
    ...MSA_WINDOW_BOUNDS,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
  });
}

function MSAWindowContent() {
  const closeMsaViewer = useAppStore(selectCloseMsaViewer);
  const { processedData } = useMSA();

  const summary = processedData
    ? `${processedData.rows} sequences · ${processedData.cols} columns · ${processedData.type.toUpperCase()}`
    : 'No alignment loaded';

  return (
    <div className="flex h-full flex-col overflow-hidden bg-card">
      <div className="msa-rnd-header flex items-center justify-between gap-2 px-2 py-1 shrink-0 cursor-move select-none border-b border-border bg-muted/30">
        <div className="flex min-w-0 items-center gap-2">
          <Columns className="size-3.5 shrink-0 text-primary" aria-hidden />
          <div className="flex min-w-0 items-center gap-2">
            <div
              id="msa-window-title"
              className="shrink-0 text-xs font-bold leading-tight uppercase"
            >
              Sequence Alignment
            </div>
            <div
              id="msa-window-description"
              className="min-w-0 truncate text-[10px] font-medium leading-tight text-muted-foreground/80"
              aria-live="polite"
            >
              {summary}
            </div>
          </div>
        </div>
        <div className="msa-rnd-header-actions flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={closeMsaViewer}
            aria-label="Close alignment viewer"
            className="hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <X aria-hidden />
          </Button>
        </div>
      </div>

      <MSAControls />

      <MSAViewer />
    </div>
  );
}

function MsaRndWindowSurface({ isActive = false, onFocus } = {}) {
  const msaWindow = useAppStore(selectMsaWindow);
  const setMsaWindow = useAppStore(selectSetMsaWindow);
  // Single viewport source: the render path and every handler fit against this
  // state, so nothing reads window.innerWidth during the render phase.
  const [viewport, setViewport] = React.useState(getBrowserViewportSize);
  const fittedWindow = React.useMemo(
    () => fitMsaWindowRect(msaWindow, viewport),
    [msaWindow, viewport]
  );

  React.useEffect(() => {
    const fitWindow = () => {
      const nextViewport = getBrowserViewportSize();
      // getBrowserViewportSize() returns a fresh object every call, so keep the
      // previous one when the dimensions match; otherwise every resize event
      // would re-render the unmemoized MSAViewer subtree for nothing.
      setViewport((previous) =>
        previous.width === nextViewport.width && previous.height === nextViewport.height
          ? previous
          : nextViewport
      );

      const currentRect = useAppStore.getState().msaWindow;
      const nextRect = fitMsaWindowRect(currentRect, nextViewport);
      if (hasFloatingWindowRectChanged(currentRect, nextRect)) {
        setMsaWindow(toFloatingWindowRect(nextRect));
      }
    };

    fitWindow();
    window.addEventListener('resize', fitWindow);
    return () => window.removeEventListener('resize', fitWindow);
  }, [setMsaWindow]);

  React.useEffect(() => {
    onFocus?.();
  }, [onFocus]);

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
      cancel=".msa-rnd-body, .msa-rnd-header-actions"
      onMouseDown={onFocus}
      onDragStop={(_e, d) => {
        const nextRect = fitMsaWindowRect(
          { width: fittedWindow.width, height: fittedWindow.height, x: d.x, y: d.y },
          viewport
        );
        setMsaWindow(toFloatingWindowRect(nextRect));
      }}
      onResizeStop={(_e, _dir, ref, _delta, pos) => {
        const nextRect = fitMsaWindowRect(
          { width: ref.offsetWidth, height: ref.offsetHeight, x: pos.x, y: pos.y },
          viewport
        );
        setMsaWindow(toFloatingWindowRect(nextRect));
      }}
      role="region"
      aria-labelledby="msa-window-title"
      aria-describedby="msa-window-description"
      className={cn(FLOATING_WINDOW_SURFACE_CLASS, getFloatingWindowLayerClass(isActive))}
    >
      <MSAWindowContent />
    </Rnd>
  );
}

export default function MsaRndWindow(props) {
  return (
    <MSAProvider>
      <MsaRndWindowSurface {...props} />
    </MSAProvider>
  );
}
