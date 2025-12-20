import React from 'react';
import { Palette } from 'lucide-react';
import { useAppStore } from '../../../js/core/store.js';

/**
 * Taxa groups legend - displays color-coded groups when taxa coloring is applied
 * Subscribes to store.taxaGrouping and renders group chips with colors
 */
export const TaxaLegend: React.FC = () => {
  const taxaGrouping = useAppStore((s) => s.taxaGrouping);

  // Hide legend in taxa mode (individual coloring) or when no groups exist
  if (!taxaGrouping || taxaGrouping.mode === 'taxa') {
    return null;
  }

  const colorMap = taxaGrouping.groupColorMap || {};
  const groupNames = Object.keys(colorMap);

  if (groupNames.length === 0) {
    return null;
  }

  return (
    <div className="legend-section" role="region" aria-label="Taxa Groups Legend">
      <div className="legend-header">
        <Palette className="size-4" />
        <span className="legend-title">Groups</span>
      </div>
      <div
        className="taxa-legend taxa-legend-vertical"
        role="list"
        aria-label="Taxa groups legend"
      >
        {groupNames.map((name) => {
          const color = colorMap[name] || '#666';
          return (
            <div key={name} className="taxa-legend-chip" role="listitem">
              <span className="swatch" style={{ background: color }} />
              <span className="label" title={name}>{name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
