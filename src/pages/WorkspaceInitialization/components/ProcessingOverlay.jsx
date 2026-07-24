import React from 'react';
import { Loader2 } from 'lucide-react';
import { Progress } from '../../../components/ui/progress';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';

/**
 * ProcessingOverlay
 *
 * Unified loading overlay used across both web and desktop versions.
 * Matches the visual branding of the Electron splash screen.
 */
export function ProcessingOverlay({ operationState, onCancel }) {
  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        className="w-80 gap-6 border-border/60 bg-card/95 text-card-foreground shadow-2xl"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-md bg-primary/10 p-3">
              <Loader2
                className="size-8 animate-spin text-primary motion-reduce:animate-none"
                aria-hidden
              />
            </div>
            <div className="flex flex-col gap-1">
              <DialogTitle>Processing dataset</DialogTitle>
              <DialogDescription className="text-xs">
                Please wait while we process your data.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <p className="text-center text-sm font-medium" role="status" aria-live="polite">
          {operationState.message || 'Processing…'}
        </p>
        <div className="flex flex-col gap-2">
          <Progress
            value={operationState.percent}
            className="h-1.5 overflow-hidden bg-muted"
            aria-label="Processing progress"
          />
          <div className="flex items-center justify-between px-1">
            <p className="text-2xs uppercase tracking-tighter text-muted-foreground">
              Status: Active
            </p>
            <p className="text-2xs font-medium tabular-nums text-primary">
              {Math.round(operationState.percent)}%
            </p>
          </div>
        </div>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel processing
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
