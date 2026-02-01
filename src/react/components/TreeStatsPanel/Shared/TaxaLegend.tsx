import React from 'react';
import { Palette } from 'lucide-react';
import { useAppStore } from '../../../../js/core/store.js';

/**
 * Taxa groups legend - displays color-coded groups when taxa coloring is applied
 * Subscribes to store.taxaGrouping and renders group chips with colors
 */
export const TaxaGroupsLegend: React.FC = () => {
  const taxaGrouping = useAppStore((s) => s.taxaGrouping);

  // Hide legend in taxa mode (individual coloring) or when no grouping data exists
  if (!taxaGrouping || taxaGrouping.mode === 'taxa') {
    return null;
  }

  const { mode, groupColorMap, groups, csvGroups } = taxaGrouping;
  let groupNames: string[] = [];

  // Determine which groups to show based on the active mode
  if (mode === 'csv' && csvGroups) {
    groupNames = csvGroups.map((g: any) => g.name);
  } else if (mode === 'groups' && groups) {
    groupNames = groups.map((g: any) => g.name);
  } else {
    // Fallback if specific lists are missing
    groupNames = Object.keys(groupColorMap || {});
  }

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
          const color = (groupColorMap && groupColorMap[name]) || '#666';
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
