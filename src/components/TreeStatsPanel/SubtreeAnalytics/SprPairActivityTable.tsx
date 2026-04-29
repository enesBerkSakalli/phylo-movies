import React from 'react';
import { Badge } from '@/components/ui/badge';
import { formatSubtreeLabel } from '@/domain/tree/sprAnalyticsUtils';

interface SprPairActivityTableProps {
    rows: any[];
    sortedLeaves: string[];
    selectedMoverIndices?: number[];
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

const formatCompactAttachment = (
    attachment: number[] | undefined,
    sortedLeaves: string[],
    maxNames = 2,
): string => {
    if (!Array.isArray(attachment) || attachment.length === 0) return '-';

    const fullLabel = formatSubtreeLabel(attachment, sortedLeaves);
    if (attachment.length <= maxNames) return fullLabel;

    const names = attachment
        .slice(0, maxNames)
        .map((idx) => sortedLeaves[idx])
        .filter(Boolean);
    const prefix = names.length > 0 ? names.join(', ') : `Nodes ${attachment.slice(0, maxNames).join(', ')}`;
    return `${prefix} +${attachment.length - maxNames} more`;
};

const getSignature = (indices?: number[]): string | null => {
    if (!Array.isArray(indices) || indices.length === 0) return null;
    return [...indices].sort((a, b) => a - b).join(',');
};

const getPrimaryAttachmentContext = (mover: any) => {
    return Array.isArray(mover?.attachmentContexts)
        ? mover.attachmentContexts[0]
        : null;
};

const resolveMoverContext = (row: any, selectedMoverSignature: string | null) => {
    const movers = Array.isArray(row.movers) ? row.movers : [];

    if (selectedMoverSignature) {
        const selectedMover = movers.find((mover: any) => mover.signature === selectedMoverSignature);
        return {
            mover: selectedMover || null,
            mode: selectedMover ? 'Selected mover' : 'Selected mover absent',
        };
    }

    return {
        mover: row.topMover || null,
        mode: row.topMover ? 'Top mover' : 'No mover',
    };
};

export const SprPairActivityTable = ({ rows, sortedLeaves, selectedMoverIndices = [] }: SprPairActivityTableProps) => {
    const selectedMoverSignature = getSignature(selectedMoverIndices);
    const selectedMoverLabel = selectedMoverSignature
        ? formatCompactAttachment(selectedMoverIndices, sortedLeaves, 3)
        : null;

    return (
        <table className="min-w-[912px] w-full table-fixed text-xs">
            <thead className="bg-muted/40 text-muted-foreground font-bold sticky top-0 z-10">
                <tr>
                    <th className="w-20 px-3 py-2 text-left font-bold uppercase tracking-wider text-2xs">Pair</th>
                    <th className="w-16 px-3 py-2 text-right font-bold uppercase tracking-wider text-2xs">Movers</th>
                    <th className="w-16 px-3 py-2 text-right font-bold uppercase tracking-wider text-2xs">Unique</th>
                    <th className="w-16 px-3 py-2 text-right font-bold uppercase tracking-wider text-2xs">Events</th>
                    <th className="w-16 px-3 py-2 text-right font-bold uppercase tracking-wider text-2xs">RFD</th>
                    <th className="w-20 px-3 py-2 text-right font-bold uppercase tracking-wider text-2xs">W-RFD</th>
                    <th className="w-36 px-3 py-2 text-left font-bold uppercase tracking-wider text-2xs">Mover Context</th>
                    <th className="w-44 px-3 py-2 text-left font-bold uppercase tracking-wider text-2xs">Source Attachment</th>
                    <th className="w-44 px-3 py-2 text-left font-bold uppercase tracking-wider text-2xs">Destination Attachment</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
                {rows.map((row) => {
                    const { mover, mode } = resolveMoverContext(row, selectedMoverSignature);
                    const moverLabel = mover
                        ? formatCompactAttachment(mover.splitIndices, sortedLeaves, 3)
                        : '-';
                    const fullMoverLabel = mover
                        ? formatAttachment(mover.splitIndices, sortedLeaves)
                        : selectedMoverLabel || '-';
                    const primaryContext = getPrimaryAttachmentContext(mover);
                    const contextCount = mover?.attachmentContexts?.length || 0;
                    const extraContextLabel = contextCount > 1 ? ` +${contextCount - 1} more` : '';

                    return (
                        <tr key={row.pairKey} className="hover:bg-primary/5 transition-colors align-top">
                            <td className="px-3 py-3 font-semibold">
                                <div>{formatPairLabel(row)}</div>
                                <div className="text-2xs font-normal text-muted-foreground/70">{row.pairKey}</div>
                            </td>
                            <td className="px-3 py-3 text-right">
                                <Badge variant="secondary" className="font-mono tabular-nums">{row.moverOccurrenceCount}</Badge>
                            </td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums">{row.uniqueMoverCount}</td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums">{row.transitionEventCount}</td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums">{formatMetric(row.rfDistance)}</td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums">{formatMetric(row.weightedRfDistance)}</td>
                            <td className="px-3 py-3" title={fullMoverLabel}>
                                <div className="truncate font-medium">{moverLabel}</div>
                                {mover ? (
                                    <div className="text-2xs text-muted-foreground/70">
                                        {mode} · {mover.count} occurrences · {mover.percentage.toFixed(1)}%
                                    </div>
                                ) : selectedMoverSignature ? (
                                    <div className="text-2xs text-muted-foreground/70">Selected mover absent</div>
                                ) : null}
                            </td>
                            <td
                                className="px-3 py-3"
                                title={primaryContext ? formatAttachment(primaryContext.sourceAttachment, sortedLeaves) : undefined}
                            >
                                <div className="truncate font-medium">
                                    {formatCompactAttachment(primaryContext?.sourceAttachment, sortedLeaves)}
                                </div>
                                {primaryContext ? (
                                    <div
                                        className="truncate text-2xs text-muted-foreground/70"
                                        title={formatAttachment(primaryContext.pivotEdge, sortedLeaves)}
                                    >
                                        Pivot {formatCompactAttachment(primaryContext.pivotEdge, sortedLeaves)}{extraContextLabel}
                                    </div>
                                ) : null}
                            </td>
                            <td
                                className="px-3 py-3"
                                title={primaryContext ? formatAttachment(primaryContext.destinationAttachment, sortedLeaves) : undefined}
                            >
                                <div className="truncate font-medium">
                                    {formatCompactAttachment(primaryContext?.destinationAttachment, sortedLeaves)}
                                </div>
                                {primaryContext ? (
                                    <div className="truncate text-2xs text-muted-foreground/70">
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
};
