import React, { useCallback, useMemo } from 'react';
import { useAppStore } from '../../../js/core/store.js';
import { getIndexMappings, getMSAFrameIndex } from '../../../js/domain/indexing/IndexMapping.js';
import { calculateWindow } from '../../../js/utils/windowUtils.js';
import { Film, BarChart2, Columns3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

const clamp01 = (value) => Math.max(0, Math.min(1, value || 0));

// Derive timeline-wide progress text from either an explicit timelineProgress
// or the current position within the sequence list.
function buildProgressText(sequenceIndex, totalSequenceLength, timelineProgress) {
  const explicitProgress = typeof timelineProgress === 'number' ? timelineProgress : null;
  const derivedProgress = totalSequenceLength > 1 ? (sequenceIndex / (totalSequenceLength - 1)) : 0;
  const progressValue = clamp01(explicitProgress ?? derivedProgress);
  return `${Math.round(progressValue * 100)}%`;
}

// Human-readable interpolation label based on anchor (full tree) indices.
function buildSegmentText(sequenceIndex, transitionResolver) {
  const anchorIndices = transitionResolver?.fullTreeIndices || [];
  if (!anchorIndices.length) return 'Between anchors';

  const anchorAtPosition = anchorIndices.indexOf(sequenceIndex);
  if (anchorAtPosition === 0) {
    return 'Start (Anchor 1)';
  }
  if (anchorAtPosition === anchorIndices.length - 1) {
    return `End (Anchor ${anchorAtPosition + 1})`;
  }
  if (anchorAtPosition > 0) {
    return `Original tree ${anchorAtPosition + 1}`;
  }

  // Find the most recent anchor and the next one (if available)
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

  // Past the final anchor
  return `End (Anchor ${previousAnchorIdx + 1})`;
}

function buildMsaWindow(hasMsa, indexState, msaStepSize, msaWindowSize, msaColumnCount) {
  if (!hasMsa) return null;
  const frame = getMSAFrameIndex(indexState);
  return calculateWindow(frame, msaStepSize, msaWindowSize, msaColumnCount || 0);
}

export function HUD() {
  const hasMsa = useAppStore((s) => (s.msaColumnCount || 0) > 0 || !!s.movieData?.msa?.sequences);
  const currentTreeIndex = useAppStore((s) => s.currentTreeIndex);
  const timelineProgress = useAppStore((s) => s.timelineProgress);
  const transitionResolver = useAppStore((s) => s.transitionResolver);
  const treeListLength = useAppStore((s) => s.treeList?.length || 0);
  const msaWindowSize = useAppStore((s) => s.msaWindowSize);
  const msaStepSize = useAppStore((s) => s.msaStepSize);
  const msaColumnCount = useAppStore((s) => s.msaColumnCount);
  const goToPosition = useAppStore((s) => s.goToPosition);

  const proxyState = useMemo(
    () => ({ currentTreeIndex, transitionResolver, treeList: { length: treeListLength } }),
    [currentTreeIndex, transitionResolver, treeListLength]
  );

  const { progressText, segmentText, msaWindow, sequenceIndex } = useMemo(() => {
    const { sequenceIndex, totalSequenceLength } = getIndexMappings(proxyState);

    return {
      progressText: buildProgressText(sequenceIndex, totalSequenceLength, timelineProgress),
      segmentText: buildSegmentText(sequenceIndex, transitionResolver),
      msaWindow: buildMsaWindow(hasMsa, proxyState, msaStepSize, msaWindowSize, msaColumnCount),
      sequenceIndex,
    };

  }, [hasMsa, proxyState, transitionResolver, timelineProgress, msaStepSize, msaWindowSize, msaColumnCount]);

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
    <div className="phylo-hud pointer-events-none" data-react-component="hud" role="complementary" aria-label="Timeline Status Display">
      <Card className="pointer-events-auto flex items-center gap-4 px-4 py-2 shadow-lg backdrop-blur-sm">

        <div className="flex items-center gap-2">

          <Film className="size-4 text-primary" aria-hidden />

          <span className="text-sm font-medium text-foreground/80">Movie progress</span>

          <span id="hudPositionInfo" aria-live="polite" className="font-semibold text-foreground">{progressText}</span>

          <Slider
            aria-label="Timeline position"
            min={0}
            max={sliderMax}
            step={1}
            value={[sliderValue]}
            disabled={!canScrub}
            onValueCommit={handleSliderCommit}
            className="w-32"
          />
        </div>

        <Separator orientation="vertical" className="h-6" />

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

        {hasMsa && (
          <>
            <Separator orientation="vertical" className="h-6" />
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
          </>
        )}
      </Card>
    </div>
  );
}
