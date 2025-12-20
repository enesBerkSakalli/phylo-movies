import React, { useState } from 'react';
import { Anchor, ArrowRightLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * Extracts jumping subtree groups from the segment data.
 * @param {Array} jumpingSubtrees - Array of solutions with leaf indices
 * @param {Function} getLeafNamesByIndices - Function to convert indices to names
 * @returns {Array} Array of formatted name strings/arrays
 */
function getMovingSubtreeGroups(jumpingSubtrees, getLeafNamesByIndices) {
  if (!jumpingSubtrees || !jumpingSubtrees.length || !getLeafNamesByIndices) {
    return [];
  }

  const subtreeGroups = [];

  for (const solution of jumpingSubtrees) {
    if (!Array.isArray(solution)) continue;

    for (const leafIndicesGroup of solution) {
      if (!Array.isArray(leafIndicesGroup) || leafIndicesGroup.length === 0) continue;

      const leafNames = getLeafNamesByIndices(leafIndicesGroup);
      if (leafNames && leafNames.length > 0) {
        subtreeGroups.push(leafNames);
      }
    }
  }

  return subtreeGroups;
}

/**
 * Timeline segment tooltip content component
 */
export function TimelineSegmentTooltip({ segment, segmentIndex, totalSegments, getLeafNames }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!segment) return null;

  const isAnchor = segment.isFullTree;
  const hasInterpolation = segment.hasInterpolation;
  const steps = hasInterpolation && Array.isArray(segment.interpolationData)
    ? segment.interpolationData.length
    : 1;
  const taxaCount = !isAnchor && typeof segment.subtreeMoveCount === 'number'
    ? segment.subtreeMoveCount
    : 0;

  const Icon = isAnchor ? Anchor : ArrowRightLeft;
  const title = isAnchor ? 'Anchor' : 'Transition';

  const subtreeGroups = !isAnchor ? getMovingSubtreeGroups(segment.jumpingSubtrees, getLeafNames) : [];
  const hasManyGroups = subtreeGroups.length > 3;
  const visibleGroups = isExpanded ? subtreeGroups : subtreeGroups.slice(0, 3);

  return (
    <div className="space-y-1.5 w-full">
      {/* Header */}
      <div className="flex items-center gap-1.5 pb-1.5 border-b border-border">
        <Icon className="size-3.5 text-primary shrink-0" />
        <span className="font-semibold text-xs truncate">{title}</span>
        <span className="text-xs text-muted-foreground ml-auto">{segmentIndex + 1}/{totalSegments}</span>
      </div>

      {/* Content */}
      <div className="space-y-1 text-xs">
        {!isAnchor && (
          <>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium text-[10px] uppercase tracking-wider">Moving subtrees</span>
                {hasManyGroups && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(!isExpanded);
                    }}
                  >
                    {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                  </Button>
                )}
              </div>

              {subtreeGroups.length > 0 ? (
                <div className="flex flex-wrap gap-1 max-w-full">
                  {visibleGroups.map((names, idx) => (
                    <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-medium whitespace-nowrap">
                      {names.length === 1 ? (
                        names[0]
                      ) : names.length <= 2 ? (
                        names.join(', ')
                      ) : (
                        `${names[0]}, +${names.length - 1}`
                      )}
                    </Badge>
                  ))}
                  {!isExpanded && hasManyGroups && (
                    <span className="text-[10px] text-muted-foreground self-center pl-1">
                      +{subtreeGroups.length - 3} more
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 text-muted-foreground border-t border-border/50 mt-1">
               <span>{steps} steps</span>
               <span>{taxaCount} taxa</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
