import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutPanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function CSVColumnSelector({ csvData, csvColumn, onColumnChange }) {
  if (!csvData || csvData.groupingColumns.length <= 1) {
    return null;
  }

  return (
    <Card className="border-border/30 shadow-none bg-accent/5 gap-0 py-0">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center gap-2">
          <div className="size-5 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <LayoutPanelLeft className="size-3" />
          </div>
          <CardTitle className="text-xs font-bold uppercase tracking-wider">Group Category</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-border/40 bg-background/50">
          {csvData.groupingColumns.map((c) => (
            <Button
              key={c.name}
              size="sm"
              variant={csvColumn === c.name ? "default" : "ghost"}
              onClick={() => onColumnChange(c.name)}
              className={cn(
                "h-7 text-2xs font-bold uppercase tracking-tight px-3 rounded-md",
                csvColumn === c.name
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground border border-transparent hover:border-border/40"
              )}
            >
              {c.displayName}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
