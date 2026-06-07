import { formatSubtreeLabel } from '../../../domain/spr/sprAnalytics';
import type { SprMovedSubtreeRecurrence, SprMoveEventRow } from './types';
import { formatInputTreePair } from './sprMoveJumpTarget';
import { buildSprMoveWindowRange, type SprMoveWindowRangeOptions } from './sprMoveWindowRange';

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

const formatOptionalInputTreeNumber = (value: unknown): string => {
  if (typeof value !== 'number' || !Number.isInteger(value)) return '';
  return String(value + 1);
};

const formatFrameRange = (frameRange: [number, number] | null | undefined): string =>
  Array.isArray(frameRange) && frameRange.length >= 2 ? `${frameRange[0]}-${frameRange[1]}` : '';

export const createSprMovedSubtreeRecurrenceCsv = (
  recurrences: SprMovedSubtreeRecurrence[],
  leafNamesByIndex: string[]
): string => {
  const headers = [
    'Rank',
    'Moved Subtree',
    'Taxa Count',
    'SPR Move Count',
    'Share of SPR Moves',
    'Tree Pair Count',
    'Example Source Tree',
    'Example Target Tree',
    'Example Source -> Target',
    'Example Frame Range',
    'Topology Variant Count',
    'Source Topology Variant Count',
    'Target Topology Variant Count',
    'Source Parent Branch Support Median',
    'Target Parent Branch Support Median',
    'Low Parent Branch Support Moves',
    'Missing Parent Branch Support Moves',
    'Source Moved Subtree Newick',
    'Target Moved Subtree Newick',
    'Split Indices',
    'Signature',
  ];

  const rows = recurrences.map((item, idx) => {
    const label = formatSubtreeLabel(item.splitIndices, leafNamesByIndex);
    return [
      idx + 1,
      label,
      item.splitIndices.length,
      item.count,
      formatFixed(item.percentage),
      item.pairCount ?? item.pairIds?.length ?? '',
      formatOptionalInputTreeNumber(item.representativeSourceInputTreeIndex),
      formatOptionalInputTreeNumber(item.representativeTargetInputTreeIndex),
      formatInputTreePair(
        item.representativeSourceInputTreeIndex,
        item.representativeTargetInputTreeIndex
      ),
      formatFrameRange(item.representativeFrameRange),
      item.topologyVariantCount ?? '',
      item.sourceTopologyVariantCount ?? '',
      item.destinationTopologyVariantCount ?? '',
      formatOptionalFixed(item.sourceParentBranchValueMedian),
      formatOptionalFixed(item.destinationParentBranchValueMedian),
      item.lowParentBranchValueCount ?? '',
      item.missingParentBranchValueCount ?? '',
      item.sourceMovedSubtreeNewick ?? '',
      item.destinationMovedSubtreeNewick ?? '',
      item.splitIndices.join(' '),
      item.signature,
    ];
  });

  return [headers, ...rows].map((row) => row.map(escapeCsvValue).join(',')).join('\n');
};

const formatIndexList = (indices: number[] | undefined): string =>
  Array.isArray(indices) ? indices.join(' ') : '';

const formatLabel = (indices: number[] | undefined, leafNamesByIndex: string[]): string =>
  Array.isArray(indices) && indices.length > 0 ? formatSubtreeLabel(indices, leafNamesByIndex) : '';

const formatStepRange = (stepRange: [number, number] | null | undefined): string =>
  Array.isArray(stepRange) && stepRange.length >= 2 ? `${stepRange[0]}-${stepRange[1]}` : '';

const formatLocalDateStamp = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const createSprMoveEventCsv = (
  events: SprMoveEventRow[],
  leafNamesByIndex: string[],
  windowRangeOptions: SprMoveWindowRangeOptions = {}
): string => {
  const headers = [
    'SPR Move ID',
    'Tree Pair',
    'Pair ID',
    'SPR Move Index',
    'Source Window',
    'Target Window',
    'Moved Subtree',
    'Taxa Count',
    'Source Moved Subtree Newick',
    'Target Moved Subtree Newick',
    'Pivot edge',
    'Source Attachment',
    'Target Attachment',
    'Source Attachment Support',
    'Target Attachment Support',
    'Source Moved Subtree Value',
    'Target Moved Subtree Value',
    'Source Parent Branch Value',
    'Target Parent Branch Value',
    'Branch Value Label',
    'Moved Subtree Value Class',
    'Parent Branch Value Class',
    'Step Range',
    'RF Distance',
    'Weighted RF Distance',
    'Split Indices',
  ];

  const rows = events.map((event) => {
    const windowRange = buildSprMoveWindowRange(event, windowRangeOptions);

    return [
      event.eventId,
      event.pairLabel,
      event.pairId,
      event.eventIndex,
      windowRange?.sourceLabel ?? '',
      windowRange?.targetLabel ?? '',
      formatLabel(event.splitIndices, leafNamesByIndex),
      event.splitIndices.length,
      event.sourceMovedSubtreeNewick ?? '',
      event.destinationMovedSubtreeNewick ?? '',
      formatLabel(event.pivotEdge, leafNamesByIndex),
      formatLabel(event.sourceAttachment, leafNamesByIndex),
      formatLabel(event.destinationAttachment, leafNamesByIndex),
      formatOptionalFixed(event.sourceAttachmentSupport?.primary),
      formatOptionalFixed(event.destinationAttachmentSupport?.primary),
      event.sourceMovedSubtreeBranchValue?.displayValue ?? '',
      event.destinationMovedSubtreeBranchValue?.displayValue ?? '',
      event.sourceParentBranchValue?.displayValue ?? '',
      event.destinationParentBranchValue?.displayValue ?? '',
      event.sourceMovedSubtreeBranchValue?.label ??
        event.destinationMovedSubtreeBranchValue?.label ??
        event.sourceParentBranchValue?.label ??
        event.destinationParentBranchValue?.label ??
        '',
      event.branchValueClass ?? '',
      event.contextBranchValueClass ?? '',
      formatStepRange(event.stepRange),
      formatOptionalFixed(event.rfDistance),
      formatOptionalFixed(event.weightedRfDistance),
      formatIndexList(event.splitIndices),
    ];
  });

  return [headers, ...rows].map((row) => row.map(escapeCsvValue).join(',')).join('\n');
};

export const createSprMovedSubtreeRecurrenceExportName = (
  fileName: string,
  date = new Date()
): string => {
  const dateStamp = formatLocalDateStamp(date);
  const baseName =
    (fileName || 'dataset')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') || 'dataset';

  return `${baseName}-recurrent-moved-subtrees-${dateStamp}.csv`;
};

export const createSprMoveEventExportName = (fileName: string, date = new Date()): string => {
  const dateStamp = formatLocalDateStamp(date);
  const baseName =
    (fileName || 'dataset')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') || 'dataset';

  return `${baseName}-spr-moves-${dateStamp}.csv`;
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
