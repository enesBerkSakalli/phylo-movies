import React from 'react';
import { Loader2 } from 'lucide-react';
import { describeProcessingProgress, formatElapsed } from '../processingProgress.js';
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
  const [startedAt] = React.useState(() => Date.now());
  const [now, setNow] = React.useState(startedAt);
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const elapsedMs = now - startedAt;
  const progress = describeProcessingProgress(operationState.message, elapsedMs);

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
                Large alignments can take a few minutes. Cancelling keeps your files and settings.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="flex flex-col items-center gap-0.5 text-center" role="status">
          <p className="text-sm font-medium tabular-nums">{progress.headline}</p>
          {progress.detail && (
            <p className="text-xs text-muted-foreground tabular-nums">{progress.detail}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Progress
            value={operationState.percent}
            className="h-1.5 overflow-hidden bg-muted"
            aria-label="Processing progress"
          />
          <div className="flex items-center justify-between px-1">
            <p className="text-2xs text-muted-foreground tabular-nums">
              Elapsed {formatElapsed(elapsedMs)}
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
