import React from 'react';
import {
  DISTANCE_CHART_METRIC_OPTIONS,
  getDistanceChartSectionLabel,
} from '../../DistanceChart/distanceChartLanguage.js';
import {
  selectBarOptionValue,
  selectHasMsa,
  selectSetBarOption,
  useAppStore,
} from '../../../state/phyloStore/store.js';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';

const loadDistanceChart = () =>
  import('../../DistanceChart/DistanceChart.jsx').then((module) => ({
    default: module.DistanceChart,
  }));
const DistanceChart = React.lazy(loadDistanceChart);

function MovieChartSectionComponent() {
  const barOptionValue = useAppStore(selectBarOptionValue);
  const setBarOption = useAppStore(selectSetBarOption);
  const hasMsa = useAppStore(selectHasMsa);
  const [chartExpanded, setChartExpanded] = React.useState(false);

  return (
    <div
      className="w-full bg-muted/10 px-2 py-1"
      role="region"
      aria-label="Input-tree metric chart"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <button
          type="button"
          aria-expanded={chartExpanded}
          aria-controls="distance-chart-panel"
          onClick={() => setChartExpanded((expanded) => !expanded)}
          className="min-w-0 truncate text-left text-2xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          {chartExpanded ? 'Hide' : 'Show'} {getDistanceChartSectionLabel(barOptionValue, hasMsa)}
        </button>

        <div className="shrink-0" role="group" aria-label="Chart controls">
          <Select value={barOptionValue} onValueChange={setBarOption}>
            <SelectTrigger
              className="h-7 w-[176px] bg-card/95"
              aria-describedby="chart-select-help"
            >
              <SelectValue placeholder="Metric" />
            </SelectTrigger>
            <SelectContent className="z-[2000]">
              <SelectGroup>
                {DISTANCE_CHART_METRIC_OPTIONS.map(({ value, label, description }) => (
                  <SelectItem key={value} value={value} title={description}>
                    {label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <div id="chart-select-help" className="sr-only">
            Choose the input-tree metric shown in the chart.
          </div>
        </div>
      </div>

      {chartExpanded ? (
        <div id="distance-chart-panel" className="mt-0.5 h-[50px] w-full min-w-0">
          <React.Suspense
            fallback={
              <div
                className="flex h-full items-center text-xs text-muted-foreground/50"
                role="status"
              >
                Loading chart…
              </div>
            }
          >
            <DistanceChart />
          </React.Suspense>
        </div>
      ) : null}
    </div>
  );
}

export const MovieChartSection = React.memo(MovieChartSectionComponent);
