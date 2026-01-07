import React, { useCallback, useMemo, useState } from 'react';
import Draggable from 'react-draggable';
import { useAppStore } from '../../../js/core/store.js';
import { getIndexMappings, getMSAFrameIndex } from '../../../js/domain/indexing/IndexMapping.js';
import { calculateWindow } from '../../../js/domain/msa/msaWindowCalculator.js';
import { Film, BarChart2, Columns3, Clipboard, ChevronLeft, ChevronRight, X, GripVertical } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

function buildProgressText(sequenceIndex, totalSequenceLength, timelineProgress, animationProgress, playing) {
  // During playback, use animationProgress directly for smooth updates
  // Otherwise, prefer timelineProgress (from scrubbing) or derive from sequenceIndex
  if (playing && typeof animationProgress === 'number') {
    return `${Math.round(clamp01(animationProgress) * 100)}%`;
  }

  const explicitProgress = typeof timelineProgress === 'number' ? timelineProgress : null;
  const derivedProgress = totalSequenceLength > 1 ? (sequenceIndex / (totalSequenceLength - 1)) : 0;
  const progressValue = clamp01(explicitProgress ?? derivedProgress);
  return `${Math.round(progressValue * 100)}%`;
}

function buildSegmentText(sequenceIndex, transitionResolver) {
  const anchorIndices = transitionResolver?.fullTreeIndices || [];
  if (!anchorIndices.length) return 'Between anchors';

  const anchorAtPosition = anchorIndices.indexOf(sequenceIndex);
  if (anchorAtPosition === 0) return 'Start (Anchor 1)';
  if (anchorAtPosition === anchorIndices.length - 1) return `End (Anchor ${anchorAtPosition + 1})`;
  if (anchorAtPosition > 0) return `Original tree ${anchorAtPosition + 1}`;

  // Find the most recent anchor and the next one
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
    return `Tree ${previousAnchorIdx + 1} → ${nextAnchorIdx + 1} (${pct}%)`;
  }

  return `End (Anchor ${previousAnchorIdx + 1})`;
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
  // ---------------------------------------------------------------------------
  // Store subscriptions
  // ---------------------------------------------------------------------------
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

  // Clipboard state
  const clipboardTreeIndex = useAppStore(selectClipboardTreeIndex);
  const setClipboardTreeIndex = useAppStore(selectSetClipboardTreeIndex);
  const clearClipboard = useAppStore(selectClearClipboard);

  // HUD visibility state
  const [isVisible, setIsVisible] = React.useState(true);

  // Get anchor tree indices
  const anchorIndices = useMemo(
    () => transitionResolver?.fullTreeIndices || [],
    [transitionResolver]
  );

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const proxyState = useMemo(
    () => ({ currentTreeIndex, transitionResolver, treeList: { length: treeListLength } }),
    [currentTreeIndex, transitionResolver, treeListLength]
  );

  const { progressText, segmentText, msaWindow, sequenceIndex } = useMemo(() => {
    const { sequenceIndex, totalSequenceLength } = getIndexMappings(proxyState);
    return {
      progressText: buildProgressText(sequenceIndex, totalSequenceLength, timelineProgress, animationProgress, playing),
      segmentText: buildSegmentText(sequenceIndex, transitionResolver),
      msaWindow: buildMsaWindow(hasMsa, proxyState, msaStepSize, msaWindowSize, msaColumnCount),
      sequenceIndex,
    };
  }, [hasMsa, proxyState, transitionResolver, timelineProgress, animationProgress, playing, msaStepSize, msaWindowSize, msaColumnCount]);

  const sliderMax = Math.max(0, treeListLength - 1);
  const sliderValue = Math.min(sliderMax, Math.max(0, sequenceIndex || 0));
  const canScrub = sliderMax > 0 && typeof goToPosition === 'function';

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------
  const handleSliderCommit = useCallback(
    (vals) => {
      if (!canScrub) return;
      const v = Array.isArray(vals) ? vals[0] : sliderValue;
      if (typeof v !== 'number' || Number.isNaN(v)) return;
      goToPosition(Math.max(0, Math.min(sliderMax, Math.round(v))));
    },
    [canScrub, goToPosition, sliderMax, sliderValue]
  );

  if (!isVisible) return null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <Draggable handle=".hud-drag-handle" bounds="parent">
      <div className="phylo-hud" data-react-component="hud" role="complementary" aria-label="Timeline Status Display" style={{ pointerEvents: 'auto' }}>
        <div style={{ position: 'relative' }}>
          <Card className="flex items-center gap-4 px-4 py-2 shadow-lg backdrop-blur-sm">
            {/* Drag Handle */}
            <div className="hud-drag-handle cursor-grab active:cursor-grabbing p-1 -ml-2 hover:bg-accent rounded" title="Drag to move">
              <GripVertical className="size-4 text-muted-foreground" />
            </div>

            <MovieProgressSection
            progressText={progressText}
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
              <MSAWindowSection msaWindow={msaWindow} msaWindowSize={msaWindowSize} />
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

          {/* Close button overlaying the HUD */}
          <button
            onClick={() => setIsVisible(false)}
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'hsl(var(--destructive))',
              color: 'hsl(var(--destructive-foreground))',
              border: '2px solid hsl(var(--background))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              zIndex: 1001
            }}
            title="Close HUD"
            aria-label="Close HUD"
          >
            ×
          </button>
        </div>
      </div>
    </Draggable>
  );
}

// ==========================================================================
// SUB-COMPONENTS
// ==========================================================================

function MovieProgressSection({ progressText, sliderMax, sliderValue, canScrub, onSliderCommit }) {
  return (
    <div className="flex items-center gap-2">
      <Film className="size-4 text-primary" aria-hidden />
      <span className="text-sm font-medium text-foreground/80">Movie progress</span>
      <span id="hudPositionInfo" aria-live="polite" className="font-semibold text-foreground">
        {progressText}
      </span>
      <Slider
        aria-label="Timeline position"
        min={0}
        max={sliderMax}
        step={1}
        value={[sliderValue]}
        disabled={!canScrub}
        onValueCommit={onSliderCommit}
        className="w-32"
      />
    </div>
  );
}

function InterpolationSection({ segmentText }) {
  return (
    <div className="flex items-center gap-2">
      <BarChart2 className="size-4 text-primary" aria-hidden />
      <span className="text-sm font-medium text-foreground/80">Interpolation</span>
      <Badge
        id="hudSegmentInfo"
        aria-live="polite"
        variant="secondary"
        className="text-xs font-semibold"
        title={segmentText}
      >
        {segmentText}
      </Badge>
    </div>
  );
}

function MSAWindowSection({ msaWindow, msaWindowSize }) {
  return (
    <div className="flex items-center gap-2" id="hud-msa-window-item">
      <Columns3 className="size-4 text-primary" aria-hidden />
      <span className="text-sm font-medium text-foreground/80">MSA</span>
      <div className="inline-flex items-center gap-1 font-semibold text-foreground">
        <span id="hudWindowStart">{msaWindow?.startPosition ?? 1}</span>
        <span className="text-muted-foreground">-</span>
        <span id="hudWindowMid" className="text-primary">{msaWindow?.midPosition ?? 1}</span>
        <span className="text-muted-foreground">-</span>
        <span id="hudWindowEnd">{msaWindow?.endPosition ?? msaWindowSize ?? 100}</span>
      </div>
    </div>
  );
}

function ClipboardSection({ clipboardTreeIndex, anchorIndices, onShowAnchor, onClear }) {
  const hasAnchors = anchorIndices.length > 0;
  const isShowing = clipboardTreeIndex !== null;

  // Find current anchor position (0-based index into anchorIndices)
  const currentAnchorPosition = isShowing
    ? anchorIndices.indexOf(clipboardTreeIndex)
    : -1;

  const handlePrevAnchor = () => {
    if (!hasAnchors) return;
    if (currentAnchorPosition <= 0) {
      // Show first anchor
      onShowAnchor(anchorIndices[0]);
    } else {
      onShowAnchor(anchorIndices[currentAnchorPosition - 1]);
    }
  };

  const handleNextAnchor = () => {
    if (!hasAnchors) return;
    if (currentAnchorPosition < 0 || currentAnchorPosition >= anchorIndices.length - 1) {
      // Show last anchor
      onShowAnchor(anchorIndices[anchorIndices.length - 1]);
    } else {
      onShowAnchor(anchorIndices[currentAnchorPosition + 1]);
    }
  };

  const getClipboardLabel = () => {
    if (!isShowing) return 'Off';
    const anchorPos = anchorIndices.indexOf(clipboardTreeIndex);
    if (anchorPos >= 0) return `Anchor ${anchorPos + 1}`;
    return `Tree ${clipboardTreeIndex + 1}`;
  };

  return (
    <div className="flex items-center gap-2" id="hud-clipboard-section">
      <Clipboard className="size-4 text-primary" aria-hidden />
      <span className="text-sm font-medium text-foreground/80">Clipboard</span>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handlePrevAnchor}
          disabled={!hasAnchors}
          title="Previous anchor tree"
          aria-label="Previous anchor tree"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <Badge
          variant={isShowing ? "default" : "secondary"}
          className="text-xs font-semibold min-w-[60px] justify-center"
        >
          {getClipboardLabel()}
        </Badge>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleNextAnchor}
          disabled={!hasAnchors}
          title="Next anchor tree"
          aria-label="Next anchor tree"
        >
          <ChevronRight className="size-4" />
        </Button>

        {isShowing && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={onClear}
            title="Hide clipboard"
            aria-label="Hide clipboard"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
