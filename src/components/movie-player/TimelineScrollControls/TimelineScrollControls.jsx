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
  useAppStore,
} from '../../../state/phyloStore/store.js';

const TIMELINE_SCROLL_BUTTON_CLASS =
  'size-7 text-muted-foreground hover:bg-background/80 hover:text-foreground focus-visible:text-foreground';

const TIMELINE_ZOOM_BUTTON_CLASS =
  'size-7 border border-border/50 bg-background/85 text-foreground shadow-sm hover:border-primary/50 hover:bg-primary/10 hover:text-primary focus-visible:border-primary/60 focus-visible:text-primary';

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
      onClick: scrollToStartTimeline,
    },
    {
      id: 'zoomOutBtn',
      label: 'Zoom out timeline',
      tooltip: 'Zoom out timeline',
      Icon: ZoomOut,
      onClick: zoomOutTimeline,
      emphasis: true,
    },
    {
      id: 'fitToWindowBtn',
      label: 'Fit timeline to window',
      tooltip: 'Fit timeline to window',
      Icon: Scan,
      onClick: fitTimeline,
      emphasis: true,
    },
    {
      id: 'zoomInBtn',
      label: 'Zoom in timeline',
      tooltip: 'Zoom in timeline',
      Icon: ZoomIn,
      onClick: zoomInTimeline,
      emphasis: true,
    },
    {
      id: 'scrollToEndBtn',
      label: 'Scroll timeline to end',
      tooltip: 'Scroll timeline to end',
      Icon: ChevronsRight,
      onClick: scrollToEndTimeline,
    },
  ];

  return (
    <div
      className="timeline-view-controls flex items-center gap-1 rounded-md border border-border/60 bg-background/85 p-1 shadow-sm backdrop-blur-sm transition-colors duration-150 hover:border-primary/35 focus-within:border-primary/45"
      role="group"
      aria-label="Timeline viewport controls"
    >
      {controls.map(({ id, label, tooltip, Icon, onClick, emphasis }) => (
        <AppTooltip key={id} content={tooltip}>
          <Button
            id={id}
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className={emphasis ? TIMELINE_ZOOM_BUTTON_CLASS : TIMELINE_SCROLL_BUTTON_CLASS}
          >
            <Icon className={emphasis ? 'size-3.5' : 'size-3'} aria-hidden />
          </Button>
        </AppTooltip>
      ))}
    </div>
  );
}
