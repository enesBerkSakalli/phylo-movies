import React, { useState } from 'react';
import Draggable from 'react-draggable';
import { useAppStore } from '../../state/phyloStore/store.js';
import { GripVertical, Eye, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { AppTooltip } from '../ui/app-tooltip';
import { ClipboardSection } from './clipboard/ClipboardSection.jsx';
import {
  selectClearClipboard,
  selectClipboardTreeIndex,
  selectInputFrameIndices,
  selectSetClipboardTreeIndex,
} from './shared/hudShared.js';

// ==========================================================================
// COMPONENT
// ==========================================================================

export function HUD() {
  const [isVisible, setIsVisible] = useState(true);
  const inputTreeIndices = useAppStore(selectInputFrameIndices);

  const clipboardTreeIndex = useAppStore(selectClipboardTreeIndex);
  const setClipboardTreeIndex = useAppStore(selectSetClipboardTreeIndex);
  const clearClipboard = useAppStore(selectClearClipboard);

  if (!isVisible) {
    return (
      <div className="phylo-hud-restore absolute bottom-4 left-4 z-50 pointer-events-auto sm:bottom-48">
        <AppTooltip content="Show comparison panel">
          <Button
            type="button"
            size="icon-xs"
            variant="outline"
            className="border-sidebar-border bg-sidebar/90 shadow-lg backdrop-blur-md"
            aria-label="Show comparison panel"
            onClick={() => setIsVisible(true)}
          >
            <Eye className="size-3.5" aria-hidden />
          </Button>
        </AppTooltip>
      </div>
    );
  }

  return (
    <Draggable handle=".hud-drag-handle" bounds="parent">
      <div
        className="phylo-hud absolute bottom-4 left-4 z-50 pointer-events-auto sm:bottom-48"
        role="complementary"
        aria-label="Comparison Panel"
      >
        <Card className="flex items-center gap-3 px-3 py-2 shadow-lg backdrop-blur-md border-sidebar-border bg-sidebar/90 cursor-default ring-1 ring-border/50">
          {/* Drag Handle */}
          <AppTooltip content="Drag to move comparison panel">
            <div className="hud-drag-handle cursor-grab active:cursor-grabbing p-1 -ml-2 hover:bg-accent rounded transition-colors duration-200">
              <GripVertical className="size-3.5 text-muted-foreground" />
            </div>
          </AppTooltip>

          <ClipboardSection
            clipboardTreeIndex={clipboardTreeIndex}
            inputTreeIndices={inputTreeIndices}
            onShowInputTree={setClipboardTreeIndex}
            onClear={clearClipboard}
          />

          <AppTooltip content="Hide comparison panel">
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              className="-mr-2 size-6 text-muted-foreground hover:text-foreground"
              aria-label="Hide comparison panel"
              onClick={() => setIsVisible(false)}
            >
              <X className="size-3.5" aria-hidden />
            </Button>
          </AppTooltip>
        </Card>
      </div>
    </Draggable>
  );
}

export default HUD;
