import React from 'react';
import { Badge } from '../../ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '../../ui/tooltip';
import { formatSubtreeLabel } from '../../../domain/spr/sprAnalytics';
import {
    selectMarkedNodes,
    selectSetManuallyMarkedNodes,
    useAppStore,
} from '../../../state/phyloStore/store.js';
import type { SprMovedSubtreeRecurrence } from './types';

interface MovedSubtreeRecurrenceTableProps {
    recurrences: SprMovedSubtreeRecurrence[];
    leafNamesByIndex: string[];
}

const getSignature = (indices?: number[]): string => {
    if (!Array.isArray(indices) || indices.length === 0) return '';
    return [...indices].sort((a, b) => a - b).join(',');
};

export const MovedSubtreeRecurrenceTable = ({ recurrences, leafNamesByIndex }: MovedSubtreeRecurrenceTableProps) => {
    const markedNodes = useAppStore(selectMarkedNodes);
    const setManuallyMarkedNodes = useAppStore(selectSetManuallyMarkedNodes);
    const currentSignature = getSignature(markedNodes);

    const handleSubtreeClick = (splitIndices: number[]) => {
        const signature = getSignature(splitIndices);
        if (signature === currentSignature) {
            setManuallyMarkedNodes([]);
            return;
        }
        setManuallyMarkedNodes(splitIndices);
    };

    return (
        <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground font-bold sticky top-0 z-10">
                <tr>
                    <th className="px-4 py-2 text-left font-bold uppercase tracking-wider text-2xs">Rank</th>
                    <th className="px-4 py-2 text-left font-bold uppercase tracking-wider text-2xs">Moved Subtree</th>
                    <th className="px-4 py-2 text-right font-bold uppercase tracking-wider text-2xs">Movements</th>
                    <th className="px-4 py-2 text-right font-bold uppercase tracking-wider text-2xs">Tree Pairs</th>
                    <th className="px-4 py-2 text-right font-bold uppercase tracking-wider text-2xs">% of movements</th>
                    <th className="px-4 py-2 text-right font-bold uppercase tracking-wider text-2xs">Path Hops</th>
                    <th className="px-4 py-2 text-right font-bold uppercase tracking-wider text-2xs">Path Length</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
                {recurrences.map((item, idx) => {
                    const isActive = getSignature(item.splitIndices) === currentSignature;
                    const subtreeLabel = formatSubtreeLabel(item.splitIndices, leafNamesByIndex);

                    return (
                        <tr
                            key={item.signature}
                            role="button"
                            tabIndex={0}
                            aria-pressed={isActive}
                            aria-label={`${subtreeLabel}, ${item.count} movements, ${item.percentage.toFixed(1)}%`}
                            onClick={() => handleSubtreeClick(item.splitIndices)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    handleSubtreeClick(item.splitIndices);
                                }
                            }}
                            className={[
                                'cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                                isActive ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-primary/5',
                            ].join(' ')}
                        >
                            <td className="px-4 py-2 font-medium text-muted-foreground/60 tabular-nums text-right">{idx + 1}</td>
                            <td className="px-4 py-2 font-semibold">
                                {subtreeLabel}
                                <div className="text-2xs font-normal text-muted-foreground/70 mt-1">
                                    {item.splitIndices.length} taxa
                                </div>
                            </td>
                            <td className="px-4 py-2 text-right">
                                <Badge variant={isActive ? 'default' : 'secondary'} className="font-mono tabular-nums">{item.count}</Badge>
                            </td>
                            <td className="px-4 py-2 text-right font-mono text-muted-foreground tabular-nums">
                                {item.pairCount ?? item.pairKeys?.length ?? '-'}
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
                    );
                })}
                {recurrences.length === 0 && (
                    <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground italic">
                            No moved subtrees detected for this dataset.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    );
};
