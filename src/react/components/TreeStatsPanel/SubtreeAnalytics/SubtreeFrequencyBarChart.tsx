import React, { useMemo } from 'react';
import { useAppStore } from '../../../../js/core/store';
import { calculateSubtreeFrequencies, getTopSubtrees, formatSubtreeLabel } from '../../../../js/domain/tree/subtreeFrequencyUtils';
import { TREE_COLOR_CATEGORIES } from '../../../../js/constants/TreeColors';
import type { AppStoreState } from '../../../../types/store';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

// ==========================================================================
// STORE SELECTORS
// ==========================================================================
const EMPTY_ARRAY: any[] = [];
const selectPairSolutions = (s: AppStoreState) => s.pairSolutions;
const selectSortedLeaves = (s: AppStoreState) => s.movieData?.sorted_leaves || EMPTY_ARRAY;

/**
 * SubtreeFrequencyBarChart
 *
 * Vertical list showing top N most frequent mobile subtrees with inline frequency bars.
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
        return (
            <div className="flex items-center justify-center h-full p-4">
                <span className="text-sm text-muted-foreground italic">
                    No mobility metrics available
                </span>
            </div>
        );
    }

    return (
        <div
            className="w-full h-full overflow-auto p-2 space-y-2"
            role="list"
            aria-label="Subtree Mobility Frequency Ranking"
        >
            {data.map((item) => (
                <Card
                    key={item.rank}
                    className="border-border/40 bg-muted/5 hover:bg-muted/20 transition-colors py-3 gap-2 rounded-lg shadow-none"
                    role="listitem"
                    aria-label={`Rank ${item.rank}: ${item.subtree}, ${item.count} rearrangement events`}
                >
                    <CardContent className="px-3 py-0 space-y-2">
                        {/* Header row with rank, count badge, and percentage */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Label className="text-xs font-bold text-muted-foreground/60 w-5">
                                    #{item.rank}
                                </Label>
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

                        {/* Frequency bar */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div>
                                    <Progress
                                        value={(item.count / maxCount) * 100}
                                        aria-label={`Frequency: ${item.percentage.toFixed(1)}%`}
                                        className="h-2 bg-secondary/50"
                                        style={{
                                            // Override indicator color via CSS variable
                                            '--progress-color': TREE_COLOR_CATEGORIES.markedColor
                                        } as React.CSSProperties}
                                    />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs tabular-nums">
                                <div className="flex flex-col gap-0.5">
                                    <span>Rearrangements: {item.count}</span>
                                    <span>Frequency: {item.percentage.toFixed(2)}%</span>
                                </div>
                            </TooltipContent>
                        </Tooltip>

                        {/* Full taxa names - wrapping allowed */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="text-xs text-foreground/90 leading-relaxed break-words cursor-default line-clamp-2">
                                    {item.subtree}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs text-xs">
                                <span className="break-words">{item.subtree}</span>
                            </TooltipContent>
                        </Tooltip>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};
