import React, { useCallback } from 'react';
import { Maximize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { AppTooltip } from '../ui/app-tooltip';
import {
  selectActiveTreeListLength,
  selectPrimaryTreeController,
  useAppStore,
} from '../../state/phyloStore/store.js';
import { RecordingControls } from '../media/RecordingControls.jsx';
import { SaveImageButton } from '../media/SaveImageButton.jsx';

const TOOL_GROUP_CLASS =
  'flex items-center gap-1 rounded-md border border-border/60 bg-background/85 p-1 shadow-lg backdrop-blur-sm';

export function TreeCanvasControls() {
  const controller = useAppStore(selectPrimaryTreeController);
  const treeListLength = useAppStore(selectActiveTreeListLength);
  const disabled = !controller;
  const captureDisabled = treeListLength === 0;

  const fitVisibleContent = useCallback(() => {
    controller?.fitTreeToViewport();
  }, [controller]);

  const zoomOut = useCallback(() => {
    controller?.zoomOut();
  }, [controller]);

  const zoomIn = useCallback(() => {
    controller?.zoomIn();
  }, [controller]);

  const resetView = useCallback(() => {
    controller?.resetTreeView();
  }, [controller]);

  return (
    <div
      className="absolute right-3 top-3 z-50 flex flex-col gap-2 pointer-events-auto"
      role="toolbar"
      aria-label="Tree canvas controls"
    >
      <div className={TOOL_GROUP_CLASS} role="group" aria-label="Tree viewport controls">
        <AppTooltip content="Fit all visible content" side="left">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Fit all visible content"
            disabled={disabled}
            onClick={fitVisibleContent}
          >
            <Maximize2 aria-hidden />
          </Button>
        </AppTooltip>

        <AppTooltip content="Zoom out tree" side="left">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Zoom out tree"
            disabled={disabled}
            onClick={zoomOut}
          >
            <ZoomOut aria-hidden />
          </Button>
        </AppTooltip>

        <AppTooltip content="Reset tree view" side="left">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Reset tree view"
            disabled={disabled}
            onClick={resetView}
          >
            <RotateCcw aria-hidden />
          </Button>
        </AppTooltip>

        <AppTooltip content="Zoom in tree" side="left">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Zoom in tree"
            disabled={disabled}
            onClick={zoomIn}
          >
            <ZoomIn aria-hidden />
          </Button>
        </AppTooltip>
      </div>

      <div className={TOOL_GROUP_CLASS} role="group" aria-label="Canvas export controls">
        <RecordingControls disabled={captureDisabled} />
        <Separator orientation="vertical" className="h-5" />
        <SaveImageButton disabled={captureDisabled} />
      </div>
    </div>
  );
}

export default TreeCanvasControls;
