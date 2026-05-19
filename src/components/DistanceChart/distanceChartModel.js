import {
  formatDistancePointLabel,
  formatMetricValue,
  formatScalePointLabel,
} from './distanceChartLanguage.js';

const safeNumber = (value, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const resolveDistancePair = (sampleIndex, pairInterpolationRanges = []) => {
  const range = pairInterpolationRanges[sampleIndex];
  if (Array.isArray(range) && Number.isInteger(range[0]) && Number.isInteger(range[1])) {
    return {
      sourceInputTreeIndex: range[0],
      targetInputTreeIndex: range[1],
    };
  }

  return {
    sourceInputTreeIndex: sampleIndex,
    targetInputTreeIndex: sampleIndex + 1,
  };
};

const buildDistancePoints = (values, pairInterpolationRanges = []) => (
  (values || []).map((value, index) => {
    const pair = resolveDistancePair(index, pairInterpolationRanges);
    return {
      x: index + 1,
      y: safeNumber(value),
      sampleIndex: index,
      ...pair,
      contextLabel: formatDistancePointLabel(pair.sourceInputTreeIndex, pair.targetInputTreeIndex),
    };
  })
);

export const buildSeriesPoints = (
  barOptionValue,
  robinsonFouldsDistances,
  weightedRobinsonFouldsDistances,
  scaleList,
  pairInterpolationRanges = []
) => {
  if (barOptionValue === 'rfd') {
    return {
      points: buildDistancePoints(robinsonFouldsDistances, pairInterpolationRanges),
      yMax: 1,
    };
  }

  if (barOptionValue === 'w-rfd') {
    return {
      points: buildDistancePoints(weightedRobinsonFouldsDistances, pairInterpolationRanges),
      yMax: 'auto',
    };
  }

  if (barOptionValue === 'scale') {
    return {
      points: (scaleList || []).map((entry, index) => ({
        x: index + 1,
        y: safeNumber(entry?.value),
        sampleIndex: index,
        frameIndex: Number.isInteger(entry?.index) ? entry.index : index,
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

export const resolveActivePointIndex = (barOptionValue, frameIndex, inputTreeIndices, points) => {
  if (!points.length) return 0;

  if (barOptionValue === 'scale') {
    const scaleFrameIndices = points.map((point) => point.frameIndex);
    return findActiveInputTreeIndex(scaleFrameIndices, frameIndex);
  }

  const lastDistanceIndex = Math.max(0, points.length - 1);
  const inputTreeIndex = findActiveInputTreeIndex(inputTreeIndices, frameIndex);
  return Math.min(lastDistanceIndex, inputTreeIndex);
};

export const resolveCursorX = (points, activePointIndex) => (
  points[activePointIndex]?.x ?? 1
);

const buildNavigationTarget = (frameIndex, movieTimelineManager) => {
  if (!Number.isInteger(frameIndex)) return null;

  const timelineProgress = movieTimelineManager?.getTimelineProgressForFrameIndex?.(frameIndex);
  return {
    frameIndex,
    seekOptions: Number.isFinite(timelineProgress) ? { timelineProgress } : undefined,
  };
};

export const resolveNavigationTarget = (barOptionValue, point, transitionResolver, movieTimelineManager) => {
  if (!point) return null;

  if (barOptionValue === 'scale') {
    return buildNavigationTarget(point.frameIndex, movieTimelineManager);
  }

  const targetFrameIndex = transitionResolver?.getTreeIndexForDistanceIndex?.(point.sampleIndex)
    ?? point.sourceInputTreeIndex;
  return buildNavigationTarget(targetFrameIndex, movieTimelineManager);
};

export const buildPointValueText = (metric, point, pointCount) => {
  if (!point) return `No ${metric.label.toLowerCase()} point selected`;

  return [
    `${point.contextLabel}`,
    `${metric.label} ${formatMetricValue(point.y)}`,
    `point ${point.sampleIndex + 1} of ${pointCount}`,
  ].join(', ');
};
