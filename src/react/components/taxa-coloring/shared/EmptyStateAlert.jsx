import React from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export function EmptyStateAlert({ mode }) {
  return (
    <Alert>
      <div className="flex items-start gap-2">
        <Info className="mt-0.5 size-4" />
        <div>
          <AlertTitle>No {mode === "taxa" ? "taxa available for coloring" : "groups found with current settings"}.</AlertTitle>
          {mode === "taxa" && <AlertDescription>Load a dataset to configure taxa colors.</AlertDescription>}
        </div>
      </div>
    </Alert>
  );
}
