import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function CSVColumnSelector({ csvData, csvColumn, onColumnChange }) {
  if (!csvData || csvData.groupingColumns.length <= 1) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-sm font-medium">Select CSV Column</CardTitle>
        <CardDescription>Choose which grouping column to visualize.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {csvData.groupingColumns.map((c) => (
          <Button 
            key={c.name} 
            size="sm" 
            variant={csvColumn === c.name ? "default" : "outline"} 
            onClick={() => onColumnChange(c.name)}
          >
            {c.displayName}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
