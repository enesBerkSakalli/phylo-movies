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
        <Card className="gap-0 py-0 border-border/30 shadow-none bg-accent/5">
          <CardHeader className="space-y-0.5 pb-2 pt-3 px-4">
            <CardTitle className="text-[13px] font-bold">Manual Overrides ({taxaNames.length})</CardTitle>
            <CardDescription className="text-[10px]">Individual color assignments.</CardDescription>
          </CardHeader>
          <CardContent className="px-3 pb-3">
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
