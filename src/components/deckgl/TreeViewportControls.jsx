import React, { useCallback } from 'react';
import { Maximize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '../ui/button';
import { AppTooltip } from '../ui/app-tooltip';
import { selectPrimaryTreeController, useAppStore } from '../../state/phyloStore/store.js';

export function TreeViewportControls() {
  const controller = useAppStore(selectPrimaryTreeController);
  const disabled = !controller;

  const fitVisibleContent = useCallback(() => {
    if (!controller) return;
    controller.fitTreeToViewport();
  }, [controller]);

  const zoomOut = useCallback(() => {
    if (!controller) return;
    controller.zoomOut();
  }, [controller]);

  const zoomIn = useCallback(() => {
    if (!controller) return;
    controller.zoomIn();
  }, [controller]);

  const resetView = useCallback(() => {
    if (!controller) return;
    controller.resetTreeView();
  }, [controller]);

  return (
    <div
      className="absolute right-3 top-3 z-50 flex items-center gap-1 rounded-md border border-border/60 bg-background/85 p-1 shadow-lg backdrop-blur-sm pointer-events-auto"
      role="group"
      aria-label="Tree viewport controls"
    >
      <AppTooltip content="Fit all visible content" side="bottom">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Fit all visible content"
          disabled={disabled}
          onClick={fitVisibleContent}
        >
          <Maximize2 className="size-3.5" aria-hidden />
        </Button>
      </AppTooltip>

      <AppTooltip content="Zoom out tree" side="bottom">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Zoom out tree"
          disabled={disabled}
          onClick={zoomOut}
        >
          <ZoomOut className="size-3.5" aria-hidden />
        </Button>
      </AppTooltip>

      <AppTooltip content="Reset tree view" side="bottom">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Reset tree view"
          disabled={disabled}
          onClick={resetView}
        >
          <RotateCcw className="size-3.5" aria-hidden />
        </Button>
      </AppTooltip>

      <AppTooltip content="Zoom in tree" side="bottom">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Zoom in tree"
          disabled={disabled}
          onClick={zoomIn}
        >
          <ZoomIn className="size-3.5" aria-hidden />
        </Button>
      </AppTooltip>
    </div>
  );
}

export default TreeViewportControls;
