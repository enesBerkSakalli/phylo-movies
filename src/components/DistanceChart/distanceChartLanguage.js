export const DISTANCE_CHART_METRICS = {
  rfd: {
    label: 'Normalized RF',
    description:
      'Normalized Robinson-Foulds distance: symmetric difference of internal bipartitions divided by the split-count sum.',
    color: '#0072B2',
  },
  'w-rfd': {
    label: 'Raw Weighted RF',
    description:
      'Raw weighted split-length change: sum of absolute branch-length differences between neighboring input trees; not normalized.',
    color: '#E69F00',
  },
  scale: {
    label: 'Raw Tree Size',
    description: 'Raw longest root-to-leaf distance for each input tree.',
    color: '#009E73',
  },
};

export const DISTANCE_CHART_METRIC_OPTIONS = ['rfd', 'w-rfd', 'scale'].map((value) => ({
  value,
  ...DISTANCE_CHART_METRICS[value],
}));

export const getDistanceChartMetric = (value) =>
  DISTANCE_CHART_METRICS[value] || DISTANCE_CHART_METRICS.rfd;

export const formatMetricValue = (value) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return '0';

  return numberValue.toLocaleString(undefined, {
    maximumFractionDigits: Math.abs(numberValue) < 1 ? 3 : 2,
  });
};

export const formatDistancePointLabel = (sourceInputTreeIndex, targetInputTreeIndex) =>
  `Tree ${sourceInputTreeIndex + 1} -> ${targetInputTreeIndex + 1}`;

export const formatScalePointLabel = (inputTreeOrdinal) => `Input tree ${inputTreeOrdinal}`;

export const formatMsaWindowRangeLabel = (window) =>
  window ? `${window.startPosition}-${window.endPosition}` : null;

export const formatGenomeDistancePointLabel = ({
  sourceInputTreeIndex,
  targetInputTreeIndex,
  sourceWindow,
  targetWindow,
}) => {
  const sourceWindowLabel = formatMsaWindowRangeLabel(sourceWindow);
  const targetWindowLabel = formatMsaWindowRangeLabel(targetWindow);
  const treeLabel = formatDistancePointLabel(sourceInputTreeIndex, targetInputTreeIndex);

  if (!sourceWindowLabel || !targetWindowLabel) return treeLabel;
  return `${treeLabel}; genome windows ${sourceWindowLabel} -> ${targetWindowLabel}`;
};

export const formatGenomeScalePointLabel = (inputTreeOrdinal, window) => {
  const windowLabel = formatMsaWindowRangeLabel(window);
  return windowLabel
    ? `Input tree ${inputTreeOrdinal}; genome window ${windowLabel}`
    : formatScalePointLabel(inputTreeOrdinal);
};
