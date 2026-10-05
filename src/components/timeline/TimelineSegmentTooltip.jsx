import React from 'react';
import { ArrowRightLeft, GitBranch } from 'lucide-react';
import { Badge } from '../ui/badge';
import {
  extractAffectedSubtreeGroups,
  formatPairFacts,
  formatPivotEdgePreview,
  formatTransitionHeading,
} from './timelineSegmentTooltipUtils.js';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Timeline segment tooltip content component.
 * Displays information about input trees or transitions between them.
 *
 * @param {Object} props
 * @param {Object} props.segment - The segment data object
 * @param {Object} [props.pairChange] - The segment's pair in pairChanges.byPairId
 * @param {number} props.pairCount - Number of transitions (pairs) in the movie
 * @param {Function} props.getLeafNames - Function to convert leaf indices to names
 */
export function TimelineSegmentTooltip({ segment, pairChange, pairCount, getLeafNames }) {
  if (!segment) return null;

  const isInputTree = segment.isInputTreeSegment;

  return (
    <div className="space-y-2 w-full">
      <TooltipHeader segment={segment} pairCount={pairCount} />

      {!isInputTree && (
        <div className="space-y-1 text-xs">
          <TransitionContent
            segment={segment}
            pairChange={pairChange}
            getLeafNames={getLeafNames}
          />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Header section with icon and the transition (or input tree) the pointer is over.
 */
function TooltipHeader({ segment, pairCount }) {
  const isInputTree = segment.isInputTreeSegment;
  const Icon = isInputTree ? GitBranch : ArrowRightLeft;
  const title = isInputTree
    ? `Input tree ${segment.originalTreeIndex + 1}`
    : formatTransitionHeading(segment, pairCount);

  return (
    <div className="flex items-center gap-2 pb-2 border-b border-border">
      <Icon className="size-3.5 text-primary shrink-0" />
      <span className="font-semibold text-xs truncate">{title}</span>
    </div>
  );
}

/**
 * Content for transition segments.
 * Displays the pair's change, pivot edge and affected subtrees.
 */
function TransitionContent({ segment, pairChange, getLeafNames }) {
  const pairFacts = formatPairFacts(pairChange);
  const subtreeGroups = extractAffectedSubtreeGroups(segment.affectedSubtrees, getLeafNames);
  const pivotEdgePreview = formatPivotEdgePreview(segment.pivotEdge);

  return (
    <>
      {pairFacts && (
        <div className="flex flex-col gap-0.5 text-muted-foreground">
          {pairFacts.metrics && <span className="tabular-nums">{pairFacts.metrics}</span>}
          <span>{pairFacts.change}</span>
        </div>
      )}

      <PivotEdgeSection pivotEdgePreview={pivotEdgePreview} />

      <MovingSubtreesSection subtreeGroups={subtreeGroups} />
    </>
  );
}

function PivotEdgeSection({ pivotEdgePreview }) {
  if (!pivotEdgePreview) return null;

  return (
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
  );
}

/**
 * Section displaying the first few affected subtrees. The tooltip never takes the
 * pointer, so the rest is "+N more" here and in full in the Transition Inspector.
 */
function MovingSubtreesSection({ subtreeGroups }) {
  const MAX_VISIBLE = 3;
  const hiddenCount = subtreeGroups.length - MAX_VISIBLE;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground font-medium text-2xs uppercase tracking-wider">
        Affected subtrees
      </span>

      {subtreeGroups.length > 0 ? (
        <div className="flex flex-wrap gap-1 max-w-full">
          {subtreeGroups.slice(0, MAX_VISIBLE).map((names, idx) => (
            <SubtreeBadge key={idx} names={names} />
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
  );
}

/**
 * Badge displaying subtree leaf names.
 */
function SubtreeBadge({ names }) {
  const displayText = formatSubtreeNames(names);

  return (
    <Badge variant="secondary" className="text-2xs px-2 py-0 h-5 font-medium whitespace-nowrap">
      {displayText}
    </Badge>
  );
}

/**
 * Formats subtree names for display in a badge.
 * - Single name: shows the name
 * - Two names: shows both joined by comma
 * - More names: shows first name + count
 *
 * @param {string[]} names - Array of leaf names
 * @returns {string} Formatted display string
 */
function formatSubtreeNames(names) {
  if (names.length === 1) {
    return names[0];
  }
  if (names.length <= 2) {
    return names.join(', ');
  }
  return `${names[0]}, +${names.length - 1}`;
}
