import React from 'react';
import { ArrowRightLeft, GitBranch } from 'lucide-react';
import { Badge } from '../ui/badge';
import {
  extractAffectedSubtreeGroups,
  formatPairFacts,
  formatPivotEdgePreview,
  formatSubtreeNames,
  formatTransitionHeading,
} from './timelineSegmentTooltipUtils.js';

const MAX_VISIBLE_SUBTREES = 3;

/**
 * What the pointer is over on the timeline: an input tree, or a transition with its pair's
 * change, pivot edge and the first few moved subtrees. The tooltip never takes the pointer,
 * so the rest is "+N more" here and in full in the Transition Inspector.
 *
 * @param {Object} props
 * @param {Object} props.segment - The segment data object
 * @param {Object} [props.pairChange] - The segment's pair in pairChanges.byPairId
 * @param {number} props.pairCount - Number of transitions (pairs) in the movie
 * @param {string[]} props.leafNamesByIndex - Leaf names, by leaf index
 */
export function TimelineSegmentTooltip({ segment, pairChange, pairCount, leafNamesByIndex }) {
  const isInputTree = segment.isInputTreeSegment;
  const Icon = isInputTree ? GitBranch : ArrowRightLeft;
  const title = isInputTree
    ? `Input tree ${segment.originalTreeIndex + 1}`
    : formatTransitionHeading(segment, pairCount);
  const pairFacts = formatPairFacts(pairChange);
  const pivotEdgePreview = formatPivotEdgePreview(segment.pivotEdge);
  const subtreeGroups = extractAffectedSubtreeGroups(segment.affectedSubtrees, leafNamesByIndex);
  const hiddenCount = subtreeGroups.length - MAX_VISIBLE_SUBTREES;

  return (
    <div className="space-y-2 w-full">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <Icon className="size-3.5 text-primary shrink-0" />
        <span className="font-semibold text-xs truncate">{title}</span>
      </div>

      {!isInputTree && (
        <div className="space-y-1 text-xs">
          {pairFacts && (
            <div className="flex flex-col gap-0.5 text-muted-foreground">
              {pairFacts.metrics && <span className="tabular-nums">{pairFacts.metrics}</span>}
              <span>{pairFacts.change}</span>
            </div>
          )}

          {pivotEdgePreview && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground font-medium text-2xs uppercase tracking-wider">
                Pivot edge
              </span>
              <span
                className="min-w-0 truncate font-mono text-2xs text-foreground"
                title={pivotEdgePreview}
              >
                {pivotEdgePreview}
              </span>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground font-medium text-2xs uppercase tracking-wider">
              Affected subtrees
            </span>

            {subtreeGroups.length > 0 ? (
              <div className="flex flex-wrap gap-1 max-w-full">
                {subtreeGroups.slice(0, MAX_VISIBLE_SUBTREES).map((names, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="text-2xs px-2 py-0 h-5 font-medium whitespace-nowrap"
                  >
                    {formatSubtreeNames(names)}
                  </Badge>
                ))}
                {hiddenCount > 0 && (
                  <span className="text-2xs text-muted-foreground self-center pl-1">
                    +{hiddenCount} more
                  </span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
