import React from 'react';
import { Badge } from '@/components/ui/badge';
import { formatSubtreeLabel } from '@/domain/tree/sprAnalyticsUtils';

interface SprPairActivityTableProps {
    rows: any[];
    sortedLeaves: string[];
}

const formatMetric = (value: unknown): string => {
    const number = Number(value);
    if (!Number.isFinite(number)) return '-';
    return number.toFixed(3);
};

const formatPairLabel = (row: any): string => {
    if (row.sourceTreeIndex !== null && row.destinationTreeIndex !== null) {
        return `${row.sourceTreeIndex} -> ${row.destinationTreeIndex}`;
    }
    return row.pairKey;
};

const formatAttachment = (attachment: number[] | undefined, sortedLeaves: string[]): string => {
    if (!Array.isArray(attachment) || attachment.length === 0) return '-';
    return formatSubtreeLabel(attachment, sortedLeaves);
};

const getPrimaryAttachmentContext = (row: any) => {
    return Array.isArray(row.topMover?.attachmentContexts)
        ? row.topMover.attachmentContexts[0]
        : null;
};

export const SprPairActivityTable = ({ rows, sortedLeaves }: SprPairActivityTableProps) => (
    <table className="w-full text-xs">
        <thead className="bg-muted/40 text-muted-foreground font-bold sticky top-0 z-10">
            <tr>
                <th className="px-4 py-2 text-left font-bold uppercase tracking-wider text-2xs">Pair</th>
                <th className="px-4 py-2 text-right font-bold uppercase tracking-wider text-2xs">Movers</th>
                <th className="px-4 py-2 text-right font-bold uppercase tracking-wider text-2xs">Unique</th>
                <th className="px-4 py-2 text-right font-bold uppercase tracking-wider text-2xs">Events</th>
                <th className="px-4 py-2 text-right font-bold uppercase tracking-wider text-2xs">RF</th>
                <th className="px-4 py-2 text-right font-bold uppercase tracking-wider text-2xs">W-RF</th>
                <th className="px-4 py-2 text-left font-bold uppercase tracking-wider text-2xs">Top Mover</th>
                <th className="px-4 py-2 text-left font-bold uppercase tracking-wider text-2xs">Source Attachment</th>
                <th className="px-4 py-2 text-left font-bold uppercase tracking-wider text-2xs">Destination Attachment</th>
            </tr>
        </thead>
        <tbody className="divide-y divide-border/10">
            {rows.map((row) => {
                const topMoverLabel = row.topMover
                    ? formatSubtreeLabel(row.topMover.splitIndices, sortedLeaves)
                    : '-';
                const primaryContext = getPrimaryAttachmentContext(row);
                const contextCount = row.topMover?.attachmentContexts?.length || 0;
                const extraContextLabel = contextCount > 1 ? ` +${contextCount - 1} more` : '';

                return (
                    <tr key={row.pairKey} className="hover:bg-primary/5 transition-colors">
                        <td className="px-4 py-2 font-semibold">
                            <div>{formatPairLabel(row)}</div>
                            <div className="text-2xs font-normal text-muted-foreground/70">{row.pairKey}</div>
                        </td>
                        <td className="px-4 py-2 text-right">
                            <Badge variant="secondary" className="font-mono tabular-nums">{row.moverOccurrenceCount}</Badge>
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums">{row.uniqueMoverCount}</td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums">{row.transitionEventCount}</td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums">{formatMetric(row.rfDistance)}</td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums">{formatMetric(row.weightedRfDistance)}</td>
                        <td className="px-4 py-2">
                            <div className="max-w-64 truncate font-medium">{topMoverLabel}</div>
                            {row.topMover ? (
                                <div className="text-2xs text-muted-foreground/70">
                                    {row.topMover.count} occurrences · {row.topMover.percentage.toFixed(1)}%
                                </div>
                            ) : null}
                        </td>
                        <td className="px-4 py-2">
                            <div className="max-w-48 truncate font-medium">
                                {formatAttachment(primaryContext?.sourceAttachment, sortedLeaves)}
                            </div>
                            {primaryContext ? (
                                <div className="text-2xs text-muted-foreground/70">
                                    Pivot {formatAttachment(primaryContext.pivotEdge, sortedLeaves)}{extraContextLabel}
                                </div>
                            ) : null}
                        </td>
                        <td className="px-4 py-2">
                            <div className="max-w-48 truncate font-medium">
                                {formatAttachment(primaryContext?.destinationAttachment, sortedLeaves)}
                            </div>
                            {primaryContext ? (
                                <div className="text-2xs text-muted-foreground/70">
                                    Regraft context{extraContextLabel}
                                </div>
                            ) : null}
                        </td>
                    </tr>
                );
            })}
            {rows.length === 0 && (
                <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground italic">
                        No pair-level SPR activity available for this dataset.
                    </td>
                </tr>
            )}
        </tbody>
    </table>
);
