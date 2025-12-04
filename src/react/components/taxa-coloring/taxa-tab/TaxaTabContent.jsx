import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ColorSchemeSelector } from "../shared/ColorSchemeSelector.jsx";
import { EmptyStateAlert } from "../shared/EmptyStateAlert.jsx";
import { ColorInputGrid } from "../shared/ColorInputGrid.jsx";

export function TaxaTabContent({ taxaNames, colorManager, applyScheme, handleColorChange }) {
  return (
    <div className="space-y-4">
      <ColorSchemeSelector
        onApply={(id) => applyScheme(id, "taxa")}
        description="Apply a curated palette directly to each taxa."
      />
      {taxaNames.length === 0 ? (
        <EmptyStateAlert mode="taxa" />
      ) : (
        <Card>
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Colors ({taxaNames.length})</CardTitle>
            <CardDescription>Adjust colors for each taxa entry.</CardDescription>
          </CardHeader>
          <CardContent>
            <ColorInputGrid
              items={taxaNames}
              isGroup={false}
              colorManager={colorManager}
              onColorChange={handleColorChange}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
