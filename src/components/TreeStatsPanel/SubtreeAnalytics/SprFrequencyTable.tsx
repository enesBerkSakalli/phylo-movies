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
    leafNamesByIndex: string[];
}

export const SprFrequencyTable = ({ frequencies, leafNamesByIndex }: SprFrequencyTableProps) => (
    <table className="w-full text-xs">
        <thead className="bg-muted/40 text-muted-foreground font-bold sticky top-0 z-10">
            <tr>
                <th className="px-4 py-2 text-left font-bold uppercase tracking-wider text-2xs">Rank</th>
                <th className="px-4 py-2 text-left font-bold uppercase tracking-wider text-2xs">Moved Group</th>
                <th className="px-4 py-2 text-right font-bold uppercase tracking-wider text-2xs">Moves</th>
                <th className="px-4 py-2 text-right font-bold uppercase tracking-wider text-2xs">% of moves</th>
                <th className="px-4 py-2 text-right font-bold uppercase tracking-wider text-2xs">Path Hops</th>
                <th className="px-4 py-2 text-right font-bold uppercase tracking-wider text-2xs">Path Length</th>
            </tr>
        </thead>
        <tbody className="divide-y divide-border/10">
            {frequencies.map((item, idx) => (
                <tr key={item.signature} className="hover:bg-primary/5 transition-colors">
                    <td className="px-4 py-2 font-medium text-muted-foreground/60 tabular-nums text-right">{idx + 1}</td>
                    <td className="px-4 py-2 font-semibold">
                        {formatSubtreeLabel(item.splitIndices, leafNamesByIndex)}
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
                    <td className="px-4 py-2 text-right font-mono text-muted-foreground tabular-nums">
                        <div>{item.totalPathHops}</div>
                        <div className="text-2xs text-muted-foreground/60">
                            avg {item.averagePathHops.toFixed(1)}
                        </div>
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-muted-foreground tabular-nums">
                        <div>{item.totalPathLength.toFixed(3)}</div>
                        <div className="text-2xs text-muted-foreground/60">
                            avg {item.averagePathLength.toFixed(3)}
                        </div>
                    </td>
                </tr>
            ))}
            {frequencies.length === 0 && (
                <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground italic">
                        No moved groups detected for this dataset.
                    </td>
                </tr>
            )}
        </tbody>
    </table>
);
