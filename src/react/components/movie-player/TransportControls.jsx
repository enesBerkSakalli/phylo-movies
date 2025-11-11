import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronsLeft, ChevronLeft, Play, Pause, ChevronRight, ChevronsRight, GitCompare } from 'lucide-react';
import { useAppStore } from '../../../js/core/store.js';

export function TransportControls({
  playing,
  onPlayClick,
  onBackward,
  onBackwardStep,
  onForward,
  onForwardStep,
  canStepBackward,
  canStepForward,
}) {
  const comparisonMode = useAppStore((state) => state.comparisonMode);
  const toggleComparisonMode = useAppStore((state) => state.toggleComparisonMode);

  return (
    <>
      <Button
        className="transport-button"
        id="backwardStepButton"
        variant="ghost"
        size="icon"
        title="Go to previous tree"
        aria-label="Previous tree"
        disabled={!canStepBackward}
        onClick={onBackwardStep}
      >
        <ChevronsLeft className="size-5" />
      </Button>

      <Button
        className="transport-button"
        id="backward-button"
        variant="ghost"
        size="icon"
        title="Go to previous frame"
        aria-label="Previous frame"
        onClick={onBackward}
      >
        <ChevronLeft className="size-5" />
      </Button>

      <Button
        className="transport-button"
        id="play-button"
        variant="ghost"
        size="icon"
        title="Play/Pause animation"
        aria-label="Play/Pause animation"
        onClick={onPlayClick}
        data-state={playing ? 'playing' : 'paused'}
      >
        {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
      </Button>

      <Button
        className="transport-button"
        id="forward-button"
        variant="ghost"
        size="icon"
        title="Go to next frame"
        aria-label="Next frame"
        onClick={onForward}
      >
        <ChevronRight className="size-5" />
      </Button>

      <Button
        className="transport-button"
        id="forwardStepButton"
        variant="ghost"
        size="icon"
        title="Go to next tree"
        aria-label="Next tree"
        disabled={!canStepForward}
        onClick={onForwardStep}
      >
        <ChevronsRight className="size-5" />
      </Button>

      <Button
        className="transport-button"
        id="compare-button"
        variant="ghost"
        size="icon"
        title="Toggle comparison mode"
        aria-label="Toggle comparison mode"
        onClick={toggleComparisonMode}
        data-state={comparisonMode ? 'active' : 'inactive'}
      >
        <GitCompare className="size-5" />
      </Button>
    </>
  );
}
