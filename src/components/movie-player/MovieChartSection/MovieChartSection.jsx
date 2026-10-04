import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';
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

  // Rendered inside the player bar's footer row, which orders the pieces: the
  // toggle first, the metric picker on the right, the chart panel full width last
  // (after the legend, which takes its own row on narrow screens).
  return (
    <>
      <button
        type="button"
        aria-expanded={chartExpanded}
        aria-controls="distance-chart-panel"
        onClick={() => setChartExpanded((expanded) => !expanded)}
        className="order-1 inline-flex min-h-7 shrink-0 items-center gap-1 rounded-sm text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <ChevronRight
          className={cn('size-3.5 transition-transform', chartExpanded && 'rotate-90')}
          aria-hidden
        />
        {getDistanceChartSectionLabel(barOptionValue, hasMsa)}
      </button>

      {chartExpanded ? (
        <div className="order-3 shrink-0" role="group" aria-label="Chart controls">
          <Select value={barOptionValue} onValueChange={setBarOption}>
            <SelectTrigger
              className="h-7 w-[176px] bg-card/95"
              aria-label="Chart metric"
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
      ) : null}

      {chartExpanded ? (
        <div
          id="distance-chart-panel"
          className="order-6 h-[50px] w-full min-w-0 basis-full"
          role="region"
          aria-label="Input-tree metric chart"
        >
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
    </>
  );
}

export const MovieChartSection = React.memo(MovieChartSectionComponent);
