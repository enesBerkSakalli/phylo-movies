import React from 'react';
import { DistanceChart } from '../../DistanceChart/DistanceChart.jsx';
import { DISTANCE_CHART_METRIC_OPTIONS } from '../../DistanceChart/distanceChartLanguage.js';
import { selectHasMsa, useAppStore } from '../../../state/phyloStore/store.js';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';

export function MovieChartSection({ barOptionValue, onBarOptionChange }) {
  const hasMsa = useAppStore(selectHasMsa);

  return (
    <div
      className="w-full bg-muted/10 px-2 py-1"
      role="region"
      aria-label="Input-tree metric chart"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <div className="min-w-0 truncate text-2xs font-medium uppercase tracking-wider text-muted-foreground">
          {hasMsa ? 'Genome-window metrics' : 'Input-tree metrics'}
        </div>

        <div className="shrink-0" role="group" aria-label="Chart controls">
          <Select value={barOptionValue} onValueChange={onBarOptionChange}>
            <SelectTrigger className="h-7 w-[176px] bg-card/95">
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

      <div className="mt-0.5 h-[50px] w-full min-w-0">
        <DistanceChart />
      </div>
    </div>
  );
}
