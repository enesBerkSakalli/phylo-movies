import React, { useMemo, useState } from 'react';
import Draggable from 'react-draggable';
import { useAppStore } from '@/state/phyloStore/store.js';
import { GripVertical, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ClipboardSection } from './clipboard/ClipboardSection.jsx';
import { InterpolationCoordinateSection } from './interpolation/InterpolationCoordinateSection.jsx';
import { InterpolationSection } from './interpolation/InterpolationSection.jsx';
import { MSAWindowSection } from './msa/MSAWindowSection.jsx';
import {
  selectClearClipboard,
  selectClipboardTreeIndex,
  selectHasMsa,
  selectSetClipboardTreeIndex,
  selectTransitionResolver,
} from './shared/hudShared.js';

// ==========================================================================
// COMPONENT
// ==========================================================================

export function HUD() {
  const [isVisible, setIsVisible] = useState(true);
  const hasMsa = useAppStore(selectHasMsa);
  const transitionResolver = useAppStore(selectTransitionResolver);

  const clipboardTreeIndex = useAppStore(selectClipboardTreeIndex);
  const setClipboardTreeIndex = useAppStore(selectSetClipboardTreeIndex);
  const clearClipboard = useAppStore(selectClearClipboard);

  const anchorIndices = useMemo(
    () => transitionResolver?.fullTreeIndices || [],
    [transitionResolver]
  );

  if (!isVisible) {
    return (
      <div className="phylo-hud-restore absolute bottom-48 left-4 z-50 pointer-events-auto">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon-xs"
              variant="outline"
              className="border-sidebar-border bg-sidebar/90 shadow-lg backdrop-blur-md"
              aria-label="Show timeline status display"
              onClick={() => setIsVisible(true)}
            >
              <Eye className="size-3.5" aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Show HUD</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <Draggable handle=".hud-drag-handle" bounds="parent">
      <div
        className="phylo-hud absolute bottom-48 left-4 z-50 pointer-events-auto"
        role="complementary"
        aria-label="Timeline Status Display"
      >
        <Card className="flex items-center gap-4 px-4 py-2 shadow-lg backdrop-blur-md border-sidebar-border bg-sidebar/90 cursor-default ring-1 ring-border/50">
          {/* Drag Handle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="hud-drag-handle cursor-grab active:cursor-grabbing p-1 -ml-2 hover:bg-accent rounded transition-colors duration-200">
                <GripVertical className="size-3.5 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">Drag to move HUD</TooltipContent>
          </Tooltip>

          <InterpolationCoordinateSection />

          <Separator orientation="vertical" className="h-6" />

          <InterpolationSection />

          {hasMsa && (
            <>
              <Separator orientation="vertical" className="h-6" />
              <MSAWindowSection />
            </>
          )}

          <Separator orientation="vertical" className="h-6" />

          <ClipboardSection
            clipboardTreeIndex={clipboardTreeIndex}
            anchorIndices={anchorIndices}
            onShowAnchor={setClipboardTreeIndex}
            onClear={clearClipboard}
          />

          <Separator orientation="vertical" className="h-6" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="-mr-2 size-6 text-muted-foreground hover:text-foreground"
                aria-label="Hide timeline status display"
                onClick={() => setIsVisible(false)}
              >
                <X className="size-3.5" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Hide HUD</TooltipContent>
          </Tooltip>
        </Card>
      </div>
    </Draggable>
  );
}

export default HUD;
