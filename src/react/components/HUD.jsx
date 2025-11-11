import React, { useMemo } from 'react';
import { useAppStore } from '../../js/core/store.js';
import { getIndexMappings, getMSAFrameIndex } from '../../js/core/IndexMapping.js';
import { calculateWindow } from '../../js/utils/windowUtils.js';
import { Film, BarChart2, Columns3 } from 'lucide-react';

export function HUD() {
  const hasMsa = useAppStore((s) => (s.msaColumnCount || 0) > 0 || !!s.movieData?.msa?.sequences);
  const currentTreeIndex = useAppStore((s) => s.currentTreeIndex);
  const timelineProgress = useAppStore((s) => s.timelineProgress);
  const transitionResolver = useAppStore((s) => s.transitionResolver);
  const treeListLength = useAppStore((s) => s.treeList?.length || 0);
  const msaWindowSize = useAppStore((s) => s.msaWindowSize);
  const msaStepSize = useAppStore((s) => s.msaStepSize);
  const msaColumnCount = useAppStore((s) => s.msaColumnCount);

  const proxyState = useMemo(
    () => ({ currentTreeIndex, transitionResolver, treeList: { length: treeListLength } }),
    [currentTreeIndex, transitionResolver, treeListLength]
  );

  const { progressText, segmentText, msaWindow } = useMemo(() => {
    try {
      const { sequenceIndex, totalSequenceLength } = getIndexMappings(proxyState);
      const tlProgress = typeof timelineProgress === 'number' ? timelineProgress : null;
      const progress = tlProgress != null ? tlProgress : (totalSequenceLength > 1 ? sequenceIndex / (totalSequenceLength - 1) : 0);
      const progressText = `${Math.round(progress * 100)}%`;

      // Interpolation/segment text
      let segmentText = '';
      const resolver = transitionResolver;
      const fti = resolver?.fullTreeIndices || [];
      // find full tree anchor index if exactly on anchor
      const fullTreeAnchorIdx = fti.indexOf(sequenceIndex);
      if (fullTreeAnchorIdx >= 0) {
        segmentText = `Original tree ${fullTreeAnchorIdx + 1}`;
      } else if (fti.length > 0) {
        // Find previous and next anchor sequence indices
        let prevIdx = 0;
        for (let i = fti.length - 1; i >= 0; i--) {
          if (fti[i] <= sequenceIndex) { prevIdx = i; break; }
        }
        const nextIdx = prevIdx + 1;

        // Only show interpolation if there is a next tree
        if (nextIdx < fti.length) {
          const prevSeq = fti[prevIdx];
          const nextSeq = fti[nextIdx];
          const denom = Math.max(1, nextSeq - prevSeq);
          const pct = Math.round(((sequenceIndex - prevSeq) / denom) * 100);
          segmentText = `Tree ${prevIdx + 1} → ${nextIdx + 1} (${pct}%)`;
        } else {
          // At or past the last anchor
          segmentText = `Original tree ${prevIdx + 1}`;
        }
      }

      // MSA window
      let msaWindow = null;
      if (hasMsa) {
        const frame = getMSAFrameIndex(proxyState);
        msaWindow = calculateWindow(frame, msaStepSize, msaWindowSize, msaColumnCount || 0);
      }

      return { progressText, segmentText, msaWindow };
    } catch (e) {
      return { progressText: '', segmentText: '', msaWindow: null };
    }
  }, [hasMsa, proxyState, transitionResolver, timelineProgress, msaStepSize, msaWindowSize, msaColumnCount]);

  return (
    <div className="phylo-hud" data-react-component="hud" role="complementary" aria-label="Timeline Status Display">
      <div className="hud-metrics">
        <div className="hud-item">
          <Film className="size-4" />
          <span className="hud-label">Movie progress:</span>
          <span id="hudPositionInfo" aria-live="polite">{progressText}</span>
        </div>

        <div className="hud-separator">•</div>

        <div className="hud-item">
          <BarChart2 className="size-4" />
          <span className="hud-label">Interpolation:</span>
          <span id="hudSegmentInfo" aria-live="polite">{segmentText}</span>
        </div>

        <div className="hud-separator requires-msa" style={{ display: hasMsa ? 'inline-flex' : 'none' }}>•</div>

        <div className="hud-item requires-msa" id="hud-msa-window-item" style={{ display: hasMsa ? 'inline-flex' : 'none' }}>
          <Columns3 className="size-4" />
          <span className="hud-label">MSA:</span>
          <span className="metrics-window">
            <span id="hudWindowStart" className="metrics-window-value">{msaWindow?.startPosition ?? 1}</span>
            <span>-</span>
            <span id="hudWindowMid" className="metrics-window-value metrics-window-value--primary">{msaWindow?.midPosition ?? 1}</span>
            <span>-</span>
            <span id="hudWindowEnd" className="metrics-window-value">{msaWindow?.endPosition ?? msaWindowSize ?? 100}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
