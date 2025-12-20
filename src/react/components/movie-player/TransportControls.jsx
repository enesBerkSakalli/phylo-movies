import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronsLeft, ChevronLeft, Play, Pause, ChevronRight, ChevronsRight, GitCompare, Link2, Link2Off } from 'lucide-react';
import { useAppStore } from '../../../js/core/store.js';

export function TransportControls({
  onBackward,
  onForward,
}) {
  const playing = useAppStore((s) => s.playing);
  const currentTreeIndex = useAppStore((s) => s.currentTreeIndex);
  const treeListLen = useAppStore((s) => s.treeList?.length || 0);
  const goToPosition = useAppStore((s) => s.goToPosition);
  const comparisonMode = useAppStore((state) => state.comparisonMode);
  const toggleComparisonMode = useAppStore((state) => state.toggleComparisonMode);
  const viewsConnected = useAppStore((s) => s.viewsConnected);
  const setViewsConnected = useAppStore((s) => s.setViewsConnected);
  const startAnimationPlayback = useAppStore((s) => s.startAnimationPlayback);
  const stopAnimationPlayback = useAppStore((s) => s.stopAnimationPlayback);

  const canStepBackward = currentTreeIndex > 0;
  const canStepForward = currentTreeIndex < treeListLen - 1;

  const onPlayClick = useCallback(async () => {
    try {
      if (playing) stopAnimationPlayback();
      else await startAnimationPlayback();
    } catch {}
  }, [playing, startAnimationPlayback, stopAnimationPlayback]);

  const onBackwardStep = useCallback(() => {
    if (currentTreeIndex > 0) {
      stopAnimationPlayback();
      goToPosition(currentTreeIndex - 1);
    }
  }, [currentTreeIndex, goToPosition, stopAnimationPlayback]);

  const onForwardStep = useCallback(() => {
    if (currentTreeIndex < treeListLen - 1) {
      stopAnimationPlayback();
      goToPosition(currentTreeIndex + 1);
    }
  }, [currentTreeIndex, treeListLen, goToPosition, stopAnimationPlayback]);

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

    {comparisonMode && (
      <Button
        className="transport-button"
        id="link-views-button"
        variant="ghost"
        size="icon"
        title="Toggle view linking (draw connectors between trees)"
        aria-label="Toggle view linking"
        onClick={() => setViewsConnected(!viewsConnected)}
        data-state={viewsConnected ? 'active' : 'inactive'}
      >
        {viewsConnected ? <Link2 className="size-5" /> : <Link2Off className="size-5" />}
      </Button>
    )}
  </>
  );
}
