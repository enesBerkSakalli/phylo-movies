import React, { useMemo } from 'react';
import { useAppStore } from '../../js/core/store.js';
import { formatScaleValue } from '../../js/utils/scaleUtils.js';
import { bin as d3Bin } from 'd3-array';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Ruler, Crosshair, ArrowDownUp, Palette } from 'lucide-react';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const collectBranchLengths = (node, lengths) => {
  if (!node || typeof node !== 'object') return;
  const len = Number(node.length);
  if (Number.isFinite(len)) lengths.push(Math.max(0, len));
  const kids = node.children;
  if (Array.isArray(kids)) {
    for (let i = 0; i < kids.length; i++) collectBranchLengths(kids[i], lengths);
  }
};

const buildHistogram = (lengths) => {
  if (!Array.isArray(lengths) || !lengths.length) return { bins: [], maxCount: 0, mean: 0, min: 0, max: 0 };
  const minLen = Math.min(...lengths);
  const maxLen = Math.max(...lengths);
  const total = lengths.reduce((sum, v) => sum + v, 0);
  const mean = lengths.length ? total / lengths.length : 0;

  // Single-value case: one discrete bin
  if (minLen === maxLen) {
    const singleBin = [{ from: minLen, to: minLen, count: lengths.length }];
    return { bins: singleBin, maxCount: lengths.length, mean, min: minLen, max: maxLen };
  }

  // If only a few unique discrete values, bucket exactly by value to avoid empty bins
  const valueCounts = new Map();
  lengths.forEach((v) => {
    valueCounts.set(v, (valueCounts.get(v) || 0) + 1);
  });
  const uniques = Array.from(valueCounts.keys()).sort((a, b) => a - b);
  if (uniques.length <= 6) {
    const bins = uniques.map((v) => ({ from: v, to: v, count: valueCounts.get(v) || 0 }));
    const maxCount = Math.max(...bins.map((b) => b.count));
    return { bins, maxCount, mean, min: minLen, max: maxLen };
  }

  const domainMin = minLen;
  const domainMax = Math.max(domainMin + 1e-6, maxLen);
  const thresholdCount = clamp(Math.ceil(Math.sqrt(lengths.length)), 6, 14);
  const binner = d3Bin().domain([domainMin, domainMax]).thresholds(thresholdCount);
  const binned = binner(lengths);
  const bins = binned.map((bucket) => ({
    from: bucket.x0 ?? 0,
    to: bucket.x1 ?? 0,
    count: bucket.length,
  }));
  const maxCount = binned.reduce((acc, bucket) => Math.max(acc, bucket.length), 0);
  return { bins, maxCount, mean, min: minLen, max: maxLen };
};

const buildScaleLookup = (scaleList) => {
  const map = new Map();
  if (!Array.isArray(scaleList)) return map;
  for (let i = 0; i < scaleList.length; i++) {
    const item = scaleList[i];
    const idx = typeof item === 'object' && item !== null && 'index' in item ? item.index : i;
    const val = typeof item === 'object' && item !== null && 'value' in item ? item.value : item;
    map.set(idx, Number(val) || 0);
  }
  return map;
};

const resolveAnchorIndex = (currentTreeIndex, fullTreeIndices, transitionResolver, scaleListLength) => {
  let anchorIndex = 0;
  try {
    const srcIdx = transitionResolver?.getSourceTreeIndex?.(currentTreeIndex);
    if (Number.isFinite(srcIdx) && srcIdx >= 0) {
      anchorIndex = Array.isArray(fullTreeIndices) ? (fullTreeIndices[srcIdx] ?? fullTreeIndices[0] ?? 0) : srcIdx;
    } else if (Array.isArray(fullTreeIndices)) {
      let chosen = fullTreeIndices[0] ?? 0;
      for (const fi of fullTreeIndices) {
        if (fi <= currentTreeIndex) chosen = fi; else break;
      }
      anchorIndex = chosen;
    } else {
      anchorIndex = clamp(currentTreeIndex, 0, Math.max(0, scaleListLength - 1));
    }
  } catch (_) {
    anchorIndex = clamp(currentTreeIndex || 0, 0, Math.max(0, scaleListLength - 1));
  }
  return anchorIndex;
};

const BranchLengthHistogram = ({ bins, maxCount, stats }) => {
  const columnCount = Math.max(bins?.length || 0, 1);
  return (
    <div className="flex flex-col gap-2 w-full" aria-label="Branch length distribution">
      <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <Palette className="size-3" aria-hidden />
        <span id="branch-lengths-label">Branch length distribution</span>
      </div>
      <div
        className="grid items-end gap-1 w-full"
        style={{ height: 64, gridTemplateColumns: `repeat(${columnCount}, minmax(4px, 1fr))` }}
      >
        {bins?.length ? (
          bins.map((bin, idx) => {
            const heightPx = maxCount > 0 ? Math.max(6, (bin.count / maxCount) * 52) : 0;
            return (
              <div key={`${idx}-${bin.from}`} className="flex flex-col items-center gap-1" style={{ minWidth: 4 }}>
                <div
                  title={`Len ${formatScaleValue(bin.from)} – ${formatScaleValue(bin.to)}: ${bin.count}`}
                  aria-labelledby="branch-lengths-label"
                  style={{
                    width: '100%',
                    background: 'var(--primary)',
                    height: `${heightPx}px`,
                    borderRadius: 3,
                    opacity: 0.8,
                  }}
                />
              </div>
            );
          })
        ) : (
          <span className="text-xs text-muted-foreground">No branch data</span>
        )}
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>min: {formatScaleValue(stats.min)}</span>
        <span>mean: {formatScaleValue(stats.mean)}</span>
        <span>max: {formatScaleValue(stats.max)}</span>
      </div>
    </div>
  );
};

const useScaleMetrics = ({ currentTreeIndex, treeList, scaleList, maxScale, fullTreeIndices, transitionResolver }) =>
  useMemo(() => {
    const scaleLookup = buildScaleLookup(scaleList);
    const anchorIndex = resolveAnchorIndex(currentTreeIndex, fullTreeIndices, transitionResolver, scaleList?.length || 0);

    // Only update histogram when showing an anchor tree to avoid jitter during interpolation
    const displayIndex = clamp(anchorIndex, 0, Math.max(0, treeList.length - 1));
    const lengths = [];
    const anchorTree = treeList[displayIndex];
    if (anchorTree) collectBranchLengths(anchorTree, lengths);
    const { bins, maxCount, mean, min, max } = buildHistogram(lengths);

    const currentScale = scaleLookup.get(anchorIndex) ?? 0;
    const progress = maxScale > 0 ? clamp(currentScale / maxScale, 0, 1) : 0;

    return {
      formattedCurrent: formatScaleValue(Number(currentScale) || 0),
      formattedMax: formatScaleValue(Number(maxScale) || 0),
      progress,
      histogramBins: bins,
      histogramMax: maxCount,
      histogramStats: { mean, min, max },
    };
  }, [currentTreeIndex, fullTreeIndices, maxScale, scaleList, transitionResolver, treeList]);

// React version of src/partials/top_scale_bar.html
// Keeps identical IDs and structure so existing code continues to work.
export function TopScaleBar() {
  const currentTreeIndex = useAppStore((s) => s.currentTreeIndex);
  const treeList = useAppStore((s) => s.treeList || []);
  const scaleList = useAppStore((s) => s.movieData?.scaleList);
  const maxScale = useAppStore((s) => s.movieData?.maxScale || 0);
  const fullTreeIndices = useAppStore((s) => s.movieData?.fullTreeIndices);
  const transitionResolver = useAppStore((s) => s.transitionResolver);

  const { formattedCurrent, formattedMax, progress, histogramBins, histogramMax, histogramStats } = useScaleMetrics({
    currentTreeIndex,
    treeList,
    scaleList,
    maxScale,
    fullTreeIndices,
    transitionResolver,
  });

  const progressPercent = Math.round((progress || 0) * 100);

  return (
    <div
      className="top-scale-bar"
      role="region"
      aria-label="Phylogenetic Scale Tracker"
      style={{ maxWidth: 240, minWidth: 180, width: '100%', overflow: 'hidden' }}
    >
      <div className="scale-header">
        <Ruler className="size-4" />
        <span className="scale-title">Scale</span>
      </div>
      <div className="scale-values" aria-live="polite">
        <Badge variant="secondary">
          <Crosshair className="size-3" />
          <span id="currentScaleText">{formattedCurrent}</span>
        </Badge>
        <BranchLengthHistogram bins={histogramBins} maxCount={histogramMax} stats={histogramStats} />
      </div>
      <div className="scale-bar-container" aria-label="Scale relative to maximum">
        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Ruler className="size-3" aria-hidden />
          <span id="scale-max-label">Scale progress (max {formattedMax})</span>
        </div>
        <Progress id="scale-progress" aria-labelledby="scale-max-label" value={progressPercent} />
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
