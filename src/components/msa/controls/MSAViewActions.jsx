import React from 'react';
import { useMSA } from '../useMSA.js';
import { Button } from '../../ui/button';
import { AppTooltip } from '../../ui/app-tooltip';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export function MSAViewActions() {
  const { triggerViewAction } = useMSA();

  return (
    <>
      <AppTooltip content="Zoom in alignment" side="bottom">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => triggerViewAction('ZOOM_IN')}
          aria-label="Zoom in alignment"
          className="text-muted-foreground hover:bg-background/80 hover:text-foreground"
        >
          <ZoomIn aria-hidden />
        </Button>
      </AppTooltip>
      <AppTooltip content="Zoom out alignment" side="bottom">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => triggerViewAction('ZOOM_OUT')}
          aria-label="Zoom out alignment"
          className="text-muted-foreground hover:bg-background/80 hover:text-foreground"
        >
          <ZoomOut aria-hidden />
        </Button>
      </AppTooltip>
      <AppTooltip content="Reset alignment view" side="bottom">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => triggerViewAction('RESET')}
          aria-label="Reset alignment view"
          className="text-muted-foreground hover:bg-background/80 hover:text-foreground"
        >
          <RotateCcw aria-hidden />
        </Button>
      </AppTooltip>
    </>
  );
}
