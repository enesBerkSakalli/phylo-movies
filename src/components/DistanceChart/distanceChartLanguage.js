export const DISTANCE_CHART_METRICS = {
  rfd: {
    label: 'Topology Change',
    description: 'RF distance between neighboring input trees',
    color: '#0072B2',
  },
  'w-rfd': {
    label: 'Branch-Weighted Change',
    description: 'Weighted RF distance between neighboring input trees',
    color: '#E69F00',
  },
  scale: {
    label: 'Tree Size',
    description: 'Longest root-to-leaf distance for each input tree',
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
  `source input tree ${sourceInputTreeIndex + 1} to target input tree ${targetInputTreeIndex + 1}`;

export const formatScalePointLabel = (inputTreeOrdinal) => `Input tree ${inputTreeOrdinal}`;
