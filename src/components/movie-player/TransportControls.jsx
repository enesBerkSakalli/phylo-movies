import React, { useCallback, useMemo } from 'react';
import { Button } from '../ui/button';
import { AppTooltip } from '../ui/app-tooltip';
import { ChevronsLeft, ChevronLeft, Play, Pause, ChevronRight, ChevronsRight } from 'lucide-react';
import {
  selectActiveTreeListLength,
  selectFrameIndex,
  selectInputFrameIndices,
  selectGoToNextInputTree,
  selectGoToPreviousInputTree,
  selectPlaying,
  selectStartAnimationPlayback,
  selectStopAnimationPlayback,
  useAppStore,
} from '../../state/phyloStore/store.js';
import { TRANSPORT_CONTROL_GROUP_LABELS } from './TransportControls.contract.js';

export function TransportControls({ onBackward, onForward }) {
  const playing = useAppStore(selectPlaying);
  const frameIndex = useAppStore(selectFrameIndex);
  const treeListLen = useAppStore(selectActiveTreeListLength);
  const startAnimationPlayback = useAppStore(selectStartAnimationPlayback);
  const stopAnimationPlayback = useAppStore(selectStopAnimationPlayback);
  const goToNextInputTree = useAppStore(selectGoToNextInputTree);
  const goToPreviousInputTree = useAppStore(selectGoToPreviousInputTree);
  const inputTreeIndices = useAppStore(selectInputFrameIndices);
  const hasSequence = treeListLen > 0;
  const hasAnimationSequence = treeListLen > 1;
  const canTogglePlayback = hasAnimationSequence || playing;
  const canStepBackward = hasAnimationSequence && frameIndex > 0;
  const canStepForward = hasAnimationSequence && frameIndex < treeListLen - 1;

  // Check if we can navigate to previous/next input tree.
  const canGoToPreviousInputTree = useMemo(() => {
    return inputTreeIndices.some((idx) => idx < frameIndex);
  }, [inputTreeIndices, frameIndex]);

  const canGoToNextInputTree = useMemo(() => {
    return inputTreeIndices.some((idx) => idx > frameIndex);
  }, [inputTreeIndices, frameIndex]);

  const onPlayClick = useCallback(async () => {
    try {
      if (playing) stopAnimationPlayback();
      else await startAnimationPlayback();
    } catch {}
  }, [playing, startAnimationPlayback, stopAnimationPlayback]);

  const onPreviousInputTree = useCallback(() => {
    stopAnimationPlayback();
    goToPreviousInputTree();
  }, [goToPreviousInputTree, stopAnimationPlayback]);

  const onNextInputTree = useCallback(() => {
    stopAnimationPlayback();
    goToNextInputTree();
  }, [goToNextInputTree, stopAnimationPlayback]);

  const playbackLabel = playing ? 'Pause sequence' : 'Play sequence';

  return (
    <div
      className="flex shrink-0 items-center gap-0.5"
      role="group"
      aria-label={TRANSPORT_CONTROL_GROUP_LABELS.playback}
      data-tour-id="workspace-transport-controls"
    >
      <AppTooltip content="Previous input tree (Shift+←)">
        <Button
          className="transport-button"
          id="backwardInputTreeButton"
          variant="ghost"
          size="icon"
          aria-label="Previous input tree"
          disabled={!hasSequence || !canGoToPreviousInputTree}
          onClick={onPreviousInputTree}
        >
          <ChevronsLeft className="size-4" />
        </Button>
      </AppTooltip>

      <AppTooltip content="Previous generated frame (←)">
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

      <AppTooltip content={`${playbackLabel} (Space)`}>
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

      <AppTooltip content="Next generated frame (→)">
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

      <AppTooltip content="Next input tree (Shift+→)">
        <Button
          className="transport-button"
          id="forwardInputTreeButton"
          variant="ghost"
          size="icon"
          aria-label="Next input tree"
          disabled={!hasSequence || !canGoToNextInputTree}
          onClick={onNextInputTree}
        >
          <ChevronsRight className="size-4" />
        </Button>
      </AppTooltip>
    </div>
  );
}
