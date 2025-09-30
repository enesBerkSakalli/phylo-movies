import React, { useMemo } from 'react';
import { useAppStore } from '../../js/core/store.js';
import { getIndexMappings, getMSAFrameIndex } from '../../js/core/IndexMapping.js';
import { calculateWindow } from '../../js/utils/windowUtils.js';

export function HUD() {
  const hasMsa = useAppStore((s) => (s.msaColumnCount || 0) > 0 || !!s.movieData?.msa?.sequences);
  const storeState = useAppStore((s) => s);

  const { progressText, segmentText, msaWindow } = useMemo(() => {
    try {
      const state = storeState;
      const { sequenceIndex, totalSequenceLength } = getIndexMappings(state);
      const tlProgress = typeof state.timelineProgress === 'number' ? state.timelineProgress : null;
      const progress = tlProgress != null ? tlProgress : (totalSequenceLength > 1 ? sequenceIndex / (totalSequenceLength - 1) : 0);
      const progressText = `${Math.round(progress * 100)}%`;

      // Interpolation/segment text
      let segmentText = '';
      const resolver = state.transitionResolver;
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
        const nextIdx = Math.min(fti.length - 1, prevIdx + 1);
        const prevSeq = fti[prevIdx];
        const nextSeq = fti[nextIdx];
        const denom = Math.max(1, nextSeq - prevSeq);
        const pct = Math.round(((sequenceIndex - prevSeq) / denom) * 100);
        segmentText = `Tree ${prevIdx + 1} → ${nextIdx + 1} (${pct}%)`;
      }

      // MSA window
      let msaWindow = null;
      if (hasMsa) {
        const frame = getMSAFrameIndex(state);
        const { msaStepSize, msaWindowSize, msaColumnCount } = state;
        msaWindow = calculateWindow(frame, msaStepSize, msaWindowSize, msaColumnCount || 0);
      }

      return { progressText, segmentText, msaWindow };
    } catch (e) {
      return { progressText: '', segmentText: '', msaWindow: null };
    }
  }, [storeState, hasMsa]);

  return (
    <div className="phylo-hud nav-visible" data-react-component="hud" role="complementary" aria-label="Timeline Status Display">
      <div className="hud-metrics">
        <div className="hud-item">
          <md-icon>movie</md-icon>
          <span className="hud-label">Movie progress:</span>
          <span id="hudPositionInfo" aria-live="polite">{progressText}</span>
        </div>

        <div className="hud-separator">•</div>

        <div className="hud-item">
          <md-icon>analytics</md-icon>
          <span className="hud-label">Interpolation:</span>
          <span id="hudSegmentInfo" aria-live="polite">{segmentText}</span>
        </div>

        <div className="hud-separator requires-msa" style={{ display: hasMsa ? 'inline-flex' : 'none' }}>•</div>

        <div className="hud-item requires-msa" id="hud-msa-window-item" style={{ display: hasMsa ? 'inline-flex' : 'none' }}>
          <md-icon>view_column</md-icon>
          <span className="hud-label">MSA:</span>
          <span className="metrics-window">
            <span id="hudWindowStart" className="metrics-window-value">{msaWindow?.startPosition ?? 1}</span>
            <span>-</span>
            <span id="hudWindowMid" className="metrics-window-value metrics-window-value--primary">{msaWindow?.midPosition ?? 1}</span>
            <span>-</span>
            <span id="hudWindowEnd" className="metrics-window-value">{msaWindow?.endPosition ?? storeState.msaWindowSize ?? 100}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
