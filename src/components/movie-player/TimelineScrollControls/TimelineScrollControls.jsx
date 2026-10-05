import React from 'react';
import { Button } from '../../ui/button';
import { AppTooltip } from '../../ui/app-tooltip';
import { ZoomOut, ZoomIn, Scan } from 'lucide-react';
import {
  selectFitTimeline,
  selectTimelineView,
  selectZoomInTimeline,
  selectZoomOutTimeline,
  useAppStore,
} from '../../../state/phyloStore/store.js';

export const TIMELINE_VIEW_BUTTON_CLASS =
  'size-7 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:text-foreground';

export function TimelineScrollControls() {
  const zoomOutTimeline = useAppStore(selectZoomOutTimeline);
  const zoomInTimeline = useAppStore(selectZoomInTimeline);
  const fitTimeline = useAppStore(selectFitTimeline);
  const disabled = !useAppStore(selectTimelineView);

  const controls = [
    {
      id: 'zoomOutBtn',
      label: 'Zoom out timeline',
      tooltip: 'Zoom out timeline',
      Icon: ZoomOut,
      onClick: zoomOutTimeline,
    },
    {
      id: 'fitToWindowBtn',
      label: 'Fit timeline to window',
      tooltip: 'Fit timeline to window',
      Icon: Scan,
      onClick: fitTimeline,
    },
    {
      id: 'zoomInBtn',
      label: 'Zoom in timeline',
      tooltip: 'Zoom in timeline',
      Icon: ZoomIn,
      onClick: zoomInTimeline,
    },
  ];

  return (
    <div
      className="timeline-view-controls flex items-center gap-0.5"
      role="group"
      aria-label="Timeline viewport controls"
    >
      {controls.map(({ id, label, tooltip, Icon, onClick }) => (
        <AppTooltip key={id} content={tooltip}>
          <Button
            id={id}
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={label}
            disabled={disabled}
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
