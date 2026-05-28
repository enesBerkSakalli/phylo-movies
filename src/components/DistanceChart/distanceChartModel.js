import {
  formatDistancePointLabel,
  formatGenomeDistancePointLabel,
  formatGenomeScalePointLabel,
  formatMetricValue,
  formatScalePointLabel,
} from './distanceChartLanguage.js';
import { calculateWindow } from '../../domain/msa/msaWindowCalculator.js';

const safeNumber = (value, defaultValue = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : defaultValue;
};

const resolveDistancePair = (pair) => ({
  sourceInputTreeIndex: pair.source_input_tree_index,
  targetInputTreeIndex: pair.target_input_tree_index,
  sourceFrameIndex: pair.source_frame_index,
});

const hasGenomeWindowAxis = (options = {}) =>
  Boolean(options.hasMsa) &&
  Number.isFinite(options.msaStepSize) &&
  Number.isFinite(options.msaWindowSize) &&
  Number.isFinite(options.msaColumnCount) &&
  options.msaStepSize > 0 &&
  options.msaWindowSize > 0 &&
  options.msaColumnCount > 0;

const resolveMsaWindow = (inputTreeIndex, options) => {
  if (!hasGenomeWindowAxis(options) || !Number.isInteger(inputTreeIndex)) return null;
  return calculateWindow(
    inputTreeIndex,
    options.msaStepSize,
    options.msaWindowSize,
    options.msaColumnCount
  );
};

const resolveDistanceX = (sourceWindow, targetWindow, fallbackX) => {
  if (!sourceWindow || !targetWindow) return fallbackX;
  return (sourceWindow.midPosition + targetWindow.midPosition) / 2;
};

const buildDistancePoints = (pairMetrics, pairs, metricKey, options = {}) => {
  const metricByPairId = new Map(pairMetrics.rows.map((row) => [row.pair_id, row]));

  return pairs.map((pair, index) => {
    const metricRow = metricByPairId.get(pair.pair_id) ?? {};
    const pairOrdinal = Number.isInteger(pair.pair_ordinal) ? pair.pair_ordinal : index;
    const resolvedPair = resolveDistancePair(pair);
    const sourceWindow = resolveMsaWindow(resolvedPair.sourceInputTreeIndex, options);
    const targetWindow = resolveMsaWindow(resolvedPair.targetInputTreeIndex, options);
    const fallbackX = pairOrdinal + 1;

    return {
      x: resolveDistanceX(sourceWindow, targetWindow, fallbackX),
      y: safeNumber(metricRow[metricKey]),
      sampleIndex: pairOrdinal,
      pairId: pair.pair_id,
      sourceWindow,
      targetWindow,
      ...resolvedPair,
      contextLabel: sourceWindow
        ? formatGenomeDistancePointLabel({
            ...resolvedPair,
            sourceWindow,
            targetWindow,
          })
        : formatDistancePointLabel(
            resolvedPair.sourceInputTreeIndex,
            resolvedPair.targetInputTreeIndex
          ),
    };
  });
};

export const buildSeriesPoints = (barOptionValue, pairMetrics, scaleList, pairs, options = {}) => {
  if (barOptionValue === 'rfd') {
    return {
      points: buildDistancePoints(pairMetrics, pairs, 'robinson_foulds', options),
      yMax: 1,
    };
  }

  if (barOptionValue === 'w-rfd') {
    return {
      points: buildDistancePoints(pairMetrics, pairs, 'weighted_robinson_foulds', options),
      yMax: 'auto',
    };
  }

  if (barOptionValue === 'scale') {
    return {
      points: scaleList.map((entry, index) => {
        const window = resolveMsaWindow(index, options);
        return {
          x: window?.midPosition ?? index + 1,
          y: safeNumber(entry.value),
          sampleIndex: index,
          frameIndex: entry.index,
          sourceWindow: window,
          contextLabel: window
            ? formatGenomeScalePointLabel(index + 1, window)
            : formatScalePointLabel(index + 1),
        };
      }),
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
  const cursorInputTreeIndex = Number.isInteger(timelineCursor?.sourceInputTreeIndex)
    ? timelineCursor.sourceInputTreeIndex
    : Number.isInteger(timelineCursor?.inputTreeIndex)
      ? timelineCursor.inputTreeIndex
      : null;

  if (cursorInputTreeIndex === null) return 0;

  let activeIndex = 0;
  for (let i = 0; i < points.length; i++) {
    if (points[i].sourceInputTreeIndex <= cursorInputTreeIndex) {
      activeIndex = i;
    } else {
      break;
    }
  }

  return Math.min(lastDistanceIndex, activeIndex);
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
