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
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
      <Card className="w-80 shadow-2xl border-white/10 bg-gradient-to-br from-splash-bg-from via-splash-bg-via to-splash-bg-to text-white">
        <CardContent className="pt-4 space-y-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="p-3 bg-splash-accent/10 rounded-md">
              <Loader2 className="size-8 text-splash-accent animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-white tracking-wide">
                {operationState.message || 'Processing...'}
              </p>
              <p className="text-xs text-splash-text-muted/60 font-light">
                Please wait while we process your data.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Progress
              value={operationState.percent}
              className="h-1.5 bg-white/10 overflow-hidden"
            />
            <div className="flex justify-between items-center px-1">
               <p className="text-2xs text-splash-text-muted/40 uppercase tracking-tighter">Status: Active</p>
               <p className="text-2xs font-medium text-splash-accent-bright tabular-nums">
                {Math.round(operationState.percent)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
