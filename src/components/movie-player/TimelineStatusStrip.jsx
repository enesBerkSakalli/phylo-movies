import React, { useMemo } from 'react';
import { ArrowRight, Columns, Film, GitBranch } from 'lucide-react';
import { AppTooltip } from '../ui/app-tooltip';
import {
  selectActiveTreeListLength,
  selectFrameIndex,
  selectHasMsa,
  selectInputFrameIndices,
  selectMovieTimelineManager,
  selectMsaColumnCount,
  selectMsaStepSize,
  selectMsaWindowSize,
  selectTimelineCursor,
  useAppStore,
} from '../../state/phyloStore/store.js';
import { buildTimelineStatusSnapshot } from '../../timeline/view/timelineStatusModel.js';

export function TimelineStatusStrip() {
  const frameIndex = useAppStore(selectFrameIndex);
  const timelineCursor = useAppStore(selectTimelineCursor);
  const inputFrameIndices = useAppStore(selectInputFrameIndices);
  const treeListLength = useAppStore(selectActiveTreeListLength);
  const movieTimelineManager = useAppStore(selectMovieTimelineManager);
  const hasMsa = useAppStore(selectHasMsa);
  const msaWindowSize = useAppStore(selectMsaWindowSize);
  const msaStepSize = useAppStore(selectMsaStepSize);
  const msaColumnCount = useAppStore(selectMsaColumnCount);

  const status = useMemo(() => {
    const statusRequest = {
      frameIndex,
      inputFrameIndices,
      timelineCursor,
      hasMsa,
      msaStepSize,
      msaWindowSize,
      msaColumnCount,
    };

    return (
      movieTimelineManager?.getTimelineStatusSnapshot?.(statusRequest) ??
      buildTimelineStatusSnapshot({
        ...statusRequest,
        treeListLength,
      })
    );
  }, [
    frameIndex,
    hasMsa,
    inputFrameIndices,
    movieTimelineManager,
    msaColumnCount,
    msaStepSize,
    msaWindowSize,
    timelineCursor,
    treeListLength,
  ]);

  return (
    <div
      className="flex min-w-0 flex-nowrap overflow-hidden items-center gap-2 rounded-md border border-border/40 bg-muted/20 backdrop-blur-sm px-2 py-1 text-2xs"
      role="status"
      aria-label="Movie timeline status"
    >
      <CursorStatus status={status} />

      {hasMsa && (
        <>
          <StatusItem icon={Columns} label="Alignment">
            <MsaWindowStatus msaWindow={status.msaWindow} />
          </StatusItem>
          <MsaWindowConfigStatus
            msaWindowSize={status.msaWindowSize}
            msaStepSize={status.msaStepSize}
          />
        </>
      )}
    </div>
  );
}

function CursorStatus({ status }) {
  return (
    <StatusItem icon={Film} label="Cursor">
      <AppTooltip
        content={
          <div className="flex flex-col gap-1">
            <div>Current position in the tree sequence.</div>
            <div>{status.segment.tooltip}</div>
            <div>Normalized sequence coordinate:</div>
            <div className="font-bold text-primary tabular-nums">
              {status.position.fullPrecision}
            </div>
          </div>
        }
        contentClassName="border-border/60 bg-popover text-2xs font-mono text-popover-foreground"
      >
        <span className="inline-flex w-[12rem] max-w-[30vw] shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-primary cursor-help">
          <CursorPositionValue position={status.position} />
        </span>
      </AppTooltip>
    </StatusItem>
  );
}

function CursorPositionValue({ position }) {
  if (position?.kind === 'transition') {
    return (
      <span className="inline-flex min-w-0 items-center justify-center gap-1 text-[10px] leading-tight font-semibold tabular-nums">
        <GitBranch className="size-3 shrink-0 text-primary" aria-hidden />
        <span className="min-w-[1rem] shrink-0 text-center text-foreground">
          {position.sourceInputTreeIndex + 1}
        </span>
        <ArrowRight className="size-3 shrink-0 text-muted-foreground" aria-hidden />
        <GitBranch className="size-3 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-[1rem] shrink-0 text-center text-foreground">
          {position.targetInputTreeIndex + 1}
        </span>
        <span className="shrink-0 text-muted-foreground/60">|</span>
        <span className="shrink-0 text-foreground">
          {position.frameNumber}/{position.frameCount}
        </span>
      </span>
    );
  }

  if (position?.kind === 'input') {
    return (
      <span className="inline-flex min-w-0 items-center justify-center gap-1 text-[10px] leading-tight font-semibold tabular-nums">
        <GitBranch className="size-3 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 truncate text-center text-foreground">
          {position.inputTreeIndex + 1}/{position.inputTreeCount}
        </span>
      </span>
    );
  }

  return (
    <span className="min-w-0 truncate text-center text-[10px] text-foreground leading-tight font-semibold tabular-nums">
      {position.display}
    </span>
  );
}

function StatusItem({ icon: Icon, label, children }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Icon className="size-3.5 shrink-0 text-primary" aria-hidden />
      <div className="flex shrink-0 items-center gap-2">
        <div className="shrink-0 text-xs font-bold leading-tight tracking-tight uppercase">
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
      <span className="inline-flex w-[6.5rem] shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-primary">
        <span className="truncate text-center text-[10px] text-muted-foreground/80 leading-tight font-medium">
          Unavailable
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex w-[6.5rem] shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-primary">
      <span className="min-w-0 truncate text-center text-[10px] text-foreground leading-tight font-semibold tabular-nums">
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
      <span
        className="hidden w-[7rem] shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-primary xl:inline-flex"
        aria-label={fullLabel}
      >
        <span className="truncate text-center text-[10px] text-foreground leading-tight font-semibold tabular-nums">
          {compactLabel}
        </span>
      </span>
    </AppTooltip>
  );
}

export default TimelineStatusStrip;
