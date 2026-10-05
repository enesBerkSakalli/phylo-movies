import React, { useMemo } from 'react';
import { Button } from '../ui/button';
import { AppTooltip } from '../ui/app-tooltip';
import { ChevronsLeft, ChevronLeft, Play, Pause, ChevronRight, ChevronsRight } from 'lucide-react';
import {
  selectActiveTreeListLength,
  selectFrameIndex,
  selectInputFrameIndices,
  selectPlaying,
  useAppStore,
} from '../../state/phyloStore/store.js';
import { playbackCommands } from './playbackShortcuts.js';

// 44px touch targets on a phone, in px: the root font is 14px, so size-11 would be 38.5
const TRANSPORT_BUTTON_CLASS = 'transport-button max-sm:size-[44px]';

export function TransportControls() {
  const playing = useAppStore(selectPlaying);
  const frameIndex = useAppStore(selectFrameIndex);
  const treeListLen = useAppStore(selectActiveTreeListLength);
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

  const playbackLabel = playing ? 'Pause sequence' : 'Play sequence';

  return (
    <div
      className="flex shrink-0 items-center gap-0.5"
      role="group"
      aria-label="Movie playback controls"
      data-tour-id="workspace-transport-controls"
    >
      <AppTooltip content="Previous input tree (Shift+←)">
        <Button
          className={TRANSPORT_BUTTON_CLASS}
          id="backwardInputTreeButton"
          variant="ghost"
          size="icon"
          aria-label="Previous input tree"
          disabled={!hasSequence || !canGoToPreviousInputTree}
          onClick={playbackCommands.previousInputTree}
        >
          <ChevronsLeft className="size-4" />
        </Button>
      </AppTooltip>

      <AppTooltip content="Previous generated frame (←)">
        <Button
          className={TRANSPORT_BUTTON_CLASS}
          id="backward-button"
          variant="ghost"
          size="icon"
          aria-label="Previous generated frame"
          disabled={!canStepBackward}
          onClick={playbackCommands.previousFrame}
        >
          <ChevronLeft className="size-4" />
        </Button>
      </AppTooltip>

      <AppTooltip content={`${playbackLabel} (Space)`}>
        <Button
          className={TRANSPORT_BUTTON_CLASS}
          id="play-button"
          variant="ghost"
          size="icon"
          aria-label={playbackLabel}
          disabled={!canTogglePlayback}
          onClick={playbackCommands.toggle}
          data-state={playing ? 'playing' : 'paused'}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>
      </AppTooltip>

      <AppTooltip content="Next generated frame (→)">
        <Button
          className={TRANSPORT_BUTTON_CLASS}
          id="forward-button"
          variant="ghost"
          size="icon"
          aria-label="Next generated frame"
          disabled={!canStepForward}
          onClick={playbackCommands.nextFrame}
        >
          <ChevronRight className="size-4" />
        </Button>
      </AppTooltip>

      <AppTooltip content="Next input tree (Shift+→)">
        <Button
          className={TRANSPORT_BUTTON_CLASS}
          id="forwardInputTreeButton"
          variant="ghost"
          size="icon"
          aria-label="Next input tree"
          disabled={!hasSequence || !canGoToNextInputTree}
          onClick={playbackCommands.nextInputTree}
        >
          <ChevronsRight className="size-4" />
        </Button>
      </AppTooltip>
    </div>
  );
}
