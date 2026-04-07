import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

/**
 * ProcessingOverlay
 *
 * Unified loading overlay used across both web and desktop versions.
 * Matches the visual branding of the Electron splash screen.
 */
export function ProcessingOverlay({ operationState }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
      <Card className="w-80 border-border/60 bg-card/95 text-card-foreground shadow-2xl">
        <CardContent className="pt-4 space-y-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="rounded-md bg-primary/10 p-3">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold tracking-wide text-card-foreground">
                {operationState.message || 'Processing...'}
              </p>
              <p className="text-xs font-light text-muted-foreground">
                Please wait while we process your data.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Progress
              value={operationState.percent}
              className="h-1.5 overflow-hidden bg-muted"
            />
            <div className="flex justify-between items-center px-1">
               <p className="text-2xs uppercase tracking-tighter text-muted-foreground">Status: Active</p>
               <p className="text-2xs font-medium tabular-nums text-primary">
                {Math.round(operationState.percent)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
