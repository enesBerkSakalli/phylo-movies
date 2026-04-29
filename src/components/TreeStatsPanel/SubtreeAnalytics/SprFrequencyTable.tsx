import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatSubtreeLabel } from '@/domain/tree/sprAnalyticsUtils';
import type { SprMoverFrequency } from './types';

interface SprFrequencyTableProps {
    frequencies: SprMoverFrequency[];
    sortedLeaves: string[];
}

export const SprFrequencyTable = ({ frequencies, sortedLeaves }: SprFrequencyTableProps) => (
    <table className="w-full text-xs">
        <thead className="bg-muted/40 text-muted-foreground font-bold sticky top-0 z-10">
            <tr>
                <th className="px-4 py-2 text-left font-bold uppercase tracking-wider text-2xs">Rank</th>
                <th className="px-4 py-2 text-left font-bold uppercase tracking-wider text-2xs">Subtree</th>
                <th className="px-4 py-2 text-right font-bold uppercase tracking-wider text-2xs">Count</th>
                <th className="px-4 py-2 text-right font-bold uppercase tracking-wider text-2xs">% of mover occurrences</th>
            </tr>
        </thead>
        <tbody className="divide-y divide-border/10">
            {frequencies.map((item, idx) => (
                <tr key={item.signature} className="hover:bg-primary/5 transition-colors">
                    <td className="px-4 py-2 font-medium text-muted-foreground/60 tabular-nums text-right">{idx + 1}</td>
                    <td className="px-4 py-2 font-semibold">
                        {formatSubtreeLabel(item.splitIndices, sortedLeaves)}
                        <div className="text-2xs font-normal text-muted-foreground/70 mt-1">
                            {item.splitIndices.length} taxa
                        </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                        <Badge variant="secondary" className="font-mono tabular-nums">{item.count}</Badge>
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-muted-foreground tabular-nums">
                        <Tooltip>
                            <TooltipTrigger className="cursor-help hover:text-foreground transition-colors">
                                {item.percentage.toFixed(1)}%
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-2xs font-mono bg-popover border-border">
                                <div className="space-y-1">
                                    <div>Full Precision:</div>
                                    <div className="font-bold text-primary">
                                        {item.percentage.toFixed(6)}%
                                    </div>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </td>
                </tr>
            ))}
            {frequencies.length === 0 && (
                <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground italic">
                        No moving-subtree occurrences detected for this dataset.
                    </td>
                </tr>
            )}
        </tbody>
    </table>
);
