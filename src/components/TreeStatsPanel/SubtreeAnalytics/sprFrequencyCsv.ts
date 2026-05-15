import { formatSubtreeLabel } from '../../../domain/spr/sprAnalytics';
import type { SprMoverFrequency, SprMoveEventRow } from './types';

const escapeCsvValue = (value: unknown): string => {
    const str = value === null || value === undefined ? '' : String(value);
    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

const formatFixed = (value: unknown): string => {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(6) : '0.000000';
};

const formatOptionalFixed = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(6) : '';
};

export const createSprFrequencyCsv = (
    frequencies: SprMoverFrequency[],
    leafNamesByIndex: string[]
): string => {
    const headers = [
        'Rank',
        'Moved Subtree',
        'Taxa Count',
        'Movement Count',
        '% of Movements',
        'Tree Pair Count',
        'Total Path Hops',
        'Avg Path Hops',
        'Total Path Length',
        'Avg Path Length',
        'Split Indices',
        'Signature'
    ];

    const rows = frequencies.map((item, idx) => {
        const label = formatSubtreeLabel(item.splitIndices, leafNamesByIndex);
        return [
            idx + 1,
            label,
            item.splitIndices.length,
            item.count,
            formatFixed(item.percentage),
            item.pairCount ?? item.pairKeys?.length ?? '',
            item.totalPathHops,
            formatFixed(item.averagePathHops),
            formatFixed(item.totalPathLength),
            formatFixed(item.averagePathLength),
            item.splitIndices.join(' '),
            item.signature
        ];
    });

    return [headers, ...rows]
        .map(row => row.map(escapeCsvValue).join(','))
        .join('\n');
};

const formatIndexList = (indices: number[] | undefined): string => (
    Array.isArray(indices) ? indices.join(' ') : ''
);

const formatLabel = (indices: number[] | undefined, leafNamesByIndex: string[]): string => (
    Array.isArray(indices) && indices.length > 0
        ? formatSubtreeLabel(indices, leafNamesByIndex)
        : ''
);

const formatStepRange = (stepRange: [number, number] | null | undefined): string => (
    Array.isArray(stepRange) && stepRange.length >= 2
        ? `${stepRange[0]}-${stepRange[1]}`
        : ''
);

export const createSprMoveEventCsv = (
    events: SprMoveEventRow[],
    leafNamesByIndex: string[]
): string => {
    const headers = [
        'Movement ID',
        'Tree Pair',
        'Pair Key',
        'Movement Index',
        'Moved Subtree',
        'Context Subtree',
        'Taxa Count',
        'Pivot Edge',
        'From Attachment',
        'To Attachment',
        'Step Range',
        'Path Hops',
        'Path Length',
        'RF Distance',
        'Weighted RF Distance',
        'Split Indices',
        'Context Split Indices'
    ];

    const rows = events.map((event) => [
        event.eventId,
        event.pairLabel,
        event.pairKey,
        event.eventIndex,
        formatLabel(event.splitIndices, leafNamesByIndex),
        formatLabel(event.contextSplitIndices, leafNamesByIndex),
        event.splitIndices.length,
        formatLabel(event.pivotEdge, leafNamesByIndex),
        formatLabel(event.sourceAttachment, leafNamesByIndex),
        formatLabel(event.destinationAttachment, leafNamesByIndex),
        formatStepRange(event.stepRange),
        event.totalPathHops,
        formatFixed(event.totalPathLength),
        formatOptionalFixed(event.rfDistance),
        formatOptionalFixed(event.weightedRfDistance),
        formatIndexList(event.splitIndices),
        formatIndexList(event.contextSplitIndices)
    ]);

    return [headers, ...rows]
        .map(row => row.map(escapeCsvValue).join(','))
        .join('\n');
};

export const createSprFrequencyExportName = (fileName: string, date = new Date()): string => {
    const dateStamp = date.toISOString().slice(0, 10);
    const baseName = (fileName || 'dataset')
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '') || 'dataset';

    return `${baseName}-${dateStamp}.csv`;
};

export const createSprMoveEventExportName = (fileName: string, date = new Date()): string => {
    const dateStamp = date.toISOString().slice(0, 10);
    const baseName = (fileName || 'dataset')
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '') || 'dataset';

    return `${baseName}-spr-movements-${dateStamp}.csv`;
};

export const downloadCsvFile = (content: string, downloadName: string): void => {
    if (!content) return;

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
