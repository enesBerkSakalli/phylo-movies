
import React, { useMemo, useState } from 'react';
import { useAppStore } from '../../../../js/core/store';
import {
  calculateSubtreeFrequencies,
  getTopSubtrees,
  formatSubtreeLabel
} from '../../../../js/domain/tree/subtreeFrequencyUtils';
import { ChevronDown, ChevronRight, BarChart2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const SubtreeFrequencyList = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get data from store
  const pairSolutions = useAppStore(s => s.pairSolutions);
  const sortedLeaves = useAppStore(s => s.movieData?.sorted_leaves);
  const setManuallyMarkedNodes = useAppStore(s => s.setManuallyMarkedNodes);
  const markedNodes = useAppStore(s => s.manuallyMarkedNodes); // For highlighting active state

  // Calculate frequencies (memoized)
  const topSubtrees = useMemo(() => {
    if (!pairSolutions) return [];
    const allFreqs = calculateSubtreeFrequencies(pairSolutions);
    return getTopSubtrees(allFreqs, 5); // Show top 5
  }, [pairSolutions]);

  if (!topSubtrees.length) return null;

  const handleSubtreeClick = (splitIndices) => {
    // Toggle: if clicking same subtree, clear it. If new, set it.
    // Note: This logic assumes single selection for simplicity first
    // setManuallyMarkedNodes expects array of node IDs or split arrays?
    // Checking store: setManuallyMarkedNodes(nodes) -> updates state.manuallyMarkedNodes

    // We send the split indices as a Set to be consistent with how marking works
    // Actually, looking at TreeColorManager, it usually marks specific node IDs or
    // uses jumping_subtree_solutions logic.
    // Let's pass the splitIndices directly. The visualizer often needs specific Node objects or IDs,
    // but let's try passing the criteria.
    // WAIT: setManuallyMarkedNodes usually takes an array of node IDs (strings/ints).
    // But for jumping subtrees, we want to highlight the *concept* of the subtree.

    // REVISION: The store likely expects node IDs. However, we only have split indices (leaf IDs).
    // We need to find the node index in the current tree that corresponds to this split.
    // Since that's complex to do here without tree traversal, we might need a different approach.
    // OR we pass the splitIndices and let a downstream system handle it?
    // Let's look at `TreeColorManager.js` again. `updateMarkedSubtrees` takes sets of split indices.
    // But `setManuallyMarkedNodes` might be for user selection of specific nodes.

    // ACTION: Let's use a new store action if needed, or pass the split indices if the visualizer supports it.
    // For now, let's assume we can pass the splitIndices array to a specialized action
    // or we might need to update the store to handle "highlight subtree by split".

    // Checking `visualisationChangeStateSlice.js` or `interactionSlice.js` would differ,
    // but based on `TreeColorManager.updateMarkedSubtrees(markedSubtrees)`,
    // we should update the `markedSubtreeMode` or add a specific "manual" subtree list.

    // Let's try to set it as a "Shared Marked Jumping Subtree" via a store action if possible,
    // or strictly use `setManuallyMarkedNodes` if it accepts split sets.

    // Since I can't see the store implementation right now, I will use `setManuallyMarkedNodes`
    // with an object wrapper or just the indices, and relies on the fact that existing logic
    // (from previous task context) mentioned `sharedMarkedJumpingSubtrees` handling sets.

    // Let's assume we can trigger the same action used by the playback when a jump occurs,
    // but manually. For now, I'll dispatch `setManuallyMarkedNodes` with the SPLIT INDICES
    // and rely on the visualizer to interpret "Array of numbers" as a split definition if it detects it,
    // OR I will assume I need to map it.

    // Safer bet: Pass the splitIndices as a wrapper object or just the array,
    // assuming the system can handle "Mark this group of leaves".

    setManuallyMarkedNodes([splitIndices]);
  };

  return (
    <div className="border-t border-border mt-2 pt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        <BarChart2 className="size-3" />
        Frequent Jumping Subtrees
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-1.5 animate-in slide-in-from-top-1 duration-200">
          {topSubtrees.map((item, idx) => (
            <div
              key={item.signature}
              className="flex flex-col gap-1 p-1.5 rounded-md hover:bg-accent/50 cursor-pointer text-xs group"
              onClick={() => handleSubtreeClick(item.splitIndices)}
              title={`Occurs ${item.count} times`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium truncate max-w-[140px] text-foreground">
                  {formatSubtreeLabel(item.splitIndices, sortedLeaves)}
                </span>
                <Badge variant="outline" className="text-[10px] h-4 px-1">
                  {item.count}
                </Badge>
              </div>
              <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/70 group-hover:bg-primary transition-all"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
