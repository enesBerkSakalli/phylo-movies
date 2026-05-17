import React from 'react';
import { Button } from '../../ui/button';
import { AppTooltip } from '../../ui/app-tooltip';
import { ChevronsLeft, ChevronsRight, ZoomOut, ZoomIn, Scan } from 'lucide-react';
import {
  selectFitTimeline,
  selectMovieTimelineManager,
  selectScrollToEndTimeline,
  selectScrollToStartTimeline,
  selectZoomInTimeline,
  selectZoomOutTimeline,
  useAppStore
} from '../../../state/phyloStore/store.js';

export function TimelineScrollControls() {
  const scrollToStartTimeline = useAppStore(selectScrollToStartTimeline);
  const scrollToEndTimeline = useAppStore(selectScrollToEndTimeline);
  const zoomOutTimeline = useAppStore(selectZoomOutTimeline);
  const zoomInTimeline = useAppStore(selectZoomInTimeline);
  const fitTimeline = useAppStore(selectFitTimeline);
  const movieTimelineManager = useAppStore(selectMovieTimelineManager);
  const disabled = !movieTimelineManager;

  const controls = [
    {
      id: 'scrollToStartBtn',
      label: 'Scroll sequence to start',
      tooltip: 'Scroll to start',
      Icon: ChevronsLeft,
      onClick: scrollToStartTimeline
    },
    {
      id: 'zoomOutBtn',
      label: 'Zoom out sequence',
      tooltip: 'Zoom out sequence',
      Icon: ZoomOut,
      onClick: zoomOutTimeline
    },
    {
      id: 'fitToWindowBtn',
      label: 'Fit entire sequence to window',
      tooltip: 'Fit entire sequence',
      Icon: Scan,
      onClick: fitTimeline
    },
    {
      id: 'zoomInBtn',
      label: 'Zoom in sequence',
      tooltip: 'Zoom in sequence',
      Icon: ZoomIn,
      onClick: zoomInTimeline
    },
    {
      id: 'scrollToEndBtn',
      label: 'Scroll sequence to end',
      tooltip: 'Scroll to end',
      Icon: ChevronsRight,
      onClick: scrollToEndTimeline
    }
  ];

  return (
    <div
      className="timeline-view-controls flex items-center gap-0.5 rounded-md bg-muted/40 p-0.5"
      role="group"
      aria-label="Timeline view controls"
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
            className="text-muted-foreground hover:text-foreground"
          >
            <Icon className="size-3.5" aria-hidden />
          </Button>
        </AppTooltip>
      ))}
    </div>
  );
}
