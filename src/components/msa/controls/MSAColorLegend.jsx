import React from 'react';
import { getColorSchemeLegend } from '../../../msaViewer/utils/colorSchemeCatalog.js';

function toCssColor([r, g, b, a = 255]) {
  return `rgb(${r} ${g} ${b} / ${a / 255})`;
}

export function MSAColorLegend({ colorScheme, sequenceType, hasTaxonColors }) {
  const legend = getColorSchemeLegend(colorScheme, sequenceType, { hasTaxonColors });
  if (!legend) return null;

  if (legend.note) {
    return (
      <span
        className={
          legend.tone === 'warning'
            ? 'text-2xs font-medium text-amber-700 dark:text-amber-300'
            : 'truncate text-2xs text-muted-foreground'
        }
        role={legend.tone === 'warning' ? 'status' : undefined}
      >
        {legend.note}
      </span>
    );
  }

  return (
    <ul className="flex items-center gap-2" aria-label="Residue colour legend">
      {legend.swatches.map(({ symbol, color }) => (
        <li key={symbol} className="flex items-center gap-1 text-2xs font-medium tabular-nums">
          <span
            className="size-3 rounded-sm border border-border/60"
            style={{ backgroundColor: toCssColor(color) }}
            aria-hidden
          />
          {symbol === '-' ? 'gap' : symbol}
        </li>
      ))}
    </ul>
  );
}
