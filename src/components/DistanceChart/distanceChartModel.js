import {
  formatDistancePointLabel,
  formatMetricValue,
  formatScalePointLabel,
} from './distanceChartLanguage.js';

const safeNumber = (value, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const buildDistancePoints = (values) => (
  (values || []).map((value, index) => ({
    x: index + 1,
    y: safeNumber(value),
    sampleIndex: index,
    contextLabel: formatDistancePointLabel(index),
  }))
);

export const buildSeriesPoints = (
  barOptionValue,
  robinsonFouldsDistances,
  weightedRobinsonFouldsDistances,
  scaleList
) => {
  if (barOptionValue === 'rfd') {
    return {
      points: buildDistancePoints(robinsonFouldsDistances),
      yMax: 1,
    };
  }

  if (barOptionValue === 'w-rfd') {
    return {
      points: buildDistancePoints(weightedRobinsonFouldsDistances),
      yMax: 'auto',
    };
  }

  if (barOptionValue === 'scale') {
    return {
      points: (scaleList || []).map((entry, index) => ({
        x: index + 1,
        y: safeNumber(entry?.value),
        sampleIndex: index,
        treeIndex: Number.isInteger(entry?.index) ? entry.index : index,
        contextLabel: formatScalePointLabel(index + 1),
      })),
      yMax: 'auto',
    };
  }

  return { points: [], yMax: 'auto' };
};

export const findActiveAnchorIndex = (anchors, currentTreeIndex) => {
  const currentIndex = currentTreeIndex ?? 0;
  let activeIndex = 0;

  for (let i = 0; i < anchors.length; i++) {
    if (anchors[i] <= currentIndex) {
      activeIndex = i;
    } else {
      break;
    }
  }

  return activeIndex;
};

export const resolveActivePointIndex = (barOptionValue, currentTreeIndex, anchors, points) => {
  if (!points.length) return 0;

  if (barOptionValue === 'scale') {
    const scaleAnchors = points.map((point) => point.treeIndex);
    return findActiveAnchorIndex(scaleAnchors, currentTreeIndex);
  }

  const lastDistanceIndex = Math.max(0, points.length - 1);
  const anchorIndex = findActiveAnchorIndex(anchors, currentTreeIndex);
  return Math.min(lastDistanceIndex, anchorIndex);
};

export const resolveCursorX = (points, activePointIndex) => (
  points[activePointIndex]?.x ?? 1
);

export const resolveNavigationTarget = (barOptionValue, point, transitionResolver) => {
  if (!point) return null;

  if (barOptionValue === 'scale') {
    return Number.isInteger(point.treeIndex) ? point.treeIndex : null;
  }

  const target = transitionResolver?.getTreeIndexForDistanceIndex?.(point.sampleIndex);
  return typeof target === 'number' ? target : null;
};

export const buildPointValueText = (metric, point, pointCount) => {
  if (!point) return `No ${metric.label.toLowerCase()} point selected`;

  return [
    `${point.contextLabel}`,
    `${metric.label} ${formatMetricValue(point.y)}`,
    `point ${point.sampleIndex + 1} of ${pointCount}`,
  ].join(', ');
};
