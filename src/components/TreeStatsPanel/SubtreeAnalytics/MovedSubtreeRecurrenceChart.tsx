import React, { useMemo } from 'react';
import { selectLeafNamesByIndex, selectPairSolutions, useAppStore } from '@/state/phyloStore/store.js';
import { calculateSprMovedSubtreeRecurrences, getTopSprMovedSubtreeRecurrences, formatSubtreeLabel } from '@/domain/spr/sprAnalytics';
import { SYSTEM_TREE_COLORS } from '@/constants/TreeColors';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * MovedSubtreeRecurrenceChart
 *
 * Vertical list showing top recurrent moved subtrees with inline recurrence bars.
 * Uses backend spr_move_events for movement analytics.
 *
 * TUFTE PRINCIPLES:
 * - Zero Baseline: All bars scale from 0 (implicit in Progress component)
 * - Linear Scale: Bar width = percentage of movements, ensuring proportional ink
 * - No Visual Inflation: Progress component uses semantic height; no minimum bar height distorts small values
 */
export const MovedSubtreeRecurrenceChart = () => {
    const pairSolutions = useAppStore(selectPairSolutions);
    const leafNamesByIndex = useAppStore(selectLeafNamesByIndex);

    const data = useMemo(() => {
        if (!pairSolutions || Object.keys(pairSolutions).length === 0) return [];

        const movedSubtreeRecurrences = calculateSprMovedSubtreeRecurrences(pairSolutions);
        const topSubtrees = getTopSprMovedSubtreeRecurrences(movedSubtreeRecurrences, 10);

        return topSubtrees.map((item: any, idx: number) => ({
            rank: idx + 1,
            subtree: formatSubtreeLabel(item.splitIndices, leafNamesByIndex),
            taxaCount: item.splitIndices.length,
            count: item.count,
            percentage: item.percentage
        }));
    }, [pairSolutions, leafNamesByIndex]);

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full p-4">
                <span className="text-sm text-muted-foreground italic">
                    No SPR move metrics available
                </span>
            </div>
        );
    }

    return (
        <div
            className="w-full h-full overflow-auto p-2 space-y-2"
            role="list"
            aria-label="SPR moved subtree ranking"
        >
            {data.map((item) => (
                <Card
                    key={item.rank}
                    className="border-border/40 bg-muted/5 hover:bg-muted/20 transition-colors py-3 gap-2 rounded-lg shadow-none"
                    role="listitem"
                    aria-label={`Rank ${item.rank}: ${item.subtree}, ${item.count} moves`}
                >
                    <CardContent className="px-3 py-0 space-y-2">
                        {/* Header row with rank, count badge, and percentage */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Label className="text-xs font-bold text-muted-foreground/60 w-5">
                                    #{item.rank}
                                </Label>
                                <Badge variant="secondary" className="font-mono text-xs tabular-nums">
                                    {item.count} moves
                                </Badge>
                                <span className="text-2xs text-muted-foreground">
                                    ({item.taxaCount} taxa)
                                </span>
                            </div>
                            <span className="text-xs font-mono text-muted-foreground tabular-nums">
                                {item.percentage.toFixed(1)}%
                            </span>
                        </div>

                        {/* Recurrence bar - ZERO BASELINE, LINEAR SCALE */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div>
                                    <Progress
                                        value={item.percentage}
                                        aria-label={`Share of moves: ${item.percentage.toFixed(1)}%`}
                                        className="h-2 bg-secondary/50"
                                        style={{
                                            // Override indicator color via CSS variable
                                            '--progress-color': SYSTEM_TREE_COLORS.markedColor
                                        } as React.CSSProperties}
                                    />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs tabular-nums">
                                <div className="flex flex-col gap-1">
                                    <span>Moves: {item.count}</span>
                                    <span>Share: {item.percentage.toFixed(2)}%</span>
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
