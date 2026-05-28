import { calculateWindow } from '../../../domain/msa/msaWindowCalculator.js';
import type { SprMoveEventRow } from './types';

export interface SprMoveWindowRangeOptions {
  hasMsa?: boolean;
  msaStepSize?: number | null;
  msaWindowSize?: number | null;
  msaColumnCount?: number | null;
}

export interface SprMoveWindowRangeDisplay {
  treeLabel: string;
  displayLabel: string;
  title: string;
  searchText: string;
  sourceLabel: string;
  targetLabel: string;
}

interface ResolvedMsaWindow {
  startPosition: number;
  midPosition: number;
  endPosition: number;
}

const isPositiveFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

export const hasSprMoveWindowAxis = (options: SprMoveWindowRangeOptions = {}): boolean =>
  Boolean(options.hasMsa) &&
  isPositiveFiniteNumber(options.msaStepSize) &&
  isPositiveFiniteNumber(options.msaWindowSize) &&
  isPositiveFiniteNumber(options.msaColumnCount);

const resolveWindow = (
  inputTreeIndex: number | null | undefined,
  options: SprMoveWindowRangeOptions
): ResolvedMsaWindow | null => {
  if (
    !hasSprMoveWindowAxis(options) ||
    typeof inputTreeIndex !== 'number' ||
    !Number.isInteger(inputTreeIndex)
  ) {
    return null;
  }
  return calculateWindow(
    inputTreeIndex,
    options.msaStepSize as number,
    options.msaWindowSize as number,
    options.msaColumnCount as number
  ) as ResolvedMsaWindow;
};

const formatTreeLabel = (inputTreeIndex: number | null | undefined): string =>
  typeof inputTreeIndex === 'number' && Number.isInteger(inputTreeIndex)
    ? `Input ${inputTreeIndex + 1}`
    : 'Input -';

const formatSiteRange = (window: ResolvedMsaWindow | null): string =>
  window ? `${window.startPosition}-${window.endPosition}` : '-';

const formatCsvWindowLabel = (
  inputTreeIndex: number | null | undefined,
  window: ResolvedMsaWindow | null
): string => {
  if (!window) return '';
  return `${formatTreeLabel(inputTreeIndex)} sites ${window.startPosition}-${window.endPosition} (mid ${window.midPosition})`;
};

export function buildSprMoveWindowRange(
  event: SprMoveEventRow,
  options: SprMoveWindowRangeOptions = {}
): SprMoveWindowRangeDisplay | null {
  const sourceWindow = resolveWindow(event.sourceInputTreeIndex, options);
  const targetWindow = resolveWindow(event.targetInputTreeIndex, options);
  if (!sourceWindow && !targetWindow) return null;

  const sourceTreeLabel = formatTreeLabel(event.sourceInputTreeIndex);
  const targetTreeLabel = formatTreeLabel(event.targetInputTreeIndex);
  const sourceRange = formatSiteRange(sourceWindow);
  const targetRange = formatSiteRange(targetWindow);
  const sourceLabel = formatCsvWindowLabel(event.sourceInputTreeIndex, sourceWindow);
  const targetLabel = formatCsvWindowLabel(event.targetInputTreeIndex, targetWindow);
  const treeLabel = `${sourceTreeLabel} -> ${targetTreeLabel}`;
  const displayLabel = `Sites ${sourceRange} -> ${targetRange}`;
  const title = [
    sourceLabel ? `Source ${sourceLabel}` : '',
    targetLabel ? `Target ${targetLabel}` : '',
  ]
    .filter(Boolean)
    .join('; ');

  return {
    treeLabel,
    displayLabel,
    title,
    searchText: [treeLabel, displayLabel, sourceLabel, targetLabel].filter(Boolean).join(' '),
    sourceLabel,
    targetLabel,
  };
}
