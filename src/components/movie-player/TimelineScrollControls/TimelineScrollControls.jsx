import React from 'react';
import { Button } from '../../ui/button';
import { AppTooltip } from '../../ui/app-tooltip';
import { ZoomOut, ZoomIn, Scan } from 'lucide-react';
import { selectTimelineView, useAppStore } from '../../../state/phyloStore/store.js';

export const TIMELINE_VIEW_BUTTON_CLASS =
  'size-7 max-sm:size-11 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:text-foreground';

export function TimelineScrollControls() {
  const view = useAppStore(selectTimelineView);

  // The buttons are disabled until a strip is mounted, so a click always has a view.
  const controls = [
    { id: 'zoomOutBtn', label: 'Zoom out timeline', Icon: ZoomOut, onClick: () => view.zoom(1.2) },
    {
      id: 'fitToWindowBtn',
      label: 'Fit timeline to window',
      Icon: Scan,
      onClick: () => view.fit(),
    },
    { id: 'zoomInBtn', label: 'Zoom in timeline', Icon: ZoomIn, onClick: () => view.zoom(0.8) },
  ];

  return (
    <div
      className="timeline-view-controls flex items-center gap-0.5"
      role="group"
      aria-label="Timeline viewport controls"
    >
      {controls.map(({ id, label, Icon, onClick }) => (
        <AppTooltip key={id} content={label}>
          <Button
            id={id}
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={label}
            disabled={!view}
            onClick={onClick}
            className={TIMELINE_VIEW_BUTTON_CLASS}
          >
            <Icon className="size-3.5" aria-hidden />
          </Button>
        </AppTooltip>
      ))}
    </div>
  );
}
