export const MIN_READABLE_METRIC_SCALE = 0.45;

export function getReadableMetricScale(cached) {
  const explicitScale = Number(cached?.readableMetricScale);
  if (Number.isFinite(explicitScale)) return Math.max(MIN_READABLE_METRIC_SCALE, explicitScale);

  const metricScale = Number(cached?.metricScale);
  if (!Number.isFinite(metricScale)) return 1;
  return Math.max(MIN_READABLE_METRIC_SCALE, metricScale);
}
