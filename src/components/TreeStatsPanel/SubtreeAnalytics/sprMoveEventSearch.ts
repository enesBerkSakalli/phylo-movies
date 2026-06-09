import { formatSubtreeLabel } from '../../../domain/spr/sprAnalytics';
import type { SprMoveEventRow } from './types';
import { buildSprMoveWindowRange, type SprMoveWindowRangeOptions } from './sprMoveWindowRange';

const formatIndices = (indices?: number[] | null): string => {
  if (!Array.isArray(indices) || indices.length === 0) return '';
  const sorted = [...indices].sort((a, b) => a - b);
  return [sorted.join(','), sorted.join(' ')].join(' ');
};

export const normalizeSprMoveSearchValue = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

export const tokenizeSprMoveSearchQuery = (value: string): string[] =>
  normalizeSprMoveSearchValue(value).split(/\s+/).filter(Boolean);

const compactTaxonSearchAlias = (value: string): string =>
  normalizeSprMoveSearchValue(value).replace(/\s+/g, '');

const formatTaxonSearchAliases = (indices: number[], leafNamesByIndex: string[]): string => {
  const aliases = new Set<string>();

  indices.forEach((idx) => {
    const name = leafNamesByIndex[idx];
    if (typeof name !== 'string' || name.length === 0) return;

    const normalized = normalizeSprMoveSearchValue(name);
    const compact = compactTaxonSearchAlias(name);
    if (normalized) aliases.add(normalized);
    if (compact && compact !== normalized) aliases.add(compact);
  });

  return Array.from(aliases).join(' ');
};

const formatSubtreeSearchLabel = (
  indices: number[] | undefined,
  leafNamesByIndex: string[]
): string => {
  if (!Array.isArray(indices) || indices.length === 0) return '';
  return [
    formatSubtreeLabel(indices, leafNamesByIndex),
    formatTaxonSearchAliases(indices, leafNamesByIndex),
    formatIndices(indices),
  ].join(' ');
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
  typeof value === 'number' && Number.isFinite(value) ? String(value) : '';

export function buildSprMoveEventSearchText(
  event: SprMoveEventRow,
  leafNamesByIndex: string[],
  windowRangeOptions: SprMoveWindowRangeOptions = {}
): string {
  const windowRange = buildSprMoveWindowRange(event, windowRangeOptions);

  return [
    event.eventId,
    event.pairLabel,
    event.pairId,
    String(event.eventIndex),
    event.signature,
    formatSubtreeSearchLabel(event.splitIndices, leafNamesByIndex),
    formatSubtreeSearchLabel(event.driverSplitIndices, leafNamesByIndex),
    formatCompactSubtreeSearchLabel(event.pivotEdge, leafNamesByIndex),
    formatCompactSubtreeSearchLabel(event.sourceAttachment, leafNamesByIndex),
    formatCompactSubtreeSearchLabel(event.destinationAttachment, leafNamesByIndex),
    event.branchValueClass ?? '',
    event.contextBranchValueClass ?? '',
    windowRange?.searchText ?? '',
    formatMaybeNumber(event.sourceAttachmentSupport?.primary),
    formatMaybeNumber(event.destinationAttachmentSupport?.primary),
    event.sourceMovedSubtreeBranchValue?.displayValue ?? '',
    event.destinationMovedSubtreeBranchValue?.displayValue ?? '',
    event.sourceMovedSubtreeBranchValue?.label ?? '',
    event.destinationMovedSubtreeBranchValue?.label ?? '',
    event.sourceParentBranchValue?.displayValue ?? '',
    event.destinationParentBranchValue?.displayValue ?? '',
    event.sourceParentBranchValue?.label ?? '',
    event.destinationParentBranchValue?.label ?? '',
    ...(event.highlightGroup ?? []).map((group) =>
      formatCompactSubtreeSearchLabel(group, leafNamesByIndex)
    ),
    Array.isArray(event.stepRange) ? event.stepRange.join('-') : '',
    formatMaybeNumber(event.rfDistance),
    formatMaybeNumber(event.weightedRfDistance),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
