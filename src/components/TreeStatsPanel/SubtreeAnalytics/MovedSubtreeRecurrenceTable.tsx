import React from 'react';
import { LocateFixed } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import { formatSubtreeLabel } from '../../../domain/spr/sprAnalytics';
import { SubtreeTopologyPopover } from './SubtreeTopologyPopover';
import {
  selectGoToPosition,
  selectMarkedNodes,
  selectSetManuallyMarkedNodes,
  useAppStore,
} from '../../../state/phyloStore/store.js';
import type { SprMovedSubtreeRecurrence } from './types';
import { formatInputTreePair, getRecurrenceJumpFrame } from './sprMoveJumpTarget';

interface MovedSubtreeRecurrenceTableProps {
  recurrences: SprMovedSubtreeRecurrence[];
  leafNamesByIndex: string[];
}

const getSignature = (indices?: number[]): string => {
  if (!Array.isArray(indices) || indices.length === 0) return '';
  return [...indices].sort((a, b) => a - b).join(',');
};

const formatMedian = (value?: number | null): string =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : '-';

const formatParentBranchValueHeader = (recurrences: SprMovedSubtreeRecurrence[]): string => {
  const labels = new Set(
    recurrences
      .map((item) => item.parentBranchValueLabel)
      .filter((label): label is string => typeof label === 'string' && label.trim().length > 0)
  );
  if (labels.size === 1) return `Parent ${Array.from(labels)[0]}`;
  return 'Parent Branch Value';
};

const formatCompactSubtreeLabel = (
  splitIndices: number[],
  leafNamesByIndex: string[],
  maxNames = 3
): string => {
  if (!Array.isArray(splitIndices) || splitIndices.length === 0) return '-';
  if (splitIndices.length <= maxNames) return formatSubtreeLabel(splitIndices, leafNamesByIndex);

  const names = splitIndices
    .slice(0, maxNames)
    .map((idx) => leafNamesByIndex[idx])
    .filter(Boolean);
  const prefix =
    names.length > 0 ? names.join(', ') : `Nodes ${splitIndices.slice(0, maxNames).join(', ')}`;
  return `${prefix} +${splitIndices.length - maxNames} more`;
};

const sumSprMoveCounts = (recurrences: SprMovedSubtreeRecurrence[]): number =>
  recurrences.reduce((sum, item) => sum + (Number.isFinite(item.count) ? item.count : 0), 0);

export const MovedSubtreeRecurrenceTable = ({
  recurrences,
  leafNamesByIndex,
}: MovedSubtreeRecurrenceTableProps) => {
  const markedNodes = useAppStore(selectMarkedNodes);
  const setManuallyMarkedNodes = useAppStore(selectSetManuallyMarkedNodes);
  const goToPosition = useAppStore(selectGoToPosition);
  const currentSignature = getSignature(markedNodes);
  const totalSprMoveCount = React.useMemo(() => sumSprMoveCounts(recurrences), [recurrences]);
  const parentBranchValueHeader = React.useMemo(
    () => formatParentBranchValueHeader(recurrences),
    [recurrences]
  );

  const handleSubtreeClick = (splitIndices: number[]) => {
    const signature = getSignature(splitIndices);
    if (signature === currentSignature) {
      setManuallyMarkedNodes([]);
      return;
    }
    setManuallyMarkedNodes(splitIndices);
  };

  const handleJumpToMove = (
    event: React.MouseEvent<HTMLButtonElement>,
    item: SprMovedSubtreeRecurrence
  ) => {
    event.stopPropagation();
    setManuallyMarkedNodes(item.splitIndices);

    const jumpFrame = getRecurrenceJumpFrame(item);
    if (jumpFrame !== null) {
      goToPosition(jumpFrame, 'jump');
    }
  };

  return (
    <table className="w-full text-xs">
      <thead className="bg-muted/40 text-muted-foreground font-bold sticky top-0 z-10">
        <tr>
          <th className="px-4 py-2 text-left font-bold uppercase tracking-wider text-2xs">Rank</th>
          <th className="px-4 py-2 text-left font-bold uppercase tracking-wider text-2xs">
            Moved Subtree
          </th>
          <th className="px-4 py-2 text-left font-bold uppercase tracking-wider text-2xs">
            Topology
          </th>
          <th className="px-4 py-2 text-right font-bold uppercase tracking-wider text-2xs">
            SPR Moves
          </th>
          <th className="px-4 py-2 text-right font-bold uppercase tracking-wider text-2xs">
            Tree Pairs
          </th>
          <th className="px-4 py-2 text-left font-bold uppercase tracking-wider text-2xs">
            Example Source → Target
          </th>
          <th className="px-4 py-2 text-right font-bold uppercase tracking-wider text-2xs">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-help justify-end transition-colors hover:text-foreground">
                  Share of SPR Moves
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="left"
                className="max-w-64 border-border bg-popover text-2xs font-normal normal-case tracking-normal"
              >
                SPR move count divided by all SPR move events in this dataset. This is not tree-pair
                or genome-window coverage.
              </TooltipContent>
            </Tooltip>
          </th>
          <th className="px-4 py-2 text-right font-bold uppercase tracking-wider text-2xs">
            {parentBranchValueHeader}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/10">
        {recurrences.map((item, idx) => {
          const isActive = getSignature(item.splitIndices) === currentSignature;
          const subtreeLabel = formatSubtreeLabel(item.splitIndices, leafNamesByIndex);
          const compactSubtreeLabel = formatCompactSubtreeLabel(
            item.splitIndices,
            leafNamesByIndex
          );
          const jumpFrame = getRecurrenceJumpFrame(item);
          const jumpPairLabel = formatInputTreePair(
            item.representativeSourceInputTreeIndex,
            item.representativeTargetInputTreeIndex
          );
          const jumpLabel = `Jump to move in ${jumpPairLabel}`;
          const sharePercentLabel = `${item.percentage.toFixed(1)}%`;

          return (
            <tr
              key={item.signature}
              role="button"
              tabIndex={0}
              aria-pressed={isActive}
              aria-label={`${subtreeLabel}, ${item.count} SPR moves, ${sharePercentLabel} of all SPR move events`}
              onClick={() => handleSubtreeClick(item.splitIndices)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleSubtreeClick(item.splitIndices);
                }
              }}
              className={[
                'cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                isActive ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-primary/5',
              ].join(' ')}
            >
              <td className="px-4 py-2 font-medium text-muted-foreground/60 tabular-nums text-right">
                {idx + 1}
              </td>
              <td className="px-4 py-2 font-semibold" title={subtreeLabel}>
                <div className="max-w-64 truncate">{compactSubtreeLabel}</div>
                <div className="text-2xs font-normal text-muted-foreground/70 mt-1">
                  {item.splitIndices.length} taxa
                </div>
              </td>
              <td className="px-4 py-2">
                <SubtreeTopologyPopover
                  sourceTopology={item.sourceMovedSubtreeTopology}
                  destinationTopology={item.destinationMovedSubtreeTopology}
                  sourceNewick={item.sourceMovedSubtreeNewick}
                  destinationNewick={item.destinationMovedSubtreeNewick}
                  variantCount={item.topologyVariantCount}
                  taxaCount={item.splitIndices.length}
                  leafNamesByIndex={leafNamesByIndex}
                  compact
                />
                <div className="mt-1 text-2xs text-muted-foreground/70">
                  {item.topologyVariantCount && item.topologyVariantCount > 1
                    ? `${item.topologyVariantCount} variants`
                    : 'source / target'}
                </div>
              </td>
              <td className="px-4 py-2 text-right">
                <Badge
                  variant={isActive ? 'default' : 'secondary'}
                  className="font-mono tabular-nums"
                >
                  {item.count}
                </Badge>
              </td>
              <td className="px-4 py-2 text-right font-mono text-muted-foreground tabular-nums">
                {item.pairCount ?? item.pairIds?.length ?? '-'}
              </td>
              <td className="px-4 py-2">
                <div className="font-semibold text-foreground">{jumpPairLabel}</div>
                <div className="mt-0.5 text-2xs text-muted-foreground/70">
                  first observed move for this subtree
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="spr-analytics-no-drag mt-1.5 h-6 px-1.5 text-2xs"
                  disabled={jumpFrame === null}
                  onClick={(event) => handleJumpToMove(event, item)}
                  onKeyDown={(event) => event.stopPropagation()}
                  aria-label={jumpLabel}
                  title={jumpLabel}
                >
                  <LocateFixed className="size-3" aria-hidden />
                  Jump to move
                </Button>
              </td>
              <td className="px-4 py-2 text-right font-mono text-muted-foreground tabular-nums">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help transition-colors hover:text-foreground">
                      {sharePercentLabel}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="left"
                    className="text-2xs font-mono bg-popover border-border"
                  >
                    <div className="flex flex-col gap-1">
                      <div>
                        {item.count} of {totalSprMoveCount} SPR move events
                      </div>
                      <div className="font-sans text-muted-foreground">
                        Event share, not tree-pair or genome-window coverage.
                      </div>
                      <div className="font-bold text-primary">{item.percentage.toFixed(6)}%</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </td>
              <td className="px-4 py-2 text-right font-mono text-muted-foreground tabular-nums">
                <div>
                  {formatMedian(item.sourceParentBranchValueMedian)} →{' '}
                  {formatMedian(item.destinationParentBranchValueMedian)}
                </div>
                <div className="text-2xs text-muted-foreground/60">
                  median source → target
                  {item.parentBranchValueLabel ? ` (${item.parentBranchValueLabel})` : ''}
                </div>
              </td>
            </tr>
          );
        })}
        {recurrences.length === 0 && (
          <tr>
            <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground italic">
              No moved subtrees detected for this dataset.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};
