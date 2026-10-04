import React from 'react';
import { ChevronLeft, ChevronRight, Pin, X } from 'lucide-react';
import { Button } from '../ui/button';
import { AppTooltip } from '../ui/app-tooltip';
import {
  selectClearClipboard,
  selectClipboardTreeIndex,
  selectFrameIndex,
  selectInputFrameIndices,
  selectSetClipboardTreeIndex,
  useAppStore,
} from '../../state/phyloStore/store.js';
import { TRANSPORT_CONTROL_GROUP_LABELS } from './TransportControls.contract.js';
import { getNextPinnedTreeIndex, getPinnedTreeLabel } from './pinnedTree.js';

/**
 * Pins one input tree as a translucent overlay reference behind the active
 * tree. Lives next to the comparison toggle: both compare against another tree.
 */
export function PinnedTreeControl() {
  const inputTreeIndices = useAppStore(selectInputFrameIndices);
  const clipboardTreeIndex = useAppStore(selectClipboardTreeIndex);
  const setClipboardTreeIndex = useAppStore(selectSetClipboardTreeIndex);
  const clearClipboard = useAppStore(selectClearClipboard);
  const frameIndex = useAppStore(selectFrameIndex);

  const hasInputTrees = inputTreeIndices.length > 0;
  const isPinned = clipboardTreeIndex !== null;
  const label = getPinnedTreeLabel(clipboardTreeIndex, inputTreeIndices);

  const pinNeighbour = (direction) => {
    const treeIndex = getNextPinnedTreeIndex(direction, {
      clipboardTreeIndex,
      inputTreeIndices,
      frameIndex,
    });
    if (treeIndex !== null) setClipboardTreeIndex(treeIndex);
  };

  return (
    <div
      className="flex items-center gap-0.5"
      role="group"
      aria-label={TRANSPORT_CONTROL_GROUP_LABELS.pinnedTree}
    >
      <AppTooltip content="Pinned reference tree: drawn as an overlay behind the active tree">
        <Pin
          className={
            isPinned ? 'mx-1 size-3.5 text-primary' : 'mx-1 size-3.5 text-muted-foreground'
          }
          aria-hidden
        />
      </AppTooltip>
      <AppTooltip content="Pin previous input tree">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => pinNeighbour(-1)}
          disabled={!hasInputTrees}
          aria-label="Pin previous input tree"
        >
          <ChevronLeft className="size-3.5" />
        </Button>
      </AppTooltip>
      <span
        className="min-w-[4.25rem] text-center text-xs font-semibold tabular-nums"
        aria-live="polite"
        aria-label={`Pinned tree: ${label}`}
      >
        {label}
      </span>
      <AppTooltip content="Pin next input tree">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => pinNeighbour(1)}
          disabled={!hasInputTrees}
          aria-label="Pin next input tree"
        >
          <ChevronRight className="size-3.5" />
        </Button>
      </AppTooltip>
      {isPinned && (
        <AppTooltip content="Remove pinned tree">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-destructive"
            onClick={clearClipboard}
            aria-label="Remove pinned tree"
          >
            <X className="size-3.5" />
          </Button>
        </AppTooltip>
      )}
    </div>
  );
}
