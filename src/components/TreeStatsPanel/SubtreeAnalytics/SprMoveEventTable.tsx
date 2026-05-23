import React from 'react';
import {
    getCoreRowModel,
    getFilteredRowModel,
    useReactTable,
    type ColumnDef,
    type FilterFn,
} from '@tanstack/react-table';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { formatSubtreeLabel } from '../../../domain/spr/sprAnalytics';
import { Search, X } from 'lucide-react';
import type { SprMoveEventRow } from './types';
import { buildSprMoveEventSearchText } from './sprMoveEventSearch';
import { SPR_MOVE_EVENT_TABLE_COPY } from './SprMoveEventTable.contract';
import { formatSupportValue } from '../../../domain/tree/branchSupportIndex';

interface SprMoveEventTableProps {
    events: SprMoveEventRow[];
    leafNamesByIndex: string[];
    selectedMovedSubtreeIndices?: number[];
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

const formatSupportClass = (supportClass: string | undefined): string => {
    switch (supportClass) {
        case 'high_support_conflict':
            return 'high';
        case 'mixed_support':
            return 'mixed';
        case 'low_support':
            return 'low';
        default:
            return 'missing';
    }
};

const sprMoveEventFilter: FilterFn<SprMoveEventRow> = (row, columnId, filterValue) => {
    const query = String(filterValue ?? '').trim().toLowerCase();
    if (!query) return true;

    const searchableText = String(row.getValue(columnId) ?? '').toLowerCase();
    const queryTerms = query.split(/\s+/).filter(Boolean);
    return queryTerms.every((term) => searchableText.includes(term));
};

export const SprMoveEventTable = ({ events, leafNamesByIndex, selectedMovedSubtreeIndices = [] }: SprMoveEventTableProps) => {
    const [globalFilter, setGlobalFilter] = React.useState('');
    const selectedMovedSubtreeSignature = getSignature(selectedMovedSubtreeIndices);
    const columns = React.useMemo<ColumnDef<SprMoveEventRow>[]>(
        () => [
            {
                id: 'sprSearch',
                accessorFn: (event) => buildSprMoveEventSearchText(event, leafNamesByIndex),
                enableGlobalFilter: true,
            },
        ],
        [leafNamesByIndex],
    );

    const table = useReactTable({
        data: events,
        columns,
        state: {
            globalFilter,
        },
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: sprMoveEventFilter,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    const filteredRows = table.getRowModel().rows;
    const hasSearch = globalFilter.trim().length > 0;

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="spr-analytics-no-drag flex items-center gap-2 border-b border-border/30 bg-card px-3 py-2">
                <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" aria-hidden />
                    <Input
                        value={globalFilter}
                        onChange={(event) => setGlobalFilter(event.target.value)}
                        placeholder={SPR_MOVE_EVENT_TABLE_COPY.searchPlaceholder}
                        aria-label={SPR_MOVE_EVENT_TABLE_COPY.searchLabel}
                        className="h-8 pl-7 pr-8 text-xs"
                    />
                    {hasSearch ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="absolute right-1 top-1/2 size-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setGlobalFilter('')}
                            aria-label={SPR_MOVE_EVENT_TABLE_COPY.clearSearchLabel}
                        >
                            <X className="size-3" />
                        </Button>
                    ) : null}
                </div>
                <div className="shrink-0 text-2xs font-medium tabular-nums text-muted-foreground">
                    {filteredRows.length} / {events.length} movements
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
                <table className={`${SPR_MOVE_EVENT_TABLE_COPY.minWidthClassName} w-full table-fixed text-xs`}>
                    <thead className="bg-muted/40 text-muted-foreground font-bold sticky top-0 z-10">
                        <tr>
                            <th className="w-20 px-3 py-2 text-left font-bold uppercase tracking-wider text-2xs">{SPR_MOVE_EVENT_TABLE_COPY.columns.movement}</th>
                            <th className="w-16 px-3 py-2 text-left font-bold uppercase tracking-wider text-2xs">{SPR_MOVE_EVENT_TABLE_COPY.columns.pair}</th>
                            <th className="w-28 px-3 py-2 text-left font-bold uppercase tracking-wider text-2xs">{SPR_MOVE_EVENT_TABLE_COPY.columns.movedSubtree}</th>
                            <th className="w-28 px-3 py-2 text-left font-bold uppercase tracking-wider text-2xs">{SPR_MOVE_EVENT_TABLE_COPY.columns.pivot}</th>
                            <th className="w-28 px-3 py-2 text-left font-bold uppercase tracking-wider text-2xs">{SPR_MOVE_EVENT_TABLE_COPY.columns.from}</th>
                            <th className="w-28 px-3 py-2 text-left font-bold uppercase tracking-wider text-2xs">{SPR_MOVE_EVENT_TABLE_COPY.columns.to}</th>
                            <th className="w-24 px-3 py-2 text-right font-bold uppercase tracking-wider text-2xs">{SPR_MOVE_EVENT_TABLE_COPY.columns.support}</th>
                            <th className="w-14 px-3 py-2 text-right font-bold uppercase tracking-wider text-2xs">{SPR_MOVE_EVENT_TABLE_COPY.columns.steps}</th>
                            <th className="w-40 px-3 py-2 text-right font-bold uppercase tracking-wider text-2xs">{SPR_MOVE_EVENT_TABLE_COPY.columns.metrics}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/10">
                        {filteredRows.map((row) => {
                            const event = row.original;
                            const isSelected = selectedMovedSubtreeSignature === event.signature;
                            const subtreeLabel = formatCompactAttachment(event.splitIndices, leafNamesByIndex, 4);
                            const fullSubtreeLabel = formatAttachment(event.splitIndices, leafNamesByIndex);
                            const contextSignature = getSignature(event.contextSplitIndices);
                            const hasSeparateContext = contextSignature !== null && contextSignature !== event.signature;
                            const contextLabel = hasSeparateContext
                                ? formatCompactAttachment(event.contextSplitIndices, leafNamesByIndex, 4)
                                : '';
                            const fullContextLabel = hasSeparateContext
                                ? formatAttachment(event.contextSplitIndices, leafNamesByIndex)
                                : '';

                            return (
                                <tr key={event.eventId} className="hover:bg-primary/5 transition-colors align-top">
                                    <td className="px-3 py-3 font-mono tabular-nums text-muted-foreground">
                                        <div>{event.eventId}</div>
                                    </td>
                                    <td className="px-3 py-3 font-semibold">
                                        <div>{event.pairLabel}</div>
                                        <div className="text-2xs font-normal text-muted-foreground/70">{event.pairId}</div>
                                    </td>
                                    <td className="px-3 py-3" title={fullSubtreeLabel}>
                                        <div className="truncate font-medium">{subtreeLabel}</div>
                                        <div className="text-2xs text-muted-foreground/70">
                                            {event.splitIndices.length} taxa
                                            {isSelected ? <Badge variant="outline" className="ml-2 h-4 px-1 text-[10px]">selected</Badge> : null}
                                        </div>
                                        {hasSeparateContext ? (
                                            <div className="text-2xs text-muted-foreground/70 truncate" title={fullContextLabel}>
                                                context: {contextLabel}
                                            </div>
                                        ) : null}
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
                                    <td className="px-3 py-3 text-right font-mono tabular-nums">
                                        <div>{formatSupportValue(event.sourceAttachmentSupport)} → {formatSupportValue(event.destinationAttachmentSupport)}</div>
                                        <div className="text-2xs font-sans text-muted-foreground/70">{formatSupportClass(event.supportClass)}</div>
                                    </td>
                                    <td className="px-3 py-3 text-right font-mono tabular-nums">{formatStepRange(event.stepRange)}</td>
                                    <td className="px-3 py-3 text-right font-mono tabular-nums">
                                        <div className="flex flex-col gap-0.5">
                                            <div>
                                                <span className="text-muted-foreground/70 font-sans">{SPR_MOVE_EVENT_TABLE_COPY.metrics.hops}</span> {event.totalPathHops}
                                                <span className="mx-1 text-muted-foreground/50">/</span>
                                                <span className="text-muted-foreground/70 font-sans">{SPR_MOVE_EVENT_TABLE_COPY.metrics.length}</span> {formatMetric(event.totalPathLength)}
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground/70 font-sans">{SPR_MOVE_EVENT_TABLE_COPY.metrics.rfDistance}</span> {formatMetric(event.rfDistance)}
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground/70 font-sans">{SPR_MOVE_EVENT_TABLE_COPY.metrics.weightedRf}</span> {formatMetric(event.weightedRfDistance)}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredRows.length === 0 && (
                            <tr>
                                <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground italic">
                                    {hasSearch
                                        ? SPR_MOVE_EVENT_TABLE_COPY.noSearchResults
                                        : SPR_MOVE_EVENT_TABLE_COPY.noMovements}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
