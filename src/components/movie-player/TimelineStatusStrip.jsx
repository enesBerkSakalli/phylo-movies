import React, { useMemo } from 'react';
import { Columns, Film } from 'lucide-react';
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

    return movieTimelineManager?.getTimelineStatusSnapshot?.(statusRequest) ??
      buildTimelineStatusSnapshot({
        ...statusRequest,
        treeListLength,
      });
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
          <div className="space-y-1">
            <div>{status.segment.tooltip}</div>
            <div>Sequence position, 0=start and 1=end:</div>
            <div className="font-bold text-primary tabular-nums">
              {status.position.fullPrecision}
            </div>
          </div>
        }
        contentClassName="border-border/60 bg-popover text-2xs font-mono text-popover-foreground"
      >
        <span className="inline-flex w-[18rem] max-w-[40vw] shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-primary cursor-help">
          <span className="min-w-0 truncate text-center text-[10px] text-foreground leading-tight font-semibold tabular-nums">
            {status.position.display}
          </span>
        </span>
      </AppTooltip>
    </StatusItem>
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
      <span className="inline-flex w-[10rem] shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-primary">
        <span className="truncate text-center text-[10px] text-muted-foreground/80 leading-tight font-medium">
          Unavailable
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex w-[10rem] shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-primary">
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
  return (
    <span className="inline-flex w-[14rem] shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-primary">
      <span className="truncate text-center text-[10px] text-foreground leading-tight font-semibold tabular-nums">
        Window size {msaWindowSize ?? '-'} / Step size {msaStepSize ?? '-'}
      </span>
    </span>
  );
}

export default TimelineStatusStrip;
