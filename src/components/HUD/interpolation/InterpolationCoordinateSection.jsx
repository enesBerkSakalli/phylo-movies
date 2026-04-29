import React, { useCallback, useMemo } from 'react';
import { Film } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { AppTooltip } from '@/components/ui/app-tooltip';
import { getIndexMappings } from '@/domain/indexing/IndexMapping';
import { useAppStore } from '@/state/phyloStore/store.js';
import {
  buildInterpolationText,
  selectAnimationProgress,
  selectCurrentTreeIndex,
  selectGoToPosition,
  selectPlaying,
  selectTimelineProgress,
  selectTransitionResolver,
  selectTreeListLength,
} from '../shared/hudShared.js';

export function InterpolationCoordinateSection() {
  const currentTreeIndex = useAppStore(selectCurrentTreeIndex);
  const timelineProgress = useAppStore(selectTimelineProgress);
  const animationProgress = useAppStore(selectAnimationProgress);
  const playing = useAppStore(selectPlaying);
  const transitionResolver = useAppStore(selectTransitionResolver);
  const treeListLength = useAppStore(selectTreeListLength);
  const goToPosition = useAppStore(selectGoToPosition);

  const proxyState = useMemo(
    () => ({ currentTreeIndex, transitionResolver, treeList: { length: treeListLength } }),
    [currentTreeIndex, transitionResolver, treeListLength]
  );

  const { interpolationText, sequenceIndex } = useMemo(() => {
    const { sequenceIndex, totalSequenceLength } = getIndexMappings(proxyState);
    return {
      interpolationText: buildInterpolationText(sequenceIndex, totalSequenceLength, transitionResolver, timelineProgress, animationProgress, playing),
      sequenceIndex,
    };
  }, [proxyState, transitionResolver, timelineProgress, animationProgress, playing]);

  const sliderMax = Math.max(0, treeListLength - 1);
  const sliderValue = Math.min(sliderMax, Math.max(0, sequenceIndex || 0));
  const canScrub = sliderMax > 0 && !!goToPosition;

  const onSliderCommit = useCallback(
    (vals) => {
      if (!canScrub) return;
      const v = Array.isArray(vals) ? vals[0] : sliderValue;
      if (v == null || Number.isNaN(v)) return;
      goToPosition(Math.max(0, Math.min(sliderMax, Math.round(v))));
    },
    [canScrub, goToPosition, sliderMax, sliderValue]
  );

  return (
    <div className="flex items-center gap-2">
      <Film className="size-3.5 text-primary" aria-hidden />
      <div className="flex flex-col gap-0">
        <span className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">Position</span>
        <AppTooltip
          content={
            <div className="space-y-1">
              <div>Sequence position, 0=start and 1=end:</div>
              <div className="font-bold text-primary tabular-nums">
                {typeof interpolationText === 'object' ? interpolationText.fullPrecision : interpolationText}
              </div>
            </div>
          }
          contentClassName="border-border/60 bg-popover text-2xs font-mono text-popover-foreground"
        >
          <span id="hudPositionInfo" aria-live="polite" className="text-xs font-bold text-foreground cursor-help hover:text-primary/80 transition-colors max-w-[7.5rem] truncate">
            {typeof interpolationText === 'object' ? interpolationText.display : interpolationText}
          </span>
        </AppTooltip>
      </div>
      <Slider
        aria-label="Timeline position"
        min={0}
        max={sliderMax}
        step={1}
        value={[sliderValue]}
        disabled={!canScrub}
        onValueCommit={onSliderCommit}
        className="w-16 ml-1"
      />
    </div>
  );
}
