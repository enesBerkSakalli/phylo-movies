import React from 'react';
import { Columns, GitBranch } from 'lucide-react';
import { AppTooltip } from '../ui/app-tooltip';
import {
  selectActiveTreeListLength,
  selectFrameIndex,
  selectHasMsa,
  selectMsaColumnCount,
  selectMsaStepSize,
  selectMsaWindowSize,
  selectPlaying,
  selectTimeline,
  selectTimelineCursor,
  useAppStore,
} from '../../state/phyloStore/store.js';
import { describeCursor } from '../../timeline/describeCursor.js';
import { buildMsaWindowStatus } from '../msa/msaViewportStatus.js';

export function TimelineStatusStrip() {
  const frameIndex = useAppStore(selectFrameIndex);
  const timeline = useAppStore(selectTimeline);
  const timelineCursor = useAppStore(selectTimelineCursor);
  const treeListLength = useAppStore(selectActiveTreeListLength);
  const hasMsa = useAppStore(selectHasMsa);
  const msaWindowSize = useAppStore(selectMsaWindowSize);
  const msaStepSize = useAppStore(selectMsaStepSize);
  const msaColumnCount = useAppStore(selectMsaColumnCount);
  const playing = useAppStore(selectPlaying);

  const position = describeCursor(timeline, timelineCursor);

  return (
    <div
      className="flex min-w-0 flex-nowrap overflow-hidden items-center gap-2 rounded-md border border-border/40 bg-background/60 px-2 py-1 text-2xs"
      role="status"
      aria-label="Movie timeline status"
      // Announcing every frame during playback would flood screen readers.
      aria-live={playing ? 'off' : 'polite'}
    >
      <CursorStatus
        position={position}
        fallback={`Frame ${frameIndex + 1} of ${Math.max(1, treeListLength)}`}
      />

      {hasMsa && (
        <>
          <StatusItem icon={Columns} label="Alignment">
            <MsaWindowStatus
              msaWindow={buildMsaWindowStatus(
                timelineCursor,
                msaStepSize,
                msaWindowSize,
                msaColumnCount
              )}
            />
          </StatusItem>
          <MsaWindowConfigStatus msaWindowSize={msaWindowSize} msaStepSize={msaStepSize} />
        </>
      )}
    </div>
  );
}

function CursorStatus({ position, fallback }) {
  return (
    <AppTooltip
      content={
        <div className="flex flex-col gap-1">
          <div>Current position in the tree sequence.</div>
          {position && (
            <>
              <div>{position.tooltip}</div>
              <div>
                Movie time{' '}
                <span className="font-bold text-primary tabular-nums">{position.time}</span>
              </div>
            </>
          )}
        </div>
      }
      contentClassName="border-border/60 bg-popover text-2xs font-mono text-popover-foreground"
    >
      <span className="inline-flex w-auto max-w-[30vw] shrink-0 items-center cursor-help sm:w-[14rem]">
        <span className="inline-flex min-w-0 items-center gap-1 text-xs leading-tight font-semibold tabular-nums">
          <GitBranch className="size-3 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 truncate text-foreground">
            {position?.text ?? fallback}
            {position?.step && (
              <span className="font-medium text-muted-foreground"> · {position.step}</span>
            )}
          </span>
        </span>
      </span>
    </AppTooltip>
  );
}

function StatusItem({ icon: Icon, label, children }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Icon className="size-3.5 shrink-0 text-primary" aria-hidden />
      <div className="flex shrink-0 items-center gap-2">
        <div className="sr-only shrink-0 text-2xs font-medium text-muted-foreground sm:not-sr-only">
          {label}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

function MsaWindowStatus({ msaWindow }) {
  if (!msaWindow) {
    return (
      <span className="inline-flex w-[6.5rem] shrink-0 items-center">
        <span className="truncate text-xs text-muted-foreground leading-tight font-medium">
          Unavailable
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex w-[6.5rem] shrink-0 items-center">
      <span className="min-w-0 truncate text-xs text-foreground leading-tight font-semibold tabular-nums">
        <span>{msaWindow.startPosition}</span>
        <span className="mx-1 text-muted-foreground/50 text-2xs">-</span>
        <span>{msaWindow.midPosition}</span>
        <span className="mx-1 text-muted-foreground/50 text-2xs">-</span>
        <span>{msaWindow.endPosition}</span>
      </span>
    </span>
  );
}

function MsaWindowConfigStatus({ msaWindowSize, msaStepSize }) {
  const fullLabel = `Window size ${msaWindowSize ?? '-'} / Step size ${msaStepSize ?? '-'}`;
  const compactLabel = `W ${msaWindowSize ?? '-'} / S ${msaStepSize ?? '-'}`;

  return (
    <AppTooltip
      content={fullLabel}
      contentClassName="border-border/60 bg-popover text-2xs font-mono text-popover-foreground"
    >
      <span className="hidden w-[7rem] shrink-0 items-center xl:inline-flex" aria-label={fullLabel}>
        <span className="truncate text-xs text-foreground leading-tight font-semibold tabular-nums">
          {compactLabel}
        </span>
      </span>
    </AppTooltip>
  );
}
