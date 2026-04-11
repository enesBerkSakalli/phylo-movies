import React from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export function EmptyStateAlert({ mode }) {
  return (
    <Alert className="bg-muted/30 border-dashed border-muted-foreground/30 py-6">
      <div className="flex flex-col items-center text-center gap-2">
        <div className="p-3 rounded-md bg-muted/50 mb-1">
          <Info className="size-6 text-muted-foreground" />
        </div>
        <div>
          <AlertTitle className="text-base font-semibold">
            {mode === "taxa" ? "No taxa available for coloring" : "No groups found with current settings"}
          </AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground max-w-[300px]">
            {mode === "taxa"
              ? "Load a phylogenetic dataset to start configuring taxa colors."
              : "Try adjusting your grouping strategy or separators to detect taxa groups."}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
