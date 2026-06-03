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

export const MovedSubtreeRecurrenceTable = ({
  recurrences,
  leafNamesByIndex,
}: MovedSubtreeRecurrenceTableProps) => {
  const markedNodes = useAppStore(selectMarkedNodes);
  const setManuallyMarkedNodes = useAppStore(selectSetManuallyMarkedNodes);
  const goToPosition = useAppStore(selectGoToPosition);
  const currentSignature = getSignature(markedNodes);

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
            % of SPR moves
          </th>
          <th className="px-4 py-2 text-right font-bold uppercase tracking-wider text-2xs">
            Parent Branch Support
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/10">
        {recurrences.map((item, idx) => {
          const isActive = getSignature(item.splitIndices) === currentSignature;
          const subtreeLabel = formatSubtreeLabel(item.splitIndices, leafNamesByIndex);
          const jumpFrame = getRecurrenceJumpFrame(item);
          const jumpPairLabel = formatInputTreePair(
            item.representativeSourceInputTreeIndex,
            item.representativeTargetInputTreeIndex
          );
          const jumpLabel = `Jump to move in ${jumpPairLabel}`;

          return (
            <tr
              key={item.signature}
              role="button"
              tabIndex={0}
              aria-pressed={isActive}
              aria-label={`${subtreeLabel}, ${item.count} SPR moves, ${item.percentage.toFixed(1)}%`}
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
              <td className="px-4 py-2 font-semibold">
                {subtreeLabel}
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
                  <TooltipTrigger className="cursor-help hover:text-foreground transition-colors">
                    {item.percentage.toFixed(1)}%
                  </TooltipTrigger>
                  <TooltipContent
                    side="left"
                    className="text-2xs font-mono bg-popover border-border"
                  >
                    <div className="flex flex-col gap-1">
                      <div>Full Precision:</div>
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
                <div className="text-2xs text-muted-foreground/60">median source → target</div>
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
