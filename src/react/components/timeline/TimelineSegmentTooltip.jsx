import React, { useState } from 'react';
import { Anchor, ArrowRightLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Timeline segment tooltip content component.
 * Displays information about anchor trees or transitions between them.
 *
 * @param {Object} props
 * @param {Object} props.segment - The segment data object
 * @param {number} props.segmentIndex - Current segment index (0-based)
 * @param {number} props.totalSegments - Total number of segments
 * @param {Function} props.getLeafNames - Function to convert leaf indices to names
 */
export function TimelineSegmentTooltip({ segment, segmentIndex, totalSegments, getLeafNames }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!segment) return null;

  const isAnchor = segment.isFullTree;

  return (
    <div className="space-y-1.5 w-full">
      <TooltipHeader
        isAnchor={isAnchor}
        segmentIndex={segmentIndex}
        totalSegments={totalSegments}
      />

      <div className="space-y-1 text-xs">
        {isAnchor ? (
          <AnchorContent segment={segment} />
        ) : (
          <TransitionContent
            segment={segment}
            getLeafNames={getLeafNames}
            isExpanded={isExpanded}
            onToggleExpanded={() => setIsExpanded(!isExpanded)}
          />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Header section with icon, title, and segment counter.
 */
function TooltipHeader({ isAnchor, segmentIndex, totalSegments }) {
  const Icon = isAnchor ? Anchor : ArrowRightLeft;
  const title = isAnchor ? 'Anchor' : 'Transition';

  return (
    <div className="flex items-center gap-1.5 pb-1.5 border-b border-border">
      <Icon className="size-3.5 text-primary shrink-0" />
      <span className="font-semibold text-xs truncate">{title}</span>
      <span className="text-xs text-muted-foreground ml-auto">
        {segmentIndex + 1}/{totalSegments}
      </span>
    </div>
  );
}

/**
 * Content for anchor tree segments.
 * Displays tree name and original index.
 */
function AnchorContent({ segment }) {
  return (
    <div className="text-muted-foreground">
      {segment.treeName}
      {typeof segment.originalTreeIndex === 'number' && (
        <span className="ml-2 text-xs opacity-70">
          (#{segment.originalTreeIndex + 1})
        </span>
      )}
    </div>
  );
}

/**
 * Content for transition segments.
 * Displays moving subtrees, step count, and taxa count.
 */
function TransitionContent({ segment, getLeafNames, isExpanded, onToggleExpanded }) {
  const steps = segment.hasInterpolation && Array.isArray(segment.interpolationData)
    ? segment.interpolationData.length
    : 1;

  const taxaCount = typeof segment.subtreeMoveCount === 'number'
    ? segment.subtreeMoveCount
    : 0;

  const subtreeGroups = extractMovingSubtreeGroups(segment.jumpingSubtrees, getLeafNames);

  return (
    <>
      <MovingSubtreesSection
        subtreeGroups={subtreeGroups}
        isExpanded={isExpanded}
        onToggleExpanded={onToggleExpanded}
      />

      <div className="flex items-center justify-between pt-1 text-muted-foreground border-t border-border/50 mt-1">
        <span>{steps} steps</span>
        <span>{taxaCount} taxa</span>
      </div>
    </>
  );
}

/**
 * Section displaying moving subtrees with expandable list.
 */
function MovingSubtreesSection({ subtreeGroups, isExpanded, onToggleExpanded }) {
  const MAX_VISIBLE = 3;
  const hasManyGroups = subtreeGroups.length > MAX_VISIBLE;
  const visibleGroups = isExpanded ? subtreeGroups : subtreeGroups.slice(0, MAX_VISIBLE);

  return (
    <div className="flex flex-col gap-1">
      {/* Section header with expand/collapse button */}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground font-medium text-[10px] uppercase tracking-wider">
          Moving subtrees
        </span>
        {hasManyGroups && (
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpanded();
            }}
          >
            {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </Button>
        )}
      </div>

      {/* Subtree badges */}
      {subtreeGroups.length > 0 ? (
        <div className="flex flex-wrap gap-1 max-w-full">
          {visibleGroups.map((names, idx) => (
            <SubtreeBadge key={idx} names={names} />
          ))}
          {!isExpanded && hasManyGroups && (
            <span className="text-[10px] text-muted-foreground self-center pl-1">
              +{subtreeGroups.length - MAX_VISIBLE} more
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
    <Badge
      variant="secondary"
      className="text-[10px] px-1.5 py-0 h-5 font-medium whitespace-nowrap"
    >
      {displayText}
    </Badge>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extracts jumping subtree groups from the segment data.
 *
 * @param {Array} jumpingSubtrees - Array of solutions with leaf indices
 * @param {Function} getLeafNamesByIndices - Function to convert indices to names
 * @returns {Array<string[]>} Array of leaf name arrays for each subtree group
 */
function extractMovingSubtreeGroups(jumpingSubtrees, getLeafNamesByIndices) {
  if (!jumpingSubtrees?.length || !getLeafNamesByIndices) {
    return [];
  }

  const subtreeGroups = [];

  for (const solution of jumpingSubtrees) {
    if (!Array.isArray(solution)) continue;

    for (const leafIndicesGroup of solution) {
      if (!Array.isArray(leafIndicesGroup) || leafIndicesGroup.length === 0) continue;

      const leafNames = getLeafNamesByIndices(leafIndicesGroup);
      if (leafNames?.length > 0) {
        subtreeGroups.push(leafNames);
      }
    }
  }

  return subtreeGroups;
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
