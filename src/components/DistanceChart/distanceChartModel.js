import {
  formatDistancePointLabel,
  formatMetricValue,
  formatScalePointLabel,
} from './distanceChartLanguage.js';

const safeNumber = (value, defaultValue = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : defaultValue;
};

const resolveDistancePair = (pair) => ({
  sourceInputTreeIndex: pair.source_input_tree_index,
  targetInputTreeIndex: pair.target_input_tree_index,
  sourceFrameIndex: pair.source_frame_index,
});

const buildDistancePoints = (pairMetrics, pairs, metricKey) => {
  const pairById = new Map(pairs.map((pair) => [pair.pair_id, pair]));
  return pairMetrics.rows.map((metricRow, index) => {
    const pair = resolveDistancePair(pairById.get(metricRow.pair_id));
    return {
      x: index + 1,
      y: safeNumber(metricRow[metricKey]),
      sampleIndex: metricRow.pair_ordinal,
      pairId: metricRow.pair_id,
      ...pair,
      contextLabel: formatDistancePointLabel(pair.sourceInputTreeIndex, pair.targetInputTreeIndex),
    };
  });
};

export const buildSeriesPoints = (barOptionValue, pairMetrics, scaleList, pairs) => {
  if (barOptionValue === 'rfd') {
    return {
      points: buildDistancePoints(pairMetrics, pairs, 'robinson_foulds'),
      yMax: 1,
    };
  }

  if (barOptionValue === 'w-rfd') {
    return {
      points: buildDistancePoints(pairMetrics, pairs, 'weighted_robinson_foulds'),
      yMax: 'auto',
    };
  }

  if (barOptionValue === 'scale') {
    return {
      points: scaleList.map((entry, index) => ({
        x: index + 1,
        y: safeNumber(entry.value),
        sampleIndex: index,
        frameIndex: entry.index,
        contextLabel: formatScalePointLabel(index + 1),
      })),
      yMax: 'auto',
    };
  }

  return { points: [], yMax: 'auto' };
};

export const findActiveInputTreeIndex = (inputTreeIndices, frameIndex) => {
  const currentIndex = frameIndex ?? 0;
  let activeIndex = 0;

  for (let i = 0; i < inputTreeIndices.length; i++) {
    if (inputTreeIndices[i] <= currentIndex) {
      activeIndex = i;
    } else {
      break;
    }
  }

  return activeIndex;
};

export const resolveActivePointIndex = (
  barOptionValue,
  timelineCursor,
  inputTreeIndices,
  points
) => {
  if (!points.length) return 0;

  if (barOptionValue === 'scale') {
    const scaleFrameIndices = points.map((point) => point.frameIndex);
    return findActiveInputTreeIndex(scaleFrameIndices, timelineCursor?.sourceFrameIndex);
  }

  const lastDistanceIndex = Math.max(0, points.length - 1);
  const cursorInputTreeIndex =
    timelineCursor?.sourceInputTreeIndex ?? timelineCursor?.inputTreeIndex;
  const inputTreeIndex = findActiveInputTreeIndex(inputTreeIndices, cursorInputTreeIndex);
  return Math.min(lastDistanceIndex, inputTreeIndex);
};

export const resolveCursorX = (points, activePointIndex) => points[activePointIndex]?.x ?? 1;

const buildNavigationTarget = (frameIndex) => {
  if (!Number.isInteger(frameIndex)) return null;

  return {
    frameIndex,
  };
};

export const resolveNavigationTarget = (barOptionValue, point) => {
  if (!point) return null;

  if (barOptionValue === 'scale') {
    return buildNavigationTarget(point.frameIndex);
  }

  return buildNavigationTarget(point.sourceFrameIndex);
};

export const buildPointValueText = (metric, point, pointCount) => {
  if (!point) return `No ${metric.label.toLowerCase()} point selected`;

  return [
    `${point.contextLabel}`,
    `${metric.label} ${formatMetricValue(point.y)}`,
    `point ${point.sampleIndex + 1} of ${pointCount}`,
  ].join(', ');
};
