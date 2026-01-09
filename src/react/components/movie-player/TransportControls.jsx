import React, { useCallback, useMemo } from 'react';
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
  const comparisonMode = useAppStore((state) => state.comparisonMode);
  const toggleComparisonMode = useAppStore((state) => state.toggleComparisonMode);
  const viewsConnected = useAppStore((s) => s.viewsConnected);
  const setViewsConnected = useAppStore((s) => s.setViewsConnected);
  const startAnimationPlayback = useAppStore((s) => s.startAnimationPlayback);
  const stopAnimationPlayback = useAppStore((s) => s.stopAnimationPlayback);
  const goToNextAnchor = useAppStore((s) => s.goToNextAnchor);
  const goToPreviousAnchor = useAppStore((s) => s.goToPreviousAnchor);
  const transitionResolver = useAppStore((s) => s.transitionResolver);

  // Get anchor indices for disabled state calculation
  const anchorIndices = useMemo(() => {
    return transitionResolver?.fullTreeIndices || [];
  }, [transitionResolver]);

  // Check if we can navigate to previous/next anchor
  const canGoToPreviousAnchor = useMemo(() => {
    return anchorIndices.some(idx => idx < currentTreeIndex);
  }, [anchorIndices, currentTreeIndex]);

  const canGoToNextAnchor = useMemo(() => {
    return anchorIndices.some(idx => idx > currentTreeIndex);
  }, [anchorIndices, currentTreeIndex]);

  const onPlayClick = useCallback(async () => {
    try {
      if (playing) stopAnimationPlayback();
      else await startAnimationPlayback();
    } catch { }
  }, [playing, startAnimationPlayback, stopAnimationPlayback]);

  const onPreviousAnchor = useCallback(() => {
    stopAnimationPlayback();
    goToPreviousAnchor();
  }, [goToPreviousAnchor, stopAnimationPlayback]);

  const onNextAnchor = useCallback(() => {
    stopAnimationPlayback();
    goToNextAnchor();
  }, [goToNextAnchor, stopAnimationPlayback]);

  return (
    <>
      <Button
        className="transport-button"
        id="backwardAnchorButton"
        variant="ghost"
        size="icon"
        title="Go to previous anchor tree"
        aria-label="Previous anchor tree"
        disabled={!canGoToPreviousAnchor}
        onClick={onPreviousAnchor}
      >
        <ChevronsLeft className="size-4" />
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
        <ChevronLeft className="size-4" />
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
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
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
        <ChevronRight className="size-4" />
      </Button>

      <Button
        className="transport-button"
        id="forwardAnchorButton"
        variant="ghost"
        size="icon"
        title="Go to next anchor tree"
        aria-label="Next anchor tree"
        disabled={!canGoToNextAnchor}
        onClick={onNextAnchor}
      >
        <ChevronsRight className="size-4" />
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
        <GitCompare className="size-4" />
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
          {viewsConnected ? <Link2 className="size-4" /> : <Link2Off className="size-4" />}
        </Button>
      )}
    </>
  );
}
