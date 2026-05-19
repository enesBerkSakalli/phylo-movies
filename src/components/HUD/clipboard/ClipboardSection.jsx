import React from 'react';
import { Clipboard, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { AppTooltip } from '../../ui/app-tooltip';

export function ClipboardSection({ clipboardTreeIndex, inputTreeIndices, onShowInputTree, onClear }) {
  const hasInputTrees = inputTreeIndices.length > 0;
  const isShowing = clipboardTreeIndex !== null;

  const currentInputTreePosition = isShowing
    ? inputTreeIndices.indexOf(clipboardTreeIndex)
    : -1;

  const handlePreviousInputTree = () => {
    if (!hasInputTrees) return;
    if (currentInputTreePosition <= 0) {
      onShowInputTree(inputTreeIndices[0]);
    } else {
      onShowInputTree(inputTreeIndices[currentInputTreePosition - 1]);
    }
  };

  const handleNextInputTree = () => {
    if (!hasInputTrees) return;
    if (currentInputTreePosition < 0 || currentInputTreePosition >= inputTreeIndices.length - 1) {
      onShowInputTree(inputTreeIndices[inputTreeIndices.length - 1]);
    } else {
      onShowInputTree(inputTreeIndices[currentInputTreePosition + 1]);
    }
  };

  const getClipboardLabel = () => {
    if (!isShowing) return 'Off';
    const inputTreePosition = inputTreeIndices.indexOf(clipboardTreeIndex);
    if (inputTreePosition >= 0) return `Input ${inputTreePosition + 1}`;
    return `Tree ${clipboardTreeIndex + 1}`;
  };

  return (
    <div className="flex items-center gap-3" id="hud-clipboard-section">
      <Clipboard className="size-3.5 text-primary" aria-hidden />
      <div className="flex flex-col gap-0">
        <span className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">Compare with</span>
        <div className="flex items-center gap-1 mt-1">
          <AppTooltip content="Previous input tree to compare">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 hover:bg-accent rounded-sm"
              onClick={handlePreviousInputTree}
              disabled={!hasInputTrees}
              aria-label="Previous input tree to compare"
            >
              <ChevronLeft className="size-3" />
            </Button>
          </AppTooltip>

          <Badge
            variant={isShowing ? 'default' : 'secondary'}
            className="h-5 px-2 text-2xs font-bold min-w-[55px] justify-center tabular-nums"
          >
            {getClipboardLabel()}
          </Badge>

          <AppTooltip content="Next input tree to compare">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 hover:bg-accent rounded-sm"
              onClick={handleNextInputTree}
              disabled={!hasInputTrees}
              aria-label="Next input tree to compare"
            >
              <ChevronRight className="size-3" />
            </Button>
          </AppTooltip>

          {isShowing && (
            <AppTooltip content="Hide comparison tree">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-sm ml-1"
                onClick={onClear}
                aria-label="Hide comparison tree"
              >
                <X className="size-3" />
              </Button>
            </AppTooltip>
          )}
        </div>
      </div>
    </div>
  );
}
