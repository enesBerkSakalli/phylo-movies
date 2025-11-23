import React from 'react';
import { DistanceChart } from '../DistanceChart.jsx';

export function MovieChartSection({ barOptionValue, onBarOptionChange }) {
  return (
    <div className="movie-chart-container-full-width" role="region" aria-label="Distance Chart">
      <div className="chart-row">
        <DistanceChart />
        <div className="chart-controls" role="group" aria-label="Chart controls">
          <select
            name="barPlotOption"
            id="barPlotOption"
            className="compact-select"
            aria-describedby="chart-select-help"
            title="Choose which tree distance metric to display in the chart"
            value={barOptionValue}
            onChange={(e) => onBarOptionChange(e.target.value)}
          >
            <option value="rfd" title="Robinson-Foulds Distance: Measures topological differences between trees">RFD</option>
            <option value="w-rfd" title="Weighted Robinson-Foulds: Includes branch length differences">W‑RFD</option>
            <option value="scale" title="Tree scale: Shows relative size changes">Scale</option>
          </select>
          <div id="chart-select-help" className="sr-only">Choose data series: RFD shows tree differences, W-RFD includes branch lengths, Scale shows tree size</div>
        </div>
      </div>
    </div>
  );
}
