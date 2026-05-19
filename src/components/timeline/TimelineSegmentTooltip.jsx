import React, { useState } from 'react';
import { ArrowRightLeft, ChevronDown, ChevronUp, GitBranch } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Timeline segment tooltip content component.
 * Displays information about input trees or transitions between them.
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

  const isInputTree = segment.isFullTree;

  return (
    <div className="space-y-2 w-full">
      <TooltipHeader
        isInputTree={isInputTree}
        segmentIndex={segmentIndex}
        totalSegments={totalSegments}
      />

      <div className="space-y-1 text-xs">
        {isInputTree ? (
          <InputTreeContent segment={segment} />
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
function TooltipHeader({ isInputTree, segmentIndex, totalSegments }) {
  const Icon = isInputTree ? GitBranch : ArrowRightLeft;
  const title = isInputTree ? 'Input tree' : 'Generated frames';

  return (
    <div className="flex items-center gap-2 pb-2 border-b border-border">
      <Icon className="size-3.5 text-primary shrink-0" />
      <span className="font-semibold text-xs truncate">{title}</span>
      <span className="text-xs text-muted-foreground ml-auto">
        {segmentIndex + 1}/{totalSegments}
      </span>
    </div>
  );
}

/**
 * Content for input-tree segments.
 * Displays tree name and original index.
 */
function InputTreeContent({ segment }) {
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
  const generatedFrames = Number.isInteger(segment.generatedFrameCount)
    ? segment.generatedFrameCount
    : (Array.isArray(segment.interpolationData) ? segment.interpolationData.length : 1);
  const animationSteps = Number.isInteger(segment.animationStepCount)
    ? segment.animationStepCount
    : (Array.isArray(segment.interpolationData) ? Math.max(0, segment.interpolationData.length - 1) : 0);

  const taxaCount = typeof segment.subtreeMoveCount === 'number'
    ? segment.subtreeMoveCount
    : 0;

  const subtreeGroups = extractMovingSubtreeGroups(segment.affectedSubtrees, getLeafNames);

  return (
    <>
      <MovingSubtreesSection
        subtreeGroups={subtreeGroups}
        isExpanded={isExpanded}
        onToggleExpanded={onToggleExpanded}
      />

      <div className="flex items-center justify-between pt-1 text-muted-foreground border-t border-border/50 mt-1">
        <span>{generatedFrames} generated frames</span>
        <span>{animationSteps} steps, {taxaCount} taxa</span>
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
        <span className="text-muted-foreground font-medium text-2xs uppercase tracking-wider">
          Moved subtrees
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
            <span className="text-2xs text-muted-foreground self-center pl-1">
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
      className="text-2xs px-2 py-0 h-5 font-medium whitespace-nowrap"
    >
      {displayText}
    </Badge>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extracts affected subtree groups from the segment data.
 *
 * @param {Array} affectedSubtrees - Array of affected subtree groups with leaf indices
 * @param {Function} getLeafNamesByIndices - Function to convert indices to names
 * @returns {Array<string[]>} Array of leaf name arrays for each subtree group
 */
export function extractMovingSubtreeGroups(affectedSubtrees, getLeafNamesByIndices) {
  if (!affectedSubtrees?.length || !getLeafNamesByIndices) {
    return [];
  }

  const subtreeGroups = [];

  for (const item of affectedSubtrees) {
    if (!Array.isArray(item)) continue;

    // Check depth: is this a group of indices [1, 2] or a solution containing groups [[1, 2]]?
    const firstElement = item[0];

    if (Array.isArray(firstElement)) {
      // 3D Structure: Item is a solution containing groups
      // e.g. [[1, 2], [3]]
      for (const group of item) {
        if (Array.isArray(group) && group.length > 0) {
          const leafNames = getLeafNamesByIndices(group);
          if (leafNames?.length > 0) {
            subtreeGroups.push(leafNames);
          }
        }
      }
    } else {
      // 2D Structure: Item is a single group of indices
      // e.g. [1, 2]
      // or empty array
      if (item.length > 0) {
        const leafNames = getLeafNamesByIndices(item);
        if (leafNames?.length > 0) {
          subtreeGroups.push(leafNames);
        }
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
