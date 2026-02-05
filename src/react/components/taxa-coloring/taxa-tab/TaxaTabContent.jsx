import React from "react";
// Card imports removed
import { ColorSchemeSelector } from "../shared/ColorSchemeSelector.jsx";
import { EmptyStateAlert } from "../shared/EmptyStateAlert.jsx";
import { ColorInputGrid } from "../shared/ColorInputGrid.jsx";

export function TaxaTabContent({ taxaNames, colorManager, colorVersion, applyScheme, handleColorChange }) {
  return (
    <div className="space-y-4">
      <ColorSchemeSelector
        onApply={(id) => applyScheme(id, "taxa")}
        description="Apply a curated palette directly to each taxa."
      />
      {taxaNames.length === 0 ? (
        <EmptyStateAlert mode="taxa" />
      ) : (
        <div className="rounded-md border border-border/30 bg-accent/5 px-3 py-3">
          <div className="mb-3 space-y-1 px-1">
            <h3 className="text-[13px] font-bold leading-none">Manual Overrides ({taxaNames.length})</h3>
            <p className="text-2xs text-muted-foreground">Individual color assignments.</p>
          </div>
          <ColorInputGrid
            key={colorVersion}
            items={taxaNames}
            isGroup={false}
            colorManager={colorManager}
            onColorChange={handleColorChange}
          />
        </div>
      )}
    </div>
  );
}
