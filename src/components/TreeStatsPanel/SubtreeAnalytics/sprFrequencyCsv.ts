import { formatSubtreeLabel } from '../../../domain/tree/sprAnalyticsUtils';
import type { SprMoverFrequency } from './types';

const escapeCsvValue = (value: unknown): string => {
    const str = value === null || value === undefined ? '' : String(value);
    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

export const createSprFrequencyCsv = (
    frequencies: SprMoverFrequency[],
    leafNamesByIndex: string[]
): string => {
    const headers = [
        'Rank',
        'Moved Group',
        'Taxa Count',
        'Move Count',
        '% of Moves',
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
            item.percentage.toFixed(6),
            item.splitIndices.join(' '),
            item.signature
        ];
    });

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
