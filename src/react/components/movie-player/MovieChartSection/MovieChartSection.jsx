import React from 'react';
import { DistanceChart } from '../../DistanceChart/DistanceChart.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function MovieChartSection({ barOptionValue, onBarOptionChange }) {
  return (
    <div className="movie-chart-container-full-width" role="region" aria-label="Distance Chart">
      <div className="chart-row">
        <DistanceChart />
        <div className="chart-controls" role="group" aria-label="Chart controls">
          <Select value={barOptionValue} onValueChange={onBarOptionChange}>
            <SelectTrigger className="w-[100px] h-8">
              <SelectValue placeholder="Metric" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rfd" title="Robinson-Foulds Distance: Measures topological differences between trees">RFD</SelectItem>
              <SelectItem value="w-rfd" title="Weighted Robinson-Foulds: Includes branch length differences">W‑RFD</SelectItem>
              <SelectItem value="scale" title="Tree scale: Shows relative size changes">Scale</SelectItem>
            </SelectContent>
          </Select>
          <div id="chart-select-help" className="sr-only">Choose data series: RFD shows tree differences, W-RFD includes branch lengths, Scale shows tree size</div>
        </div>
      </div>
    </div>
  );
}
