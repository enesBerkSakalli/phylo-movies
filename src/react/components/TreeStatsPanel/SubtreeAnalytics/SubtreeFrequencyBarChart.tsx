import React, { useMemo } from 'react';
import { useAppStore } from '../../../../js/core/store';
import { calculateSubtreeFrequencies, getTopSubtrees, formatSubtreeLabel } from '../../../../js/domain/tree/subtreeFrequencyUtils';
import { TREE_COLOR_CATEGORIES } from '../../../../js/constants/TreeColors';
import type { AppStoreState } from '../../../../types/store';
import { Badge } from '@/components/ui/badge';

// ==========================================================================
// STORE SELECTORS
// ==========================================================================
const EMPTY_ARRAY: any[] = [];
const selectPairSolutions = (s: AppStoreState) => s.pairSolutions;
const selectSortedLeaves = (s: AppStoreState) => s.movieData?.sorted_leaves || EMPTY_ARRAY;

/**
 * SubtreeFrequencyBarChart
 *
 * Vertical list showing top N most frequent jumping subtrees with inline bars.
 * Uses tree_pair_solutions.jumping_subtree_solutions as the data source.
 */
export const SubtreeFrequencyBarChart = () => {
    const pairSolutions = useAppStore(selectPairSolutions);
    const sortedLeaves = useAppStore(selectSortedLeaves);

    const data = useMemo(() => {
        if (!pairSolutions || Object.keys(pairSolutions).length === 0) return [];

        const allFreqs = calculateSubtreeFrequencies(pairSolutions);
        const topSubtrees = getTopSubtrees(allFreqs, 10); // Top 10

        return topSubtrees.map((item: any, idx: number) => ({
            rank: idx + 1,
            subtree: formatSubtreeLabel(item.splitIndices, sortedLeaves),
            taxaCount: item.splitIndices.length,
            count: item.count,
            percentage: item.percentage
        }));
    }, [pairSolutions, sortedLeaves]);

    const maxCount = useMemo(() => {
        return data.length > 0 ? Math.max(...data.map(d => d.count)) : 1;
    }, [data]);

    if (!data || data.length === 0) {
        return <div className="text-center text-muted-foreground p-4">No mobility metrics available.</div>;
    }

    return (
        <div className="w-full h-full overflow-auto p-2 space-y-2">
            {data.map((item) => (
                <div
                    key={item.rank}
                    className="group relative rounded-lg border border-border/40 bg-muted/5 hover:bg-muted/20 transition-colors p-3"
                >
                    {/* Header row with rank, count badge, and percentage */}
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground/60 w-5">
                                #{item.rank}
                            </span>
                            <Badge variant="secondary" className="font-mono text-xs tabular-nums">
                                {item.count} events
                            </Badge>
                            <span className="text-2xs text-muted-foreground">
                                ({item.taxaCount} taxa)
                            </span>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground tabular-nums">
                            {item.percentage.toFixed(1)}%
                        </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2 bg-secondary/50 rounded-full overflow-hidden mb-2">
                        <div
                            className="h-full rounded-full transition-all"
                            style={{
                                width: `${(item.count / maxCount) * 100}%`,
                                backgroundColor: TREE_COLOR_CATEGORIES.markedColor
                            }}
                        />
                    </div>

                    {/* Full taxa names - wrapping allowed */}
                    <div className="text-xs text-foreground/90 leading-relaxed break-words">
                        {item.subtree}
                    </div>
                </div>
            ))}
        </div>
    );
};
