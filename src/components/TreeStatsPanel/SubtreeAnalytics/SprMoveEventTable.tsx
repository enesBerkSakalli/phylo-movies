import React from 'react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { formatSubtreeLabel } from '../../../domain/spr/sprAnalytics';
import { LocateFixed, Search, X } from 'lucide-react';
import type { SprMoveEventRow } from './types';
import { buildSprMoveEventSearchText } from './sprMoveEventSearch';
import { SPR_MOVE_EVENT_TABLE_COPY } from './SprMoveEventTable.contract';
import { buildSprMoveWindowRange, type SprMoveWindowRangeOptions } from './sprMoveWindowRange';
import { cn } from '../../../lib/utils';
import { SubtreeTopologyPopover } from './SubtreeTopologyPopover';
import {
  selectGoToPosition,
  selectSetManuallyMarkedNodes,
  useAppStore,
} from '../../../state/phyloStore/store.js';
import { formatInputTreePair, getSprMoveJumpFrame } from './sprMoveJumpTarget';
import { BranchValueSelector, type BranchValueOption } from './BranchValueSelector';

interface SprMoveEventTableProps {
  events: SprMoveEventRow[];
  leafNamesByIndex: string[];
  selectedMovedSubtreeIndices?: number[];
  branchValueThreshold: number;
  onBranchValueThresholdChange: (threshold: number) => void;
  windowRangeOptions?: SprMoveWindowRangeOptions;
  branchValueOptions?: BranchValueOption[];
  selectedBranchValueKey?: string;
  selectedBranchValueOption?: BranchValueOption;
  onSelectedBranchValueChange?: (valueKey: string) => void;
}

const TABLE_HEADER_CELL_CLASS = 'px-3 py-2 font-bold uppercase tracking-wider text-2xs';
const ROW_CELL_CLASS = 'px-3 py-2';
const MOVEMENT_EVENT_COLUMN_COUNT = 8;
const VIRTUAL_ROW_HEIGHT = 112;
const VIRTUAL_ROW_OVERSCAN = 8;
const EMPTY_WINDOW_RANGE_OPTIONS = Object.freeze({});
const BRANCH_VALUE_FILTER_ALL = 'all';
const BRANCH_VALUE_THRESHOLD_MIN = 0;
const BRANCH_VALUE_THRESHOLD_MAX = 100;
const DEFAULT_BRANCH_VALUE_THRESHOLD = 70;
const BRANCH_VALUE_FILTER_VALUES = [
  BRANCH_VALUE_FILTER_ALL,
  'both_high_value',
  'mixed_value',
  'low_value',
  'value_missing',
] as const;
type BranchValueFilterValue = (typeof BRANCH_VALUE_FILTER_VALUES)[number];

const isBranchValueFilterValue = (value: string): value is BranchValueFilterValue =>
  BRANCH_VALUE_FILTER_VALUES.includes(value as BranchValueFilterValue);

const formatMetric = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-';
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
  maxNames = 3
): string => {
  if (!Array.isArray(attachment) || attachment.length === 0) return '-';

  const fullLabel = formatSubtreeLabel(attachment, leafNamesByIndex);
  if (attachment.length <= maxNames) return fullLabel;

  const names = attachment
    .slice(0, maxNames)
    .map((idx) => leafNamesByIndex[idx])
    .filter(Boolean);
  const prefix =
    names.length > 0 ? names.join(', ') : `Nodes ${attachment.slice(0, maxNames).join(', ')}`;
  return `${prefix} +${attachment.length - maxNames} more`;
};

const getSignature = (indices?: number[]): string | null => {
  if (!Array.isArray(indices) || indices.length === 0) return null;
  return [...indices].sort((a, b) => a - b).join(',');
};

const formatStepRange = (stepRange: [number, number] | null): string =>
  Array.isArray(stepRange) ? `${stepRange[0]}-${stepRange[1]}` : '-';

const formatMovementLabel = (eventOrdinal: number): string => `#${eventOrdinal + 1}`;

const clampBranchValueThreshold = (threshold: number): number => {
  if (!Number.isFinite(threshold)) return DEFAULT_BRANCH_VALUE_THRESHOLD;
  return Math.min(BRANCH_VALUE_THRESHOLD_MAX, Math.max(BRANCH_VALUE_THRESHOLD_MIN, threshold));
};

const formatBranchValueThreshold = (threshold: number): string => {
  const clampedThreshold = clampBranchValueThreshold(threshold);
  return Number.isInteger(clampedThreshold)
    ? String(clampedThreshold)
    : clampedThreshold.toFixed(1).replace(/\.0$/, '');
};

const resolveThresholdCopy = (
  template: string,
  branchValueThreshold: number,
  targetLabel: string
): string =>
  template
    .replace('{threshold}', formatBranchValueThreshold(branchValueThreshold))
    .replace('{target}', targetLabel);

const getBranchValueFilterOptions = (
  branchValueThreshold: number,
  targetLabel: string,
  allLabel: string
) =>
  [
    { value: BRANCH_VALUE_FILTER_ALL, label: allLabel },
    {
      value: 'both_high_value',
      label: resolveThresholdCopy(
        SPR_MOVE_EVENT_TABLE_COPY.branchValueFilters.bothHigh,
        branchValueThreshold,
        targetLabel
      ),
    },
    {
      value: 'mixed_value',
      label: resolveThresholdCopy(
        SPR_MOVE_EVENT_TABLE_COPY.branchValueFilters.mixed,
        branchValueThreshold,
        targetLabel
      ),
    },
    {
      value: 'low_value',
      label: resolveThresholdCopy(
        SPR_MOVE_EVENT_TABLE_COPY.branchValueFilters.low,
        branchValueThreshold,
        targetLabel
      ),
    },
    {
      value: 'value_missing',
      label: resolveThresholdCopy(
        SPR_MOVE_EVENT_TABLE_COPY.branchValueFilters.missing,
        branchValueThreshold,
        targetLabel
      ),
    },
  ] as const;

const formatBranchValueClass = (
  branchValueClass: string | undefined,
  branchValueThreshold: number
): string => {
  switch (branchValueClass) {
    case 'both_high_value':
      return resolveThresholdCopy(
        SPR_MOVE_EVENT_TABLE_COPY.branchValueClasses.bothHigh,
        branchValueThreshold,
        'subtree value'
      );
    case 'mixed_value':
      return resolveThresholdCopy(
        SPR_MOVE_EVENT_TABLE_COPY.branchValueClasses.mixed,
        branchValueThreshold,
        'subtree value'
      );
    case 'low_value':
      return resolveThresholdCopy(
        SPR_MOVE_EVENT_TABLE_COPY.branchValueClasses.low,
        branchValueThreshold,
        'subtree value'
      );
    default:
      return SPR_MOVE_EVENT_TABLE_COPY.branchValueClasses.missing;
  }
};

const formatBranchValue = (
  branchValue:
    | SprMoveEventRow['sourceMovedSubtreeBranchValue']
    | SprMoveEventRow['sourceParentBranchValue']
): string => {
  const value = branchValue?.displayValue;
  return typeof value === 'string' && value.length > 0 ? value : '-';
};

const formatSupport = (support: SprMoveEventRow['sourceAttachmentSupport']): string => {
  const value = Number(support?.primary);
  if (!Number.isFinite(value)) return '-';
  const displayValue = support?.displayValue;
  if (typeof displayValue === 'string' && displayValue.length > 0) return displayValue;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

const resolveSelectedBranchValueLabel = (option?: BranchValueOption): string => {
  if (!option) return 'Auto primary support: no support field detected';
  return option.label;
};

const resolveRowBranchValueLabel = (
  selectedLabel: string,
  ...values: Array<
    | SprMoveEventRow['sourceMovedSubtreeBranchValue']
    | SprMoveEventRow['sourceParentBranchValue']
    | null
    | undefined
  >
): string => values.find((value) => value?.label)?.label ?? selectedLabel;

const formatBranchValueTitlePart = (
  label: string,
  value:
    | SprMoveEventRow['sourceMovedSubtreeBranchValue']
    | SprMoveEventRow['sourceParentBranchValue']
): string => {
  const formattedValue = formatBranchValue(value);
  return value?.label
    ? `${label} ${formattedValue} (${value.label})`
    : `${label} ${formattedValue}`;
};

const formatBranchValueTitle = (
  sourceMovedSubtreeValue: SprMoveEventRow['sourceMovedSubtreeBranchValue'],
  destinationMovedSubtreeValue: SprMoveEventRow['destinationMovedSubtreeBranchValue'],
  sourceAttachmentSupport: SprMoveEventRow['sourceAttachmentSupport'],
  destinationAttachmentSupport: SprMoveEventRow['destinationAttachmentSupport'],
  sourceParentValue: SprMoveEventRow['sourceParentBranchValue'],
  destinationParentValue: SprMoveEventRow['destinationParentBranchValue']
): string => {
  return [
    `Moved split selected value: ${formatBranchValueTitlePart('Source', sourceMovedSubtreeValue)} -> ${formatBranchValueTitlePart('Target', destinationMovedSubtreeValue)}`,
    `Attachment support: Source ${formatSupport(sourceAttachmentSupport)} -> Target ${formatSupport(destinationAttachmentSupport)}`,
    `Nearest parent selected value: ${formatBranchValueTitlePart('Source', sourceParentValue)} -> ${formatBranchValueTitlePart('Target', destinationParentValue)}`,
  ].join('; ');
};

const getVirtualRange = (rowCount: number, scrollTop: number, viewportHeight: number) => {
  if (rowCount === 0) {
    return {
      startIndex: 0,
      endIndex: 0,
      topPadding: 0,
      bottomPadding: 0,
    };
  }

  const visibleRowCount = Math.ceil(viewportHeight / VIRTUAL_ROW_HEIGHT);
  const startIndex = Math.max(0, Math.floor(scrollTop / VIRTUAL_ROW_HEIGHT) - VIRTUAL_ROW_OVERSCAN);
  const endIndex = Math.min(rowCount, startIndex + visibleRowCount + VIRTUAL_ROW_OVERSCAN * 2);

  return {
    startIndex,
    endIndex,
    topPadding: startIndex * VIRTUAL_ROW_HEIGHT,
    bottomPadding: Math.max(0, (rowCount - endIndex) * VIRTUAL_ROW_HEIGHT),
  };
};

export const SprMoveEventTable = ({
  events,
  leafNamesByIndex,
  selectedMovedSubtreeIndices = [],
  branchValueThreshold,
  onBranchValueThresholdChange,
  windowRangeOptions = EMPTY_WINDOW_RANGE_OPTIONS,
  branchValueOptions = [],
  selectedBranchValueKey = 'none',
  selectedBranchValueOption,
  onSelectedBranchValueChange,
}: SprMoveEventTableProps) => {
  const [globalFilter, setGlobalFilter] = React.useState('');
  const goToPosition = useAppStore(selectGoToPosition);
  const setManuallyMarkedNodes = useAppStore(selectSetManuallyMarkedNodes);
  const [subtreeBranchValueFilter, setSubtreeBranchValueFilter] =
    React.useState<BranchValueFilterValue>(BRANCH_VALUE_FILTER_ALL);
  const [contextBranchValueFilter, setContextBranchValueFilter] =
    React.useState<BranchValueFilterValue>(BRANCH_VALUE_FILTER_ALL);
  const normalizedBranchValueThreshold = clampBranchValueThreshold(branchValueThreshold);
  const [branchValueThresholdInput, setBranchValueThresholdInput] = React.useState(() =>
    formatBranchValueThreshold(normalizedBranchValueThreshold)
  );
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [scrollMetrics, setScrollMetrics] = React.useState({ scrollTop: 0, viewportHeight: 0 });
  const selectedMovedSubtreeSignature = getSignature(selectedMovedSubtreeIndices);
  const selectedBranchValueLabel = resolveSelectedBranchValueLabel(selectedBranchValueOption);
  const queryTerms = React.useMemo(
    () => globalFilter.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [globalFilter]
  );
  const searchableEvents = React.useMemo(
    () =>
      events.map((event, eventOrdinal) => ({
        event,
        eventOrdinal,
        searchText: `${buildSprMoveEventSearchText(event, leafNamesByIndex, windowRangeOptions)} ${eventOrdinal + 1} #${eventOrdinal + 1}`,
      })),
    [events, leafNamesByIndex, windowRangeOptions]
  );
  const filteredEventRows = React.useMemo(() => {
    let rows = searchableEvents;
    if (subtreeBranchValueFilter !== BRANCH_VALUE_FILTER_ALL) {
      rows = rows.filter(({ event }) => event.branchValueClass === subtreeBranchValueFilter);
    }
    if (contextBranchValueFilter !== BRANCH_VALUE_FILTER_ALL) {
      rows = rows.filter(({ event }) => event.contextBranchValueClass === contextBranchValueFilter);
    }
    if (queryTerms.length === 0) return rows;
    return rows.filter(({ searchText }) => queryTerms.every((term) => searchText.includes(term)));
  }, [contextBranchValueFilter, queryTerms, searchableEvents, subtreeBranchValueFilter]);
  const subtreeBranchValueFilterOptions = React.useMemo(
    () =>
      getBranchValueFilterOptions(
        normalizedBranchValueThreshold,
        'Moved split selected value',
        SPR_MOVE_EVENT_TABLE_COPY.branchValueFilters.allSubtree
      ),
    [normalizedBranchValueThreshold]
  );
  const contextBranchValueFilterOptions = React.useMemo(
    () =>
      getBranchValueFilterOptions(
        normalizedBranchValueThreshold,
        'Nearest parent selected value',
        SPR_MOVE_EVENT_TABLE_COPY.branchValueFilters.allContext
      ),
    [normalizedBranchValueThreshold]
  );
  const hasSearch = globalFilter.trim().length > 0;
  const hasBranchValueFilter =
    subtreeBranchValueFilter !== BRANCH_VALUE_FILTER_ALL ||
    contextBranchValueFilter !== BRANCH_VALUE_FILTER_ALL;
  const movementCountLabel = `${filteredEventRows.length} / ${events.length} SPR moves`;
  const handleBranchValueThresholdInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;
      setBranchValueThresholdInput(nextValue);
      if (nextValue.trim() === '') return;

      const nextThreshold = Number(nextValue);
      if (!Number.isFinite(nextThreshold)) return;
      onBranchValueThresholdChange(clampBranchValueThreshold(nextThreshold));
    },
    [onBranchValueThresholdChange]
  );
  const handleJumpToMove = React.useCallback(
    (event: SprMoveEventRow) => {
      setManuallyMarkedNodes(event.splitIndices);
      const jumpFrame = getSprMoveJumpFrame(event);
      if (jumpFrame !== null) {
        goToPosition(jumpFrame, 'jump');
      }
    },
    [goToPosition, setManuallyMarkedNodes]
  );
  const updateScrollMetrics = React.useCallback(() => {
    const element = scrollContainerRef.current;
    if (!element) return;

    const nextMetrics = {
      scrollTop: element.scrollTop,
      viewportHeight: element.clientHeight,
    };

    setScrollMetrics((current) =>
      current.scrollTop === nextMetrics.scrollTop &&
      current.viewportHeight === nextMetrics.viewportHeight
        ? current
        : nextMetrics
    );
  }, []);
  const virtualRange = React.useMemo(
    () =>
      getVirtualRange(
        filteredEventRows.length,
        scrollMetrics.scrollTop,
        scrollMetrics.viewportHeight
      ),
    [filteredEventRows.length, scrollMetrics.scrollTop, scrollMetrics.viewportHeight]
  );
  const visibleEventRows = React.useMemo(
    () => filteredEventRows.slice(virtualRange.startIndex, virtualRange.endIndex),
    [filteredEventRows, virtualRange.startIndex, virtualRange.endIndex]
  );

  React.useLayoutEffect(() => {
    updateScrollMetrics();
  }, [filteredEventRows.length, updateScrollMetrics]);

  React.useEffect(() => {
    setBranchValueThresholdInput(formatBranchValueThreshold(normalizedBranchValueThreshold));
  }, [normalizedBranchValueThreshold]);

  React.useEffect(() => {
    const element = scrollContainerRef.current;
    if (!element) return;

    element.scrollTop = 0;
    updateScrollMetrics();
  }, [
    contextBranchValueFilter,
    globalFilter,
    normalizedBranchValueThreshold,
    subtreeBranchValueFilter,
    updateScrollMetrics,
  ]);

  React.useEffect(() => {
    updateScrollMetrics();
    window.addEventListener('resize', updateScrollMetrics);
    return () => window.removeEventListener('resize', updateScrollMetrics);
  }, [updateScrollMetrics]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="spr-analytics-no-drag flex flex-col gap-2 border-b border-border/30 bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70"
              aria-hidden
            />
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
                title={SPR_MOVE_EVENT_TABLE_COPY.clearSearchLabel}
              >
                <X aria-hidden />
              </Button>
            ) : null}
          </div>
          <div
            className="shrink-0 text-2xs font-medium tabular-nums text-muted-foreground"
            aria-live="polite"
          >
            {movementCountLabel}
          </div>
        </div>
        <div
          className="rounded border border-border/50 bg-muted/30 px-2 py-1.5"
          title={`${SPR_MOVE_EVENT_TABLE_COPY.selectedValueLabel}: ${selectedBranchValueLabel}. ${SPR_MOVE_EVENT_TABLE_COPY.selectedValueChangePath}.`}
        >
          <BranchValueSelector
            id="spr-analytics-branch-value"
            branchValueOptions={branchValueOptions}
            selectedBranchValueKey={selectedBranchValueKey}
            selectedBranchValueLabel={selectedBranchValueLabel}
            onSelectedBranchValueChange={onSelectedBranchValueChange}
            titleDetail={SPR_MOVE_EVENT_TABLE_COPY.selectedValueChangePath}
            trailingText={`Using: ${selectedBranchValueLabel}`}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex shrink-0 items-center gap-1.5">
            <Label
              htmlFor="spr-branch-value-threshold"
              className="text-2xs font-medium text-muted-foreground"
            >
              {SPR_MOVE_EVENT_TABLE_COPY.branchValueThresholdLabel}
            </Label>
            <Input
              id="spr-branch-value-threshold"
              type="number"
              inputMode="decimal"
              min={BRANCH_VALUE_THRESHOLD_MIN}
              max={BRANCH_VALUE_THRESHOLD_MAX}
              step={1}
              value={branchValueThresholdInput}
              onChange={handleBranchValueThresholdInputChange}
              onBlur={() =>
                setBranchValueThresholdInput(
                  formatBranchValueThreshold(normalizedBranchValueThreshold)
                )
              }
              aria-label={SPR_MOVE_EVENT_TABLE_COPY.branchValueThresholdInputLabel}
              className="h-8 w-16 px-2 text-right text-xs tabular-nums"
            />
          </div>
          <Select
            value={subtreeBranchValueFilter}
            onValueChange={(value) => {
              if (isBranchValueFilterValue(value)) setSubtreeBranchValueFilter(value);
            }}
          >
            <SelectTrigger
              size="sm"
              aria-label={SPR_MOVE_EVENT_TABLE_COPY.subtreeValueFilterLabel}
              className="h-8 min-w-0 flex-1 text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[1300]">
              <SelectGroup>
                {subtreeBranchValueFilterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={contextBranchValueFilter}
            onValueChange={(value) => {
              if (isBranchValueFilterValue(value)) setContextBranchValueFilter(value);
            }}
          >
            <SelectTrigger
              size="sm"
              aria-label={SPR_MOVE_EVENT_TABLE_COPY.contextValueFilterLabel}
              className="h-8 min-w-0 flex-1 text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[1300]">
              <SelectGroup>
                {contextBranchValueFilterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-auto"
        onScroll={updateScrollMetrics}
      >
        <table
          className={`${SPR_MOVE_EVENT_TABLE_COPY.minWidthClassName} w-full table-fixed text-xs`}
          aria-label="SPR moves"
          aria-rowcount={filteredEventRows.length}
        >
          <thead className="sticky top-0 z-20 border-b border-border bg-card text-muted-foreground font-bold shadow-sm">
            <tr>
              <th scope="col" className={cn(TABLE_HEADER_CELL_CLASS, 'w-28 text-left')}>
                {SPR_MOVE_EVENT_TABLE_COPY.columns.movement}
              </th>
              <th scope="col" className={cn(TABLE_HEADER_CELL_CLASS, 'w-36 text-left')}>
                {SPR_MOVE_EVENT_TABLE_COPY.columns.movedSubtree}
              </th>
              <th scope="col" className={cn(TABLE_HEADER_CELL_CLASS, 'w-28 text-left')}>
                {SPR_MOVE_EVENT_TABLE_COPY.columns.pivot}
              </th>
              <th scope="col" className={cn(TABLE_HEADER_CELL_CLASS, 'w-28 text-left')}>
                {SPR_MOVE_EVENT_TABLE_COPY.columns.sourceAttachment}
              </th>
              <th scope="col" className={cn(TABLE_HEADER_CELL_CLASS, 'w-28 text-left')}>
                {SPR_MOVE_EVENT_TABLE_COPY.columns.targetAttachment}
              </th>
              <th scope="col" className={cn(TABLE_HEADER_CELL_CLASS, 'w-44 text-right')}>
                <span
                  title={`Selected value: ${selectedBranchValueLabel}`}
                  className="inline-flex max-w-full flex-col items-end normal-case tracking-normal"
                >
                  <span className="font-bold uppercase tracking-wider">
                    {SPR_MOVE_EVENT_TABLE_COPY.columns.branchValue}
                  </span>
                  <span className="max-w-full truncate font-normal text-muted-foreground/80">
                    {selectedBranchValueLabel}
                  </span>
                </span>
              </th>
              <th scope="col" className={cn(TABLE_HEADER_CELL_CLASS, 'w-14 text-right')}>
                {SPR_MOVE_EVENT_TABLE_COPY.columns.steps}
              </th>
              <th scope="col" className={cn(TABLE_HEADER_CELL_CLASS, 'w-40 text-right')}>
                {SPR_MOVE_EVENT_TABLE_COPY.columns.metrics}
              </th>
            </tr>
          </thead>
          <tbody>
            {virtualRange.topPadding > 0 ? (
              <tr aria-hidden="true">
                <td
                  colSpan={MOVEMENT_EVENT_COLUMN_COUNT}
                  className="p-0"
                  style={{ height: virtualRange.topPadding }}
                />
              </tr>
            ) : null}
            {visibleEventRows.map(({ event, eventOrdinal }, visibleIndex) => (
              <MovementEventRow
                key={event.eventId}
                event={event}
                eventOrdinal={eventOrdinal}
                rowIndex={virtualRange.startIndex + visibleIndex}
                leafNamesByIndex={leafNamesByIndex}
                isSelected={selectedMovedSubtreeSignature === event.signature}
                branchValueThreshold={normalizedBranchValueThreshold}
                windowRangeOptions={windowRangeOptions}
                selectedBranchValueLabel={selectedBranchValueLabel}
                onJumpToMove={handleJumpToMove}
              />
            ))}
            {virtualRange.bottomPadding > 0 ? (
              <tr aria-hidden="true">
                <td
                  colSpan={MOVEMENT_EVENT_COLUMN_COUNT}
                  className="p-0"
                  style={{ height: virtualRange.bottomPadding }}
                />
              </tr>
            ) : null}
            {filteredEventRows.length === 0 && (
              <tr>
                <td
                  colSpan={MOVEMENT_EVENT_COLUMN_COUNT}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  <MovementTableEmptyState hasFilter={hasSearch || hasBranchValueFilter} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface MovementEventRowProps {
  event: SprMoveEventRow;
  eventOrdinal: number;
  rowIndex: number;
  leafNamesByIndex: string[];
  isSelected: boolean;
  branchValueThreshold: number;
  windowRangeOptions: SprMoveWindowRangeOptions;
  selectedBranchValueLabel: string;
  onJumpToMove: (event: SprMoveEventRow) => void;
}

function MovementEventRow({
  event,
  eventOrdinal,
  rowIndex,
  leafNamesByIndex,
  isSelected,
  branchValueThreshold,
  windowRangeOptions,
  selectedBranchValueLabel,
  onJumpToMove,
}: MovementEventRowProps) {
  const movementLabel = formatMovementLabel(eventOrdinal);
  const windowRange = buildSprMoveWindowRange(event, windowRangeOptions);
  const subtreeLabel = formatCompactAttachment(event.splitIndices, leafNamesByIndex, 2);
  const fullSubtreeLabel = formatAttachment(event.splitIndices, leafNamesByIndex);
  const jumpFrame = getSprMoveJumpFrame(event);
  const treePairLabel = formatInputTreePair(event.sourceInputTreeIndex, event.targetInputTreeIndex);
  const jumpLabel = `Jump to ${movementLabel} in ${treePairLabel}`;
  const movedSplitValueLabel = resolveRowBranchValueLabel(
    selectedBranchValueLabel,
    event.sourceMovedSubtreeBranchValue,
    event.destinationMovedSubtreeBranchValue
  );
  const parentBranchValueLabel = resolveRowBranchValueLabel(
    selectedBranchValueLabel,
    event.sourceParentBranchValue,
    event.destinationParentBranchValue
  );

  return (
    <tr
      aria-rowindex={rowIndex + 1}
      className={cn(
        'h-28 border-b border-border/10 align-top transition-colors',
        isSelected ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-primary/5'
      )}
    >
      <td
        className={cn(ROW_CELL_CLASS, 'font-mono tabular-nums text-muted-foreground')}
        title={[event.eventId, windowRange?.title].filter(Boolean).join('\n')}
      >
        <div className="font-semibold text-foreground">{movementLabel}</div>
        <div className="mt-1 font-sans text-2xs font-semibold leading-tight text-foreground">
          {treePairLabel}
        </div>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="spr-analytics-no-drag mt-1.5 h-6 px-1.5 text-2xs"
          disabled={jumpFrame === null}
          onClick={(clickEvent) => {
            clickEvent.stopPropagation();
            onJumpToMove(event);
          }}
          onKeyDown={(keyEvent) => keyEvent.stopPropagation()}
          aria-label={jumpLabel}
          title={jumpLabel}
        >
          <LocateFixed className="size-3" aria-hidden />
          Jump to move
        </Button>
        {windowRange ? (
          <div className="mt-1 space-y-0.5 font-sans text-2xs leading-tight text-muted-foreground/70">
            <div className="truncate">{windowRange.displayLabel}</div>
          </div>
        ) : null}
      </td>
      <td className={ROW_CELL_CLASS} title={fullSubtreeLabel}>
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-medium">{subtreeLabel}</div>
            <div className="text-2xs text-muted-foreground/70">
              {event.splitIndices.length} taxa
              {isSelected ? (
                <Badge variant="outline" className="ml-2 h-4 px-1 text-[10px]">
                  selected
                </Badge>
              ) : null}
            </div>
          </div>
          <SubtreeTopologyPopover
            sourceTopology={event.sourceMovedSubtreeTopology}
            destinationTopology={event.destinationMovedSubtreeTopology}
            sourceNewick={event.sourceMovedSubtreeNewick}
            destinationNewick={event.destinationMovedSubtreeNewick}
            variantCount={1}
            taxaCount={event.splitIndices.length}
            leafNamesByIndex={leafNamesByIndex}
            compact
          />
        </div>
      </td>
      <td className={ROW_CELL_CLASS} title={formatAttachment(event.pivotEdge, leafNamesByIndex)}>
        <div className="truncate">{formatCompactAttachment(event.pivotEdge, leafNamesByIndex)}</div>
      </td>
      <td
        className={ROW_CELL_CLASS}
        title={formatAttachment(event.sourceAttachment, leafNamesByIndex)}
      >
        <div className="truncate">
          {formatCompactAttachment(event.sourceAttachment, leafNamesByIndex)}
        </div>
      </td>
      <td
        className={ROW_CELL_CLASS}
        title={formatAttachment(event.destinationAttachment, leafNamesByIndex)}
      >
        <div className="truncate">
          {formatCompactAttachment(event.destinationAttachment, leafNamesByIndex)}
        </div>
      </td>
      <td
        className={cn(ROW_CELL_CLASS, 'text-right font-mono tabular-nums')}
        title={formatBranchValueTitle(
          event.sourceMovedSubtreeBranchValue,
          event.destinationMovedSubtreeBranchValue,
          event.sourceAttachmentSupport,
          event.destinationAttachmentSupport,
          event.sourceParentBranchValue,
          event.destinationParentBranchValue
        )}
      >
        <div className="flex items-baseline justify-between gap-2 whitespace-nowrap">
          <span
            className="min-w-0 truncate text-left font-sans text-muted-foreground/70"
            title={movedSplitValueLabel}
          >
            {SPR_MOVE_EVENT_TABLE_COPY.branchValueRows.movedSubtree}
          </span>{' '}
          <span>
            {formatBranchValue(event.sourceMovedSubtreeBranchValue)} →{' '}
            {formatBranchValue(event.destinationMovedSubtreeBranchValue)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2 whitespace-nowrap">
          <span className="min-w-0 truncate text-left font-sans text-muted-foreground/70">
            {SPR_MOVE_EVENT_TABLE_COPY.branchValueRows.attachmentSupport}
          </span>{' '}
          <span>
            {formatSupport(event.sourceAttachmentSupport)} →{' '}
            {formatSupport(event.destinationAttachmentSupport)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2 whitespace-nowrap">
          <span
            className="min-w-0 truncate text-left font-sans text-muted-foreground/70"
            title={parentBranchValueLabel}
          >
            {SPR_MOVE_EVENT_TABLE_COPY.branchValueRows.parentBranch}
          </span>{' '}
          <span>
            {formatBranchValue(event.sourceParentBranchValue)} →{' '}
            {formatBranchValue(event.destinationParentBranchValue)}
          </span>
        </div>
        <div className="text-2xs font-sans text-muted-foreground/70">
          {formatBranchValueClass(event.branchValueClass, branchValueThreshold)}
        </div>
      </td>
      <td className={cn(ROW_CELL_CLASS, 'text-right font-mono tabular-nums')}>
        {formatStepRange(event.stepRange)}
      </td>
      <td className={cn(ROW_CELL_CLASS, 'text-right font-mono tabular-nums')}>
        <div className="flex flex-col items-end gap-0.5">
          <div className="whitespace-nowrap text-2xs">
            <abbr
              title={SPR_MOVE_EVENT_TABLE_COPY.metrics.rfDistance}
              className="font-sans no-underline text-muted-foreground/70"
            >
              RF
            </abbr>{' '}
            {formatMetric(event.rfDistance)}
            <span className="mx-1 text-muted-foreground/50">/</span>
            <abbr
              title={SPR_MOVE_EVENT_TABLE_COPY.metrics.weightedRf}
              className="font-sans no-underline text-muted-foreground/70"
            >
              WRF
            </abbr>{' '}
            {formatMetric(event.weightedRfDistance)}
          </div>
        </div>
      </td>
    </tr>
  );
}

function MovementTableEmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="font-medium text-foreground">
        {hasFilter
          ? SPR_MOVE_EVENT_TABLE_COPY.noSearchResults
          : SPR_MOVE_EVENT_TABLE_COPY.noMovements}
      </div>
      {hasFilter ? (
        <div className="text-2xs">
          Try a taxon name, branch value, attachment label, SPR move ID, or different value filter.
        </div>
      ) : null}
    </div>
  );
}
