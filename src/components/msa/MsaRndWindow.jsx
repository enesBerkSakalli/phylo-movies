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
import { getBrowserViewportSize, toFloatingWindowRect } from '../ui/floatingWindowGeometry.js';
import { isMsaSheetLayout, placeMsaWindowRect } from './msaWindowPlacement.js';
import {
  FLOATING_WINDOW_SURFACE_CLASS,
  getFloatingWindowLayerClass,
} from '../ui/floating-window-layer.js';
import { MSAProvider } from './MSAContext.jsx';

// The tree canvas area: right of the sidebar, left of the docked inspector,
// above the movie player bar.
const CANVAS_AREA_SELECTOR = '[data-tree-canvas-area]';

function measureMsaLayout() {
  const canvasElement =
    typeof document === 'undefined' ? null : document.querySelector(CANVAS_AREA_SELECTOR);
  const rect = canvasElement?.getBoundingClientRect();
  return {
    viewport: getBrowserViewportSize(),
    canvasRect: rect
      ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }
      : null,
  };
}

function isSameMsaLayout(a, b) {
  return (
    a.viewport.width === b.viewport.width &&
    a.viewport.height === b.viewport.height &&
    a.canvasRect?.left === b.canvasRect?.left &&
    a.canvasRect?.top === b.canvasRect?.top &&
    a.canvasRect?.right === b.canvasRect?.right &&
    a.canvasRect?.bottom === b.canvasRect?.bottom
  );
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
              className="min-w-0 truncate text-2xs font-medium leading-tight text-muted-foreground"
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
  // Single layout source: the render path and every handler place the window
  // against this state. The canvas rect is measured in a layout effect, so the
  // first render places against the viewport only.
  const [layout, setLayout] = React.useState(() => ({
    viewport: getBrowserViewportSize(),
    canvasRect: null,
  }));
  const isSheet = isMsaSheetLayout(layout.viewport);
  const fittedWindow = React.useMemo(
    () => placeMsaWindowRect(msaWindow, layout.viewport, layout.canvasRect),
    [msaWindow, layout]
  );

  React.useLayoutEffect(() => {
    const fitWindow = () => {
      const nextLayout = measureMsaLayout();
      // measureMsaLayout() returns fresh objects every call, so keep the previous
      // layout when nothing moved; otherwise every resize event would re-render
      // the unmemoized MSAViewer subtree for nothing.
      // Placement is derived at render time; the stored rect keeps the user's
      // intended size and position so a temporarily narrow canvas cannot shrink it.
      setLayout((previous) => (isSameMsaLayout(previous, nextLayout) ? previous : nextLayout));
    };

    fitWindow();
    window.addEventListener('resize', fitWindow);
    // The sidebar can collapse and the inspector can dock without a window resize.
    const canvasElement = document.querySelector(CANVAS_AREA_SELECTOR);
    const resizeObserver =
      canvasElement && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fitWindow) : null;
    resizeObserver?.observe(canvasElement);
    return () => {
      window.removeEventListener('resize', fitWindow);
      resizeObserver?.disconnect();
    };
  }, []);

  React.useEffect(() => {
    onFocus?.();
  }, [onFocus]);

  const storePlacedRect = (rect) => {
    setMsaWindow(
      toFloatingWindowRect(placeMsaWindowRect(rect, layout.viewport, layout.canvasRect))
    );
  };

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
      disableDragging={isSheet}
      enableResizing={!isSheet}
      dragHandleClassName="msa-rnd-header"
      cancel=".msa-rnd-body, .msa-rnd-header-actions"
      onMouseDown={onFocus}
      onDragStop={(_e, d) => {
        storePlacedRect({ width: fittedWindow.width, height: fittedWindow.height, x: d.x, y: d.y });
      }}
      onResizeStop={(_e, _dir, ref, _delta, pos) => {
        storePlacedRect({ width: ref.offsetWidth, height: ref.offsetHeight, x: pos.x, y: pos.y });
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
