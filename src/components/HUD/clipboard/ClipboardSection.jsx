import React from 'react';
import { Clipboard, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function ClipboardSection({ clipboardTreeIndex, anchorIndices, onShowAnchor, onClear }) {
  const hasAnchors = anchorIndices.length > 0;
  const isShowing = clipboardTreeIndex !== null;

  const currentAnchorPosition = isShowing
    ? anchorIndices.indexOf(clipboardTreeIndex)
    : -1;

  const handlePrevAnchor = () => {
    if (!hasAnchors) return;
    if (currentAnchorPosition <= 0) {
      onShowAnchor(anchorIndices[0]);
    } else {
      onShowAnchor(anchorIndices[currentAnchorPosition - 1]);
    }
  };

  const handleNextAnchor = () => {
    if (!hasAnchors) return;
    if (currentAnchorPosition < 0 || currentAnchorPosition >= anchorIndices.length - 1) {
      onShowAnchor(anchorIndices[anchorIndices.length - 1]);
    } else {
      onShowAnchor(anchorIndices[currentAnchorPosition + 1]);
    }
  };

  const getClipboardLabel = () => {
    if (!isShowing) return 'Off';
    const anchorPos = anchorIndices.indexOf(clipboardTreeIndex);
    if (anchorPos >= 0) return `Source-Target ${anchorPos + 1}`;
    return `Tree ${clipboardTreeIndex + 1}`;
  };

  return (
    <div className="flex items-center gap-3" id="hud-clipboard-section">
      <Clipboard className="size-3.5 text-primary" aria-hidden />
      <div className="flex flex-col gap-0">
        <span className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">Clipboard</span>
        <div className="flex items-center gap-1 mt-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:bg-accent rounded-sm"
                onClick={handlePrevAnchor}
                disabled={!hasAnchors}
                aria-label="Previous source-target tree"
              >
                <ChevronLeft className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous source-target tree</TooltipContent>
          </Tooltip>

          <Badge
            variant={isShowing ? 'default' : 'secondary'}
            className="h-5 px-2 text-2xs font-bold min-w-[55px] justify-center tabular-nums"
          >
            {getClipboardLabel()}
          </Badge>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:bg-accent rounded-sm"
                onClick={handleNextAnchor}
                disabled={!hasAnchors}
                aria-label="Next source-target tree"
              >
                <ChevronRight className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next source-target tree</TooltipContent>
          </Tooltip>

          {isShowing && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-sm ml-1"
                  onClick={onClear}
                  aria-label="Hide clipboard"
                >
                  <X className="size-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Hide clipboard</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
