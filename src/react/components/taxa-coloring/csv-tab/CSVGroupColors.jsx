import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ColorInputGrid } from "../shared/ColorInputGrid.jsx";

export function CSVGroupColors({ csvGroups, colorManager, onColorChange }) {
  if (csvGroups.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-sm font-medium">Group Colors ({csvGroups.length})</CardTitle>
        <CardDescription>Adjust colors imported from CSV groupings.</CardDescription>
      </CardHeader>
      <CardContent>
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
