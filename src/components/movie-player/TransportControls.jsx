import React, { useCallback, useMemo } from 'react';
import { Button } from '../ui/button';
import { AppTooltip } from '../ui/app-tooltip';
import { ChevronsLeft, ChevronLeft, Play, Pause, ChevronRight, ChevronsRight, GitCompare, Link2, Link2Off } from 'lucide-react';
import {
  selectActiveTreeListLength,
  selectComparisonMode,
  selectCurrentTreeIndex,
  selectGoToNextAnchor,
  selectGoToPreviousAnchor,
  selectPlaying,
  selectSetViewsConnected,
  selectStartAnimationPlayback,
  selectStopAnimationPlayback,
  selectToggleComparisonMode,
  selectTransitionResolver,
  selectViewsConnected,
  useAppStore
} from '../../state/phyloStore/store.js';

export function TransportControls({
  onBackward,
  onForward,
}) {
  const playing = useAppStore(selectPlaying);
  const currentTreeIndex = useAppStore(selectCurrentTreeIndex);
  const treeListLen = useAppStore(selectActiveTreeListLength);
  const comparisonMode = useAppStore(selectComparisonMode);
  const toggleComparisonMode = useAppStore(selectToggleComparisonMode);
  const viewsConnected = useAppStore(selectViewsConnected);
  const setViewsConnected = useAppStore(selectSetViewsConnected);
  const startAnimationPlayback = useAppStore(selectStartAnimationPlayback);
  const stopAnimationPlayback = useAppStore(selectStopAnimationPlayback);
  const goToNextAnchor = useAppStore(selectGoToNextAnchor);
  const goToPreviousAnchor = useAppStore(selectGoToPreviousAnchor);
  const transitionResolver = useAppStore(selectTransitionResolver);
  const hasSequence = treeListLen > 0;
  const hasAnimationSequence = treeListLen > 1;
  const canTogglePlayback = hasAnimationSequence || playing;
  const canStepBackward = hasAnimationSequence && currentTreeIndex > 0;
  const canStepForward = hasAnimationSequence && currentTreeIndex < treeListLen - 1;

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

  const playbackLabel = playing ? 'Pause sequence' : 'Play sequence';
  const comparisonLabel = comparisonMode ? 'Hide comparison view' : 'Show comparison view';
  const viewLinkLabel = viewsConnected ? 'Unlink tree views' : 'Link tree views';

  return (
    <div className="flex shrink-0 items-center gap-0.5" role="group" aria-label="Playback controls">
      <AppTooltip content="Previous source tree">
        <Button
          className="transport-button"
          id="backwardAnchorButton"
          variant="ghost"
          size="icon"
          aria-label="Previous source tree"
          disabled={!hasSequence || !canGoToPreviousAnchor}
          onClick={onPreviousAnchor}
        >
          <ChevronsLeft className="size-4" />
        </Button>
      </AppTooltip>

      <AppTooltip content="Previous generated frame">
        <Button
          className="transport-button"
          id="backward-button"
          variant="ghost"
          size="icon"
          aria-label="Previous generated frame"
          disabled={!canStepBackward}
          onClick={onBackward}
        >
          <ChevronLeft className="size-4" />
        </Button>
      </AppTooltip>

      <AppTooltip content={playbackLabel}>
        <Button
          className="transport-button"
          id="play-button"
          variant="ghost"
          size="icon"
          aria-label={playbackLabel}
          disabled={!canTogglePlayback}
          onClick={onPlayClick}
          data-state={playing ? 'playing' : 'paused'}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>
      </AppTooltip>

      <AppTooltip content="Next generated frame">
        <Button
          className="transport-button"
          id="forward-button"
          variant="ghost"
          size="icon"
          aria-label="Next generated frame"
          disabled={!canStepForward}
          onClick={onForward}
        >
          <ChevronRight className="size-4" />
        </Button>
      </AppTooltip>

      <AppTooltip content="Next source tree">
        <Button
          className="transport-button"
          id="forwardAnchorButton"
          variant="ghost"
          size="icon"
          aria-label="Next source tree"
          disabled={!hasSequence || !canGoToNextAnchor}
          onClick={onNextAnchor}
        >
          <ChevronsRight className="size-4" />
        </Button>
      </AppTooltip>

      <AppTooltip content={comparisonLabel}>
        <Button
          className="transport-button"
          id="compare-button"
          variant="ghost"
          size="icon"
          aria-label={comparisonLabel}
          disabled={!hasAnimationSequence && !comparisonMode}
          onClick={toggleComparisonMode}
          data-state={comparisonMode ? 'active' : 'inactive'}
        >
          <GitCompare className="size-4" />
        </Button>
      </AppTooltip>

      {comparisonMode && (
        <AppTooltip content={viewLinkLabel}>
          <Button
            className="transport-button"
            id="link-views-button"
            variant="ghost"
            size="icon"
            aria-label={viewLinkLabel}
            disabled={!hasAnimationSequence}
            onClick={() => setViewsConnected(!viewsConnected)}
            data-state={viewsConnected ? 'active' : 'inactive'}
          >
            {viewsConnected ? <Link2 className="size-4" /> : <Link2Off className="size-4" />}
          </Button>
        </AppTooltip>
      )}
    </div>
  );
}
