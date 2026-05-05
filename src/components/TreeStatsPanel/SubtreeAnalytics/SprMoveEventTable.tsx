import React from 'react';
import { Badge } from '@/components/ui/badge';
import { formatSubtreeLabel } from '@/domain/spr/sprAnalytics';
import type { SprMoveEventRow } from './types';

interface SprMoveEventTableProps {
    events: SprMoveEventRow[];
    leafNamesByIndex: string[];
    selectedMoverIndices?: number[];
}

const formatMetric = (value: unknown): string => {
    const number = Number(value);
    if (!Number.isFinite(number)) return '-';
    return number.toFixed(3);
};

const formatAttachment = (attachment: number[] | undefined, leafNamesByIndex: string[]): string => {
    if (!Array.isArray(attachment) || attachment.length === 0) return '-';
    return formatSubtreeLabel(attachment, leafNamesByIndex);
};

const formatCompactAttachment = (
    attachment: number[] | undefined,
    leafNamesByIndex: string[],
    maxNames = 3,
): string => {
    if (!Array.isArray(attachment) || attachment.length === 0) return '-';

    const fullLabel = formatSubtreeLabel(attachment, leafNamesByIndex);
    if (attachment.length <= maxNames) return fullLabel;

    const names = attachment
        .slice(0, maxNames)
        .map((idx) => leafNamesByIndex[idx])
        .filter(Boolean);
    const prefix = names.length > 0 ? names.join(', ') : `Nodes ${attachment.slice(0, maxNames).join(', ')}`;
    return `${prefix} +${attachment.length - maxNames} more`;
};

const getSignature = (indices?: number[]): string | null => {
    if (!Array.isArray(indices) || indices.length === 0) return null;
    return [...indices].sort((a, b) => a - b).join(',');
};

const formatStepRange = (stepRange: [number, number] | null): string => (
    Array.isArray(stepRange) ? `${stepRange[0]}-${stepRange[1]}` : '-'
);

export const SprMoveEventTable = ({ events, leafNamesByIndex, selectedMoverIndices = [] }: SprMoveEventTableProps) => {
    const selectedMoverSignature = getSignature(selectedMoverIndices);

    return (
        <table className="min-w-[1180px] w-full table-fixed text-xs">
            <thead className="bg-muted/40 text-muted-foreground font-bold sticky top-0 z-10">
                <tr>
                    <th className="w-24 px-3 py-2 text-left font-bold uppercase tracking-wider text-2xs">Event</th>
                    <th className="w-20 px-3 py-2 text-left font-bold uppercase tracking-wider text-2xs">Pair</th>
                    <th className="w-40 px-3 py-2 text-left font-bold uppercase tracking-wider text-2xs">Moved Subtree</th>
                    <th className="w-36 px-3 py-2 text-left font-bold uppercase tracking-wider text-2xs">Pivot</th>
                    <th className="w-44 px-3 py-2 text-left font-bold uppercase tracking-wider text-2xs">From</th>
                    <th className="w-44 px-3 py-2 text-left font-bold uppercase tracking-wider text-2xs">To</th>
                    <th className="w-20 px-3 py-2 text-right font-bold uppercase tracking-wider text-2xs">Steps</th>
                    <th className="w-20 px-3 py-2 text-right font-bold uppercase tracking-wider text-2xs">Hops</th>
                    <th className="w-24 px-3 py-2 text-right font-bold uppercase tracking-wider text-2xs">Length</th>
                    <th className="w-24 px-3 py-2 text-right font-bold uppercase tracking-wider text-2xs">Tree Change</th>
                    <th className="w-28 px-3 py-2 text-right font-bold uppercase tracking-wider text-2xs">Weighted</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
                {events.map((event) => {
                    const isSelected = selectedMoverSignature === event.signature;
                    const subtreeLabel = formatCompactAttachment(event.splitIndices, leafNamesByIndex, 4);
                    const fullSubtreeLabel = formatAttachment(event.splitIndices, leafNamesByIndex);

                    return (
                        <tr key={event.eventId} className="hover:bg-primary/5 transition-colors align-top">
                            <td className="px-3 py-3 font-mono tabular-nums text-muted-foreground">
                                <div>{event.eventId}</div>
                                {!event.hasMeasuredPath ? (
                                    <div className="text-2xs text-muted-foreground/70">inferred</div>
                                ) : null}
                            </td>
                            <td className="px-3 py-3 font-semibold">
                                <div>{event.pairLabel}</div>
                                <div className="text-2xs font-normal text-muted-foreground/70">{event.pairKey}</div>
                            </td>
                            <td className="px-3 py-3" title={fullSubtreeLabel}>
                                <div className="truncate font-medium">{subtreeLabel}</div>
                                <div className="text-2xs text-muted-foreground/70">
                                    {event.splitIndices.length} taxa
                                    {isSelected ? <Badge variant="outline" className="ml-2 h-4 px-1 text-[10px]">selected</Badge> : null}
                                </div>
                            </td>
                            <td className="px-3 py-3" title={formatAttachment(event.pivotEdge, leafNamesByIndex)}>
                                <div className="truncate">{formatCompactAttachment(event.pivotEdge, leafNamesByIndex)}</div>
                            </td>
                            <td className="px-3 py-3" title={formatAttachment(event.sourceAttachment, leafNamesByIndex)}>
                                <div className="truncate">{formatCompactAttachment(event.sourceAttachment, leafNamesByIndex)}</div>
                            </td>
                            <td className="px-3 py-3" title={formatAttachment(event.destinationAttachment, leafNamesByIndex)}>
                                <div className="truncate">{formatCompactAttachment(event.destinationAttachment, leafNamesByIndex)}</div>
                            </td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums">{formatStepRange(event.stepRange)}</td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums">{event.totalPathHops}</td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums">{formatMetric(event.totalPathLength)}</td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums">{formatMetric(event.rfDistance)}</td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums">{formatMetric(event.weightedRfDistance)}</td>
                        </tr>
                    );
                })}
                {events.length === 0 && (
                    <tr>
                        <td colSpan={11} className="px-4 py-12 text-center text-muted-foreground italic">
                            No SPR move events available for this dataset.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    );
};
