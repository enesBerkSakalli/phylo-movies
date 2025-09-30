import React from 'react';

// React version of src/partials/top_scale_bar.html
// Keeps identical IDs and structure so existing code continues to work.
export function TopScaleBar() {
  return (
    <div className="top-scale-bar" role="region" aria-label="Phylogenetic Scale Tracker">
      <div className="scale-header">
        <md-icon>straighten</md-icon>
        <span className="scale-title">Scale</span>
      </div>
      <div className="scale-values" aria-live="polite">
        <md-assist-chip>
          <md-icon slot="icon">my_location</md-icon>
          <span id="currentScaleText">0.000</span>
        </md-assist-chip>
        <md-assist-chip>
          <md-icon slot="icon">height</md-icon>
          <span id="maxScaleText">0.000</span>
        </md-assist-chip>
      </div>
      <div className="scale-bar-container">
        <md-linear-progress id="scale-progress" value="0" aria-label="Scale progress"></md-linear-progress>
      </div>

      <div className="legend-section" role="region" aria-label="Taxa Groups Legend">
        <div className="legend-header">
          <md-icon>palette</md-icon>
          <span className="legend-title">Groups</span>
        </div>
        <div id="taxaLegend" className="taxa-legend taxa-legend-vertical" role="list" aria-label="Taxa groups legend"></div>
      </div>
    </div>
  );
}

