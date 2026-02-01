import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function ProcessingOverlay({ progress }) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
      <Card className="w-80 shadow-2xl">
        <CardContent className="pt-6 space-y-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Loader2 className="size-8 text-primary animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold">{progress.message || 'Processing...'}</p>
              <p className="text-xs text-muted-foreground">Please wait while we process your data.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Progress value={progress.percent} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {Math.round(progress.percent)}% complete
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
