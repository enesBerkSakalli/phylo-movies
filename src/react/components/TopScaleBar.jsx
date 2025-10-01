import React, { useMemo } from 'react';
import { useAppStore } from '../../js/core/store.js';
import { formatScaleValue } from '../../js/utils/scaleUtils.js';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Ruler, Crosshair, ArrowDownUp, Palette } from 'lucide-react';

// React version of src/partials/top_scale_bar.html
// Keeps identical IDs and structure so existing code continues to work.
export function TopScaleBar() {
  const currentTreeIndex = useAppStore((s) => s.currentTreeIndex);
  const scaleList = useAppStore((s) => s.movieData?.scaleList);
  const maxScale = useAppStore((s) => s.movieData?.maxScale || 0);
  const fullTreeIndices = useAppStore((s) => s.movieData?.fullTreeIndices);
  const transitionResolver = useAppStore((s) => s.transitionResolver);

  const { currentScale, progress, formattedCurrent, formattedMax } = useMemo(() => {
    let value = 0;
    const ms = maxScale || 0; // capture from closure

    if (Array.isArray(scaleList) && scaleList.length) {
      // Build index->value map to support both object and primitive entries
      const byIndex = new Map();
      for (let i = 0; i < scaleList.length; i++) {
        const item = scaleList[i];
        const idx = typeof item === 'object' && item !== null && 'index' in item ? item.index : i;
        const val = typeof item === 'object' && item !== null && 'value' in item ? item.value : item;
        byIndex.set(idx, Number(val) || 0);
      }

      // Map current tree index to an anchor index (source tree for current transition)
      let anchorIndex = 0;
      try {
        const srcIdx = transitionResolver?.getSourceTreeIndex?.(currentTreeIndex);
        if (Number.isFinite(srcIdx) && srcIdx >= 0) {
          // srcIdx is the distance index between anchors; map to the preceding anchor
          anchorIndex = Array.isArray(fullTreeIndices) ? (fullTreeIndices[srcIdx] ?? fullTreeIndices[0] ?? 0) : srcIdx;
        } else if (Array.isArray(fullTreeIndices)) {
          // Fallback: choose nearest anchor at or before current index
          let chosen = fullTreeIndices[0] ?? 0;
          for (const fi of fullTreeIndices) {
            if (fi <= currentTreeIndex) chosen = fi; else break;
          }
          anchorIndex = chosen;
        } else {
          anchorIndex = Math.max(0, Math.min(currentTreeIndex, scaleList.length - 1));
        }
      } catch (_) {
        anchorIndex = Math.max(0, Math.min(currentTreeIndex || 0, scaleList.length - 1));
      }

      value = byIndex.get(anchorIndex) ?? 0;
    }

    const prog = ms > 0 ? Math.max(0, Math.min(1, value / ms)) : 0;
    return {
      currentScale: value,
      progress: prog,
      formattedCurrent: formatScaleValue(Number(value) || 0),
      formattedMax: formatScaleValue(Number(maxScale) || 0),
    };
  }, [currentTreeIndex, scaleList, maxScale, fullTreeIndices, transitionResolver]);

  const progressPercent = Math.round((progress || 0) * 100);

  return (
    <div className="top-scale-bar" role="region" aria-label="Phylogenetic Scale Tracker">
      <div className="scale-header">
        <Ruler className="size-4" />
        <span className="scale-title">Scale</span>
      </div>
      <div className="scale-values" aria-live="polite">
        <Badge variant="secondary">
          <Crosshair className="size-3" />
          <span id="currentScaleText">{formattedCurrent}</span>
        </Badge>
        <Badge>
          <ArrowDownUp className="size-3" />
          <span id="maxScaleText">{formattedMax}</span>
        </Badge>
      </div>
      <div className="scale-bar-container">
        <Progress id="scale-progress" aria-label="Scale progress" value={progressPercent} />
      </div>

      <div className="legend-section" role="region" aria-label="Taxa Groups Legend">
        <div className="legend-header">
          <Palette className="size-4" />
          <span className="legend-title">Groups</span>
        </div>
        <div id="taxaLegend" className="taxa-legend taxa-legend-vertical" role="list" aria-label="Taxa groups legend"></div>
      </div>
    </div>
  );
}
