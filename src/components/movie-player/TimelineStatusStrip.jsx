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
      className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border/40 bg-muted/20 backdrop-blur-sm px-2 py-1 text-2xs"
      role="status"
      aria-label="Movie timeline status"
    >
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
          <span className="block max-w-[18rem] truncate text-[10px] text-muted-foreground/80 leading-tight font-medium cursor-help">
            {status.position.display}
          </span>
        </AppTooltip>
      </StatusItem>

      {hasMsa && (
        <StatusItem icon={Columns} label="Alignment">
          <MsaWindowStatus
            msaWindow={status.msaWindow}
            msaWindowSize={status.msaWindowSize}
            msaStepSize={status.msaStepSize}
          />
        </StatusItem>
      )}
    </div>
  );
}

function StatusItem({ icon: Icon, label, children }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="size-3.5 shrink-0 text-primary" aria-hidden />
      <div className="flex min-w-0 items-center gap-2">
        <div className="shrink-0 text-xs font-bold leading-tight tracking-tight uppercase">
          {label}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

function MsaWindowStatus({ msaWindow, msaWindowSize, msaStepSize }) {
  if (!msaWindow) {
    return <span className="text-[10px] text-muted-foreground/80 leading-tight font-medium">Unavailable</span>;
  }

  return (
    <div className="flex min-w-0 items-center gap-2 text-[10px] text-muted-foreground/80 leading-tight font-medium tabular-nums">
      <span>
        <span>{msaWindow.startPosition}</span>
        <span className="mx-1 text-muted-foreground/50 text-2xs">-</span>
        <span>{msaWindow.midPosition}</span>
        <span className="mx-1 text-muted-foreground/50 text-2xs">-</span>
        <span>{msaWindow.endPosition}</span>
      </span>
      <span className="shrink-0">
        Size {msaWindowSize ?? '-'} / Step {msaStepSize ?? '-'}
      </span>
    </div>
  );
}

export default TimelineStatusStrip;
