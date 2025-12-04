import React from 'react';
import { Anchor, ArrowRightLeft, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * Formats jumping subtree solutions by converting leaf indices to taxon names.
 * @param {Array} jumpingSubtrees - Array of solutions with leaf indices
 * @param {Function} getLeafNamesByIndices - Function to convert indices to names
 * @returns {React.ReactNode} Formatted subtree display
 */
function formatMovingSubtrees(jumpingSubtrees, getLeafNamesByIndices) {
  if (!jumpingSubtrees || !jumpingSubtrees.length || !getLeafNamesByIndices) {
    return <span className="text-muted-foreground">—</span>;
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

  if (subtreeGroups.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5 max-w-full">
      {subtreeGroups.map((names, idx) => (
        <Badge key={idx} variant="secondary" className="text-xs font-medium whitespace-nowrap">
          {names.length === 1 ? (
            names[0]
          ) : names.length <= 3 ? (
            names.join(', ')
          ) : names.length <= 5 ? (
            `${names.slice(0, 4).join(', ')}, …`
          ) : (
            `${names.slice(0, 3).join(', ')} +${names.length - 3}`
          )}
        </Badge>
      ))}
    </div>
  );
}

/**
 * Timeline segment tooltip content component
 */
export function TimelineSegmentTooltip({ segment, segmentIndex, totalSegments, getLeafNames }) {
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
  const title = isAnchor ? 'Anchor Point — Stable Tree' : 'Transition Segment';
  const hint = isAnchor
    ? 'Non-scrubbable anchor • Click to jump • ←/→ to step'
    : 'Drag to scrub • Click segment to jump';

  return (
    <div className="space-y-3 w-full">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <Icon className="size-4 text-primary shrink-0" />
        <span className="font-semibold text-sm truncate">{title}</span>
      </div>

      {/* Content */}
      <div className="space-y-2 text-sm">
        <div className="flex items-baseline gap-4">
          <span className="text-muted-foreground font-medium shrink-0">Segment:</span>
          <span className="font-semibold ml-auto">{segmentIndex + 1} / {totalSegments}</span>
        </div>

        {!isAnchor && (
          <>
            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground font-medium">Moving subtrees:</span>
              <div className="w-full overflow-hidden">
                {formatMovingSubtrees(segment.jumpingSubtrees, getLeafNames)}
              </div>
            </div>

            <div className="flex items-baseline gap-4">
              <span className="text-muted-foreground font-medium shrink-0">Steps:</span>
              <span className="font-semibold ml-auto">{steps} step{steps !== 1 ? 's' : ''}</span>
            </div>

            <div className="flex items-baseline gap-4">
              <span className="text-muted-foreground font-medium shrink-0">Taxa moving:</span>
              <span className="font-semibold ml-auto">{taxaCount}</span>
            </div>
          </>
        )}
      </div>

      {/* Footer hint */}
      <div className="flex items-start gap-2 pt-2 border-t border-border">
        <Info className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
        <span className="text-xs text-muted-foreground italic leading-tight">{hint}</span>
      </div>
    </div>
  );
}
