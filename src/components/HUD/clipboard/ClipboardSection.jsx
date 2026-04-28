import React from 'react';
import { Clipboard, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AppTooltip } from '@/components/ui/app-tooltip';

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
    if (anchorPos >= 0) return `Tree window ${anchorPos + 1}`;
    return `Tree ${clipboardTreeIndex + 1}`;
  };

  return (
    <div className="flex items-center gap-3" id="hud-clipboard-section">
      <Clipboard className="size-3.5 text-primary" aria-hidden />
      <div className="flex flex-col gap-0">
        <span className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">Compare with</span>
        <div className="flex items-center gap-1 mt-1">
          <AppTooltip content="Previous comparison tree window">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 hover:bg-accent rounded-sm"
              onClick={handlePrevAnchor}
              disabled={!hasAnchors}
              aria-label="Previous comparison tree window"
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

          <AppTooltip content="Next comparison tree window">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 hover:bg-accent rounded-sm"
              onClick={handleNextAnchor}
              disabled={!hasAnchors}
              aria-label="Next comparison tree window"
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
