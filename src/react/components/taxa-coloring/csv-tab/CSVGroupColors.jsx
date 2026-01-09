import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ColorInputGrid } from "../shared/ColorInputGrid.jsx";

export function CSVGroupColors({ csvGroups, colorManager, onColorChange }) {
  if (csvGroups.length === 0) {
    return null;
  }

  return (
    <Card className="gap-0 py-0 border-border/30 shadow-none bg-accent/5">
      <CardHeader className="space-y-0.5 pb-2 pt-3 px-4">
        <CardTitle className="text-[13px] font-bold">CSV Grouping Colors ({csvGroups.length})</CardTitle>
        <CardDescription className="text-[10px]">Adjust colors for each category found in your CSV.</CardDescription>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <ColorInputGrid
          items={csvGroups}
          isGroup={true}
          colorManager={colorManager}
          onColorChange={onColorChange}
        />
      </CardContent>
    </Card>
  );
}
