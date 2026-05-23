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
      label: 'Scroll timeline to start',
      tooltip: 'Scroll timeline to start',
      Icon: ChevronsLeft,
      onClick: scrollToStartTimeline
    },
    {
      id: 'zoomOutBtn',
      label: 'Zoom out timeline',
      tooltip: 'Zoom out timeline',
      Icon: ZoomOut,
      onClick: zoomOutTimeline
    },
    {
      id: 'fitToWindowBtn',
      label: 'Fit timeline to window',
      tooltip: 'Fit timeline to window',
      Icon: Scan,
      onClick: fitTimeline
    },
    {
      id: 'zoomInBtn',
      label: 'Zoom in timeline',
      tooltip: 'Zoom in timeline',
      Icon: ZoomIn,
      onClick: zoomInTimeline
    },
    {
      id: 'scrollToEndBtn',
      label: 'Scroll timeline to end',
      tooltip: 'Scroll timeline to end',
      Icon: ChevronsRight,
      onClick: scrollToEndTimeline
    }
  ];

  return (
    <div
      className="timeline-view-controls flex items-center gap-px rounded-md border border-transparent bg-transparent p-0.5 opacity-45 transition-opacity duration-150 hover:border-border/40 hover:bg-background/70 hover:opacity-100 focus-within:border-border/40 focus-within:bg-background/70 focus-within:opacity-100"
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
            className="size-6 text-muted-foreground/80 hover:text-foreground focus-visible:text-foreground"
          >
            <Icon className="size-3" aria-hidden />
          </Button>
        </AppTooltip>
      ))}
    </div>
  );
}
