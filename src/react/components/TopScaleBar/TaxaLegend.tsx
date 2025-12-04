// TaxaLegend.tsx - Placeholder container for taxa color legend (populated by external code)

import React from 'react';
import { Palette } from 'lucide-react';

/**
 * Taxa groups legend container
 *
 * NOTE: This component only provides the container structure.
 * The actual legend content (#taxaLegend) is populated by external DOM manipulation code
 * elsewhere in the application. This is a legacy pattern from the pre-React codebase.
 *
 * TODO: Consider refactoring to React-controlled content when the legend population logic
 * is migrated to React components.
 */
export const TaxaLegend: React.FC = () => {
  return (
    <div className="legend-section" role="region" aria-label="Taxa Groups Legend">
      <div className="legend-header">
        <Palette className="size-4" />
        <span className="legend-title">Groups</span>
      </div>
      <div
        id="taxaLegend"
        className="taxa-legend taxa-legend-vertical"
        role="list"
        aria-label="Taxa groups legend"
      />
    </div>
  );
};
