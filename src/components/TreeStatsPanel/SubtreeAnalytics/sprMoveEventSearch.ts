import { formatSubtreeLabel } from '../../../domain/spr/sprAnalytics';
import type { SprMoveEventRow } from './types';

const formatIndices = (indices?: number[] | null): string => {
  if (!Array.isArray(indices) || indices.length === 0) return '';
  const sorted = [...indices].sort((a, b) => a - b);
  return [sorted.join(','), sorted.join(' ')].join(' ');
};

const formatSubtreeSearchLabel = (
  indices: number[] | undefined,
  leafNamesByIndex: string[]
): string => {
  if (!Array.isArray(indices) || indices.length === 0) return '';
  return [formatSubtreeLabel(indices, leafNamesByIndex), formatIndices(indices)].join(' ');
};

const formatCompactSubtreeSearchLabel = (
  indices: number[] | undefined,
  leafNamesByIndex: string[],
  maxNames = 3
): string => {
  if (!Array.isArray(indices) || indices.length === 0) return '';

  if (indices.length <= maxNames) {
    return formatSubtreeSearchLabel(indices, leafNamesByIndex);
  }

  const names = indices
    .slice(0, maxNames)
    .map((idx) => leafNamesByIndex[idx])
    .filter(Boolean);
  const prefix =
    names.length > 0 ? names.join(', ') : `Nodes ${indices.slice(0, maxNames).join(', ')}`;
  return [
    `${prefix} +${indices.length - maxNames} more`,
    formatSubtreeSearchLabel(indices, leafNamesByIndex),
  ].join(' ');
};

const formatMaybeNumber = (value: number | null | undefined): string =>
  Number.isFinite(Number(value)) ? String(value) : '';

export function buildSprMoveEventSearchText(
  event: SprMoveEventRow,
  leafNamesByIndex: string[]
): string {
  return [
    event.eventId,
    event.pairLabel,
    event.pairId,
    String(event.eventIndex),
    event.signature,
    formatSubtreeSearchLabel(event.splitIndices, leafNamesByIndex),
    formatSubtreeSearchLabel(event.driverSplitIndices, leafNamesByIndex),
    formatCompactSubtreeSearchLabel(event.contextSplitIndices, leafNamesByIndex, 4),
    formatCompactSubtreeSearchLabel(event.pivotEdge, leafNamesByIndex),
    formatCompactSubtreeSearchLabel(event.sourceAttachment, leafNamesByIndex),
    formatCompactSubtreeSearchLabel(event.destinationAttachment, leafNamesByIndex),
    event.branchValueClass ?? '',
    event.contextBranchValueClass ?? '',
    formatMaybeNumber(event.sourceAttachmentSupport?.primary),
    formatMaybeNumber(event.destinationAttachmentSupport?.primary),
    event.sourceMovedSubtreeBranchValue?.displayValue ?? '',
    event.destinationMovedSubtreeBranchValue?.displayValue ?? '',
    event.sourceMovedSubtreeBranchValue?.label ?? '',
    event.destinationMovedSubtreeBranchValue?.label ?? '',
    event.sourceAncestorBranchValue?.displayValue ?? '',
    event.destinationAncestorBranchValue?.displayValue ?? '',
    event.sourceAncestorBranchValue?.label ?? '',
    event.destinationAncestorBranchValue?.label ?? '',
    ...(event.highlightGroup ?? []).map((group) =>
      formatCompactSubtreeSearchLabel(group, leafNamesByIndex)
    ),
    Array.isArray(event.stepRange) ? event.stepRange.join('-') : '',
    formatMaybeNumber(event.totalPathHops),
    formatMaybeNumber(event.totalPathLength),
    formatMaybeNumber(event.rfDistance),
    formatMaybeNumber(event.weightedRfDistance),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
