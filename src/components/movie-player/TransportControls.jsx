import React, { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { AppTooltip } from '@/components/ui/app-tooltip';
import { ChevronsLeft, ChevronLeft, Play, Pause, ChevronRight, ChevronsRight, GitCompare, Link2, Link2Off } from 'lucide-react';
import { useAppStore } from '@/state/phyloStore/store.js';

// ==========================================================================
// STORE SELECTORS
// ==========================================================================
const selectPlaying = (s) => s.playing;
const selectCurrentTreeIndex = (s) => s.currentTreeIndex;
const selectTreeListLength = (s) => s.treeList?.length || 0;
const selectComparisonMode = (state) => state.comparisonMode;
const selectToggleComparisonMode = (state) => state.toggleComparisonMode;
const selectViewsConnected = (s) => s.viewsConnected;
const selectSetViewsConnected = (s) => s.setViewsConnected;
const selectStartAnimationPlayback = (s) => s.startAnimationPlayback;
const selectStopAnimationPlayback = (s) => s.stopAnimationPlayback;
const selectGoToNextAnchor = (s) => s.goToNextAnchor;
const selectGoToPreviousAnchor = (s) => s.goToPreviousAnchor;
const selectTransitionResolver = (s) => s.transitionResolver;

export function TransportControls({
  onBackward,
  onForward,
}) {
  const playing = useAppStore(selectPlaying);
  const currentTreeIndex = useAppStore(selectCurrentTreeIndex);
  const treeListLen = useAppStore(selectTreeListLength);
  const comparisonMode = useAppStore(selectComparisonMode);
  const toggleComparisonMode = useAppStore(selectToggleComparisonMode);
  const viewsConnected = useAppStore(selectViewsConnected);
  const setViewsConnected = useAppStore(selectSetViewsConnected);
  const startAnimationPlayback = useAppStore(selectStartAnimationPlayback);
  const stopAnimationPlayback = useAppStore(selectStopAnimationPlayback);
  const goToNextAnchor = useAppStore(selectGoToNextAnchor);
  const goToPreviousAnchor = useAppStore(selectGoToPreviousAnchor);
  const transitionResolver = useAppStore(selectTransitionResolver);

  // Get anchor-tree indices for disabled state calculation.
  const anchorIndices = useMemo(() => {
    return transitionResolver?.fullTreeIndices || [];
  }, [transitionResolver]);

  // Check if we can navigate to previous/next anchor tree.
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
      <AppTooltip content="Previous anchor tree">
        <Button
          className="transport-button"
          id="backwardAnchorButton"
          variant="ghost"
          size="icon"
          aria-label="Previous anchor tree"
          disabled={!canGoToPreviousAnchor}
          onClick={onPreviousAnchor}
        >
          <ChevronsLeft className="size-4" />
        </Button>
      </AppTooltip>

      <AppTooltip content="Previous transition frame">
        <Button
          className="transport-button"
          id="backward-button"
          variant="ghost"
          size="icon"
          aria-label="Previous transition frame"
          onClick={onBackward}
        >
          <ChevronLeft className="size-4" />
        </Button>
      </AppTooltip>

      <AppTooltip content="Play/Pause animation">
        <Button
          className="transport-button"
          id="play-button"
          variant="ghost"
          size="icon"
          aria-label="Play/Pause animation"
          onClick={onPlayClick}
          data-state={playing ? 'playing' : 'paused'}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>
      </AppTooltip>

      <AppTooltip content="Next transition frame">
        <Button
          className="transport-button"
          id="forward-button"
          variant="ghost"
          size="icon"
          aria-label="Next transition frame"
          onClick={onForward}
        >
          <ChevronRight className="size-4" />
        </Button>
      </AppTooltip>

      <AppTooltip content="Next anchor tree">
        <Button
          className="transport-button"
          id="forwardAnchorButton"
          variant="ghost"
          size="icon"
          aria-label="Next anchor tree"
          disabled={!canGoToNextAnchor}
          onClick={onNextAnchor}
        >
          <ChevronsRight className="size-4" />
        </Button>
      </AppTooltip>

      <AppTooltip content="Toggle comparison mode">
        <Button
          className="transport-button"
          id="compare-button"
          variant="ghost"
          size="icon"
          aria-label="Toggle comparison mode"
          onClick={toggleComparisonMode}
          data-state={comparisonMode ? 'active' : 'inactive'}
        >
          <GitCompare className="size-4" />
        </Button>
      </AppTooltip>

      {comparisonMode && (
        <AppTooltip content="Toggle view linking (draw connectors between trees)">
          <Button
            className="transport-button"
            id="link-views-button"
            variant="ghost"
            size="icon"
            aria-label="Toggle view linking"
            onClick={() => setViewsConnected(!viewsConnected)}
            data-state={viewsConnected ? 'active' : 'inactive'}
          >
            {viewsConnected ? <Link2 className="size-4" /> : <Link2Off className="size-4" />}
          </Button>
        </AppTooltip>
      )}
    </>
  );
}
