import React, { useCallback, useMemo } from 'react';
import Draggable from 'react-draggable';
import { useAppStore } from '@/js/core/store';
import { getIndexMappings, getMSAFrameIndex } from '@/js/domain/indexing/IndexMapping';
import { calculateWindow } from '@/js/domain/msa/msaWindowCalculator';
import { Film, BarChart2, Dna, Clipboard, ChevronLeft, ChevronRight, X, GripVertical } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// ==========================================================================
// STORE SELECTORS
// ==========================================================================

const selectHasMsa = (s) => s.hasMsa;
const selectCurrentTreeIndex = (s) => s.currentTreeIndex;
const selectTimelineProgress = (s) => s.timelineProgress;
const selectAnimationProgress = (s) => s.animationProgress;
const selectPlaying = (s) => s.playing;
const selectTransitionResolver = (s) => s.transitionResolver;
const selectTreeListLength = (s) => s.treeList?.length || 0;
const selectMsaWindowSize = (s) => s.msaWindowSize;
const selectMsaStepSize = (s) => s.msaStepSize;
const selectMsaColumnCount = (s) => s.msaColumnCount;
const selectGoToPosition = (s) => s.goToPosition;

// Clipboard selectors
const selectClipboardTreeIndex = (s) => s.clipboardTreeIndex;
const selectSetClipboardTreeIndex = (s) => s.setClipboardTreeIndex;
const selectClearClipboard = (s) => s.clearClipboard;

// ==========================================================================
// HELPERS
// ==========================================================================

const clamp01 = (value) => Math.max(0, Math.min(1, value || 0));

/**
 * Build interpolation text with full precision for scientific reproducibility.
 * Returns both display value (4 decimals for compact display) and full precision (6+ decimals).
 * Per UI guidelines #9: Never hide mathematical reality for aesthetics.
 * @returns {{display: string, fullPrecision: string}} Display text and tooltip value
 */
function buildInterpolationText(sequenceIndex, totalSequenceLength, timelineProgress, animationProgress, playing) {
  if (playing && typeof animationProgress === 'number') {
    const clamped = clamp01(animationProgress);
    return {
      display: `${clamped.toFixed(4)}`,
      fullPrecision: clamped.toString()
    };
  }

  const explicitValue = typeof timelineProgress === 'number' ? timelineProgress : null;
  const derivedValue = totalSequenceLength > 1 ? (sequenceIndex / (totalSequenceLength - 1)) : 0;
  const interpolationValue = clamp01(explicitValue ?? derivedValue);
  return {
    display: `${interpolationValue.toFixed(4)}`,
    fullPrecision: interpolationValue.toString()
  };
}

function buildSegmentText(sequenceIndex, transitionResolver) {
  const anchorIndices = transitionResolver?.fullTreeIndices || [];
  if (!anchorIndices.length) return 'Between source-target trees (interp)';

  const anchorAtPosition = anchorIndices.indexOf(sequenceIndex);
  if (anchorAtPosition === 0) return 'Start (Source-Target 1)';
  if (anchorAtPosition === anchorIndices.length - 1) return `End (Source-Target ${anchorAtPosition + 1})`;
  if (anchorAtPosition > 0) return `Source-Target ${anchorAtPosition + 1}`;

  let previousAnchorIdx = 0;
  for (let i = anchorIndices.length - 1; i >= 0; i--) {
    if (anchorIndices[i] <= sequenceIndex) {
      previousAnchorIdx = i;
      break;
    }
  }
  const nextAnchorIdx = previousAnchorIdx + 1;

  if (nextAnchorIdx < anchorIndices.length) {
    const from = anchorIndices[previousAnchorIdx];
    const to = anchorIndices[nextAnchorIdx];
    const span = Math.max(1, to - from);
    const pct = Math.round(((sequenceIndex - from) / span) * 100);
    return `Source-Target ${previousAnchorIdx + 1} → ${nextAnchorIdx + 1} (${pct}%)`;
  }

  return `End (Source-Target ${previousAnchorIdx + 1})`;
}

function buildMsaWindow(hasMsa, indexState, msaStepSize, msaWindowSize, msaColumnCount) {
  if (!hasMsa) return null;
  const frame = getMSAFrameIndex(indexState);
  return calculateWindow(frame, msaStepSize, msaWindowSize, msaColumnCount || 0);
}

// ==========================================================================
// COMPONENT
// ==========================================================================

export function HUD() {
  const hasMsa = useAppStore(selectHasMsa);
  const currentTreeIndex = useAppStore(selectCurrentTreeIndex);
  const timelineProgress = useAppStore(selectTimelineProgress);
  const animationProgress = useAppStore(selectAnimationProgress);
  const playing = useAppStore(selectPlaying);
  const transitionResolver = useAppStore(selectTransitionResolver);
  const treeListLength = useAppStore(selectTreeListLength);
  const msaWindowSize = useAppStore(selectMsaWindowSize);
  const msaStepSize = useAppStore(selectMsaStepSize);
  const msaColumnCount = useAppStore(selectMsaColumnCount);
  const goToPosition = useAppStore(selectGoToPosition);

  const clipboardTreeIndex = useAppStore(selectClipboardTreeIndex);
  const setClipboardTreeIndex = useAppStore(selectSetClipboardTreeIndex);
  const clearClipboard = useAppStore(selectClearClipboard);

  const anchorIndices = useMemo(
    () => transitionResolver?.fullTreeIndices || [],
    [transitionResolver]
  );

  const proxyState = useMemo(
    () => ({ currentTreeIndex, transitionResolver, treeList: { length: treeListLength } }),
    [currentTreeIndex, transitionResolver, treeListLength]
  );

  const { interpolationText, segmentText, msaWindow, sequenceIndex } = useMemo(() => {
    const { sequenceIndex, totalSequenceLength } = getIndexMappings(proxyState);
    return {
      interpolationText: buildInterpolationText(sequenceIndex, totalSequenceLength, timelineProgress, animationProgress, playing),
      segmentText: buildSegmentText(sequenceIndex, transitionResolver),
      msaWindow: buildMsaWindow(hasMsa, proxyState, msaStepSize, msaWindowSize, msaColumnCount),
      sequenceIndex,
    };
  }, [hasMsa, proxyState, transitionResolver, timelineProgress, animationProgress, playing, msaStepSize, msaWindowSize, msaColumnCount]);

  const sliderMax = Math.max(0, treeListLength - 1);
  const sliderValue = Math.min(sliderMax, Math.max(0, sequenceIndex || 0));
  const canScrub = sliderMax > 0 && typeof goToPosition === 'function';

  const handleSliderCommit = useCallback(
    (vals) => {
      if (!canScrub) return;
      const v = Array.isArray(vals) ? vals[0] : sliderValue;
      if (typeof v !== 'number' || Number.isNaN(v)) return;
      goToPosition(Math.max(0, Math.min(sliderMax, Math.round(v))));
    },
    [canScrub, goToPosition, sliderMax, sliderValue]
  );

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

          <InterpolationCoordinateSection
            interpolationText={interpolationText}
            sliderMax={sliderMax}
            sliderValue={sliderValue}
            canScrub={canScrub}
            onSliderCommit={handleSliderCommit}
          />

          <Separator orientation="vertical" className="h-6" />

          <InterpolationSection segmentText={segmentText} />

          {hasMsa && (
            <>
              <Separator orientation="vertical" className="h-6" />
              <MSAWindowSection 
                msaWindow={msaWindow} 
                msaWindowSize={msaWindowSize} 
                msaStepSize={msaStepSize} 
              />
            </>
          )}

          <Separator orientation="vertical" className="h-6" />

          <ClipboardSection
            clipboardTreeIndex={clipboardTreeIndex}
            anchorIndices={anchorIndices}
            onShowAnchor={setClipboardTreeIndex}
            onClear={clearClipboard}
          />
        </Card>
      </div>
    </Draggable>
  );
}

// ==========================================================================
// SUB-COMPONENTS
// ==========================================================================

function InterpolationCoordinateSection({ interpolationText, sliderMax, sliderValue, canScrub, onSliderCommit }) {
  return (
    <div className="flex items-center gap-2">
      <Film className="size-3.5 text-primary" aria-hidden />
      <div className="flex flex-col gap-0">
        <span className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">Coordinate</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span id="hudPositionInfo" aria-live="polite" className="text-xs font-bold text-foreground tabular-nums cursor-help hover:text-primary/80 transition-colors">
              {typeof interpolationText === 'object' ? interpolationText.display : interpolationText}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-2xs font-mono bg-zinc-950 border-border/60 text-foreground">
            <div className="space-y-1">
              <div>Full Precision:</div>
              <div className="font-bold text-primary tabular-nums">
                {typeof interpolationText === 'object' ? interpolationText.fullPrecision : interpolationText}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
      <Slider
        aria-label="Interpolation position"
        min={0}
        max={sliderMax}
        step={1}
        value={[sliderValue]}
        disabled={!canScrub}
        onValueCommit={onSliderCommit}
        className="w-20 ml-1"
      />
    </div>
  );
}

function InterpolationSection({ segmentText }) {
  return (
    <div className="flex items-center gap-2">
      <BarChart2 className="size-3.5 text-primary" aria-hidden />
      <div className="flex flex-col gap-0">
        <span className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">Segment</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              id="hudSegmentInfo"
              aria-live="polite"
              variant="secondary"
              className="h-5 px-2 text-2xs font-bold cursor-help"
            >
              {segmentText}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            Algorithmic interpolation between source-target trees: {segmentText}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function MSAWindowSection({ msaWindow, msaWindowSize, msaStepSize }) {
  return (
    <div className="flex items-center gap-3" id="hud-msa-window-item">
      <Dna className="size-3.5 text-primary" aria-hidden />
      <div className="flex flex-col gap-1">
        <span className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">MSA Window</span>
        
        {/* Primary: Window positions (bold, prominent) */}
        <div className="inline-flex items-center gap-1 text-xs font-bold text-foreground tabular-nums">
          <span id="hudWindowStart">{msaWindow?.startPosition ?? 1}</span>
          <span className="text-muted-foreground/50 text-2xs">-</span>
          <span id="hudWindowMid" className="text-primary">{msaWindow?.midPosition ?? 1}</span>
          <span className="text-muted-foreground/50 text-2xs">-</span>
          <span id="hudWindowEnd">{msaWindow?.endPosition ?? msaWindowSize ?? 100}</span>
        </div>
        
        {/* Secondary: Parameters (prominent, not muted) */}
        <div className="flex items-center gap-3 text-xs font-semibold text-foreground tabular-nums">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 border border-primary/20 hover:border-primary/40 transition-colors cursor-help">
                <span className="text-2xs text-muted-foreground">Size:</span>
                <span className="text-primary">{msaWindowSize ?? '—'}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-2xs">
              Window size in alignment positions
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 border border-primary/20 hover:border-primary/40 transition-colors cursor-help">
                <span className="text-2xs text-muted-foreground">Step:</span>
                <span className="text-primary">{msaStepSize ?? '—'}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-2xs">
              Step size between frames
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

function ClipboardSection({ clipboardTreeIndex, anchorIndices, onShowAnchor, onClear }) {
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
            variant={isShowing ? "default" : "secondary"}
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

export default HUD;
