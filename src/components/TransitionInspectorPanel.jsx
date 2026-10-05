import React, { useMemo } from 'react';
import { ArrowRightLeft, Dna, Gauge, GitBranch } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { calculateWindow } from '../domain/msa/msaWindowCalculator';
import { formatScaleValue, getScaleValue } from '../domain/tree/scaleUtils';
import { useAppStore } from '../state/phyloStore/store.js';
import {
  selectHasMsa,
  selectLeafNamesByIndex,
  selectTimeline,
  selectMsaColumnCount,
  selectMsaStepSize,
  selectMsaWindowSize,
  selectPairChanges,
  selectScaleList,
  selectSelectedTimelineSegmentIndex,
} from '../state/phyloStore/store.js';
import { Badge } from './ui/badge';
import {
  extractAffectedSubtreeGroups,
  formatPivotEdgePreview,
  getSegmentStepRange,
} from './timeline/timelineSegmentTooltipUtils.js';

export function TransitionInspectorPanel() {
  const {
    segmentIndex,
    timeline,
    leafNamesByIndex,
    pairChanges,
    scaleList,
    hasMsa,
    msaStepSize,
    msaWindowSize,
    msaColumnCount,
  } = useAppStore(
    useShallow((state) => ({
      segmentIndex: selectSelectedTimelineSegmentIndex(state),
      timeline: selectTimeline(state),
      leafNamesByIndex: selectLeafNamesByIndex(state),
      pairChanges: selectPairChanges(state),
      scaleList: selectScaleList(state),
      hasMsa: selectHasMsa(state),
      msaStepSize: selectMsaStepSize(state),
      msaWindowSize: selectMsaWindowSize(state),
      msaColumnCount: selectMsaColumnCount(state),
    }))
  );
  const segment = Number.isInteger(segmentIndex)
    ? (timeline?.segments[segmentIndex] ?? null)
    : null;

  const details = useMemo(
    () =>
      buildInspectorDetails({
        segment,
        leafNamesByIndex,
        pairChanges,
        scaleList,
        hasMsa,
        msaStepSize,
        msaWindowSize,
        msaColumnCount,
      }),
    [
      segment,
      leafNamesByIndex,
      pairChanges,
      scaleList,
      hasMsa,
      msaStepSize,
      msaWindowSize,
      msaColumnCount,
    ]
  );

  if (!segment) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
        Select a timeline segment to inspect its transition.
      </div>
    );
  }

  const isInputTree = segment.isInputTreeSegment;
  const Icon = isInputTree ? GitBranch : ArrowRightLeft;

  return (
    <aside
      className="flex h-full min-h-0 flex-col overflow-hidden bg-card text-card-foreground"
      aria-label="Transition Inspector"
    >
      <div className="flex items-start gap-3 border-b border-border p-4">
        <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
          <Icon className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge variant={isInputTree ? 'outline' : 'secondary'} className="text-2xs">
              {isInputTree ? 'Input tree' : 'Transition'}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{details.positionLabel}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 text-sm">
        <Section title="Selection">
          <KeyValue label="Name" value={details.name} />
          <KeyValue label="Direction" value={details.directionLabel} />
          {details.stepLabel && <KeyValue label="Steps" value={details.stepLabel} />}
          {details.eventLabel && <KeyValue label="Event" value={details.eventLabel} />}
        </Section>

        <Section title="SPR Move">
          <KeyValue label="Moved taxa" value={details.movingTaxaLabel} />
          <KeyValue label="Animation steps" value={details.animationStepLabel} />
          <KeyValue label="Pivot edge" value={details.pivotEdgeLabel} />
          <SubtreeList groups={details.subtreeGroups} />
        </Section>

        <Section title="Metrics">
          <Metric icon={GitBranch} label="RF distance" value={details.rfLabel} />
          <Metric icon={GitBranch} label="Weighted RF" value={details.weightedRfLabel} />
          <Metric icon={Gauge} label="Source input tree scale" value={details.scaleLabel} />
        </Section>

        {hasMsa ? (
          <Section title="Alignment">
            <Metric icon={Dna} label="MSA window" value={details.msaWindowLabel} />
          </Section>
        ) : null}
      </div>
    </aside>
  );
}

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="flex flex-col gap-2 rounded-md border border-border/70 bg-background/60 p-3">
        {children}
      </div>
    </section>
  );
}

function KeyValue({ label, value }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words font-medium text-foreground">
        {value ?? 'Unavailable'}
      </span>
    </div>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </span>
      <span className="font-medium tabular-nums text-foreground">{value ?? 'Unavailable'}</span>
    </div>
  );
}

function SubtreeList({ groups }) {
  if (!groups.length) return null;

  const visibleGroups = groups.slice(0, 8);
  const hiddenCount = groups.length - visibleGroups.length;

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {visibleGroups.map((names, index) => (
        <Badge
          key={`${names.join('|')}-${index}`}
          variant="secondary"
          className="max-w-full text-2xs"
        >
          <span className="truncate">{formatSubtreeNames(names)}</span>
        </Badge>
      ))}
      {hiddenCount > 0 && (
        <Badge variant="outline" className="text-2xs">
          +{hiddenCount} more
        </Badge>
      )}
    </div>
  );
}

function buildInspectorDetails({
  segment,
  leafNamesByIndex,
  pairChanges,
  scaleList,
  hasMsa,
  msaStepSize,
  msaWindowSize,
  msaColumnCount,
}) {
  if (!segment) return null;

  const getLeafNames = (indices) => getLeafNamesByIndices(indices, leafNamesByIndex);
  const subtreeGroups = extractAffectedSubtreeGroups(segment.affectedSubtrees, getLeafNames);
  const pair = resolvePairContext(segment);
  const change = pairChanges.byPairId.get(segment.pairId);
  const sourceGlobalIndex = resolveSourceGlobalIndex(segment);
  const scaleValue = getScaleValue(scaleList, sourceGlobalIndex);
  const stepRange = segment.isInputTreeSegment ? null : getSegmentStepRange(segment);
  const msaFrameIndex = resolveMsaFrameIndex(segment, pair);
  const msaWindow =
    hasMsa &&
    Number.isFinite(msaFrameIndex) &&
    Number.isFinite(msaColumnCount) &&
    msaColumnCount > 0
      ? calculateWindow(msaFrameIndex, msaStepSize, msaWindowSize, msaColumnCount || 0)
      : null;

  return {
    name: formatTreeName(segment, pair),
    directionLabel: pair
      ? `Source tree ${pair.sourceInputTreeIndex + 1} -> Target tree ${
          pair.targetInputTreeIndex + 1
        }`
      : null,
    stepLabel: stepRange
      ? `${formatRange(stepRange.start, stepRange.end, '–')} of ${stepRange.total}`
      : null,
    eventLabel: segment.splitCount > 1 ? `${segment.splitIndex} of ${segment.splitCount}` : null,
    positionLabel: formatPosition(segment, pairChanges.byPairId.size),
    movingTaxaLabel: formatCount(segment.subtreeMoveCount, 'taxon', 'taxa'),
    animationStepLabel: formatCount(segment.lastFrame - segment.firstFrame, 'step', 'steps'),
    pivotEdgeLabel: formatPivotEdgeLabel(segment.pivotEdge),
    rfLabel: formatNumber(change?.rf, 3),
    weightedRfLabel: formatNumber(change?.weightedRf, 3),
    scaleLabel: Number.isFinite(scaleValue) ? formatScaleValue(scaleValue) : null,
    msaWindowLabel: msaWindow
      ? `${msaWindow.startPosition}-${msaWindow.midPosition}-${msaWindow.endPosition}`
      : null,
    subtreeGroups,
  };
}

function getLeafNamesByIndices(indices, leafNamesByIndex) {
  if (!Array.isArray(indices) || !Array.isArray(leafNamesByIndex)) return [];

  return indices
    .filter((index) => Number.isInteger(index) && index >= 0 && index < leafNamesByIndex.length)
    .map((index) => leafNamesByIndex[index]);
}

function resolvePairContext(segment) {
  if (
    Number.isInteger(segment?.sourceInputTreeIndex) &&
    Number.isInteger(segment?.targetInputTreeIndex)
  ) {
    return {
      pairId: segment.pairId,
      sourceInputTreeIndex: segment.sourceInputTreeIndex,
      targetInputTreeIndex: segment.targetInputTreeIndex,
      pairOrdinal: segment.pairOrdinal,
    };
  }
  return null;
}

function resolveSourceGlobalIndex(segment) {
  if (Number.isInteger(segment.globalIndex)) return segment.globalIndex;
  if (Number.isInteger(segment.sourceGlobalIndex)) return segment.sourceGlobalIndex;
  return null;
}

function formatPosition(segment, pairCount) {
  if (segment.isInputTreeSegment) {
    return Number.isInteger(segment.originalTreeIndex)
      ? `Input tree ${segment.originalTreeIndex + 1}`
      : null;
  }
  if (!Number.isInteger(segment.pairOrdinal)) return null;
  return `Transition ${segment.pairOrdinal + 1}${pairCount ? ` of ${pairCount}` : ''}`;
}

function resolveMsaFrameIndex(segment, pair) {
  if (segment.isInputTreeSegment && Number.isInteger(segment.originalTreeIndex)) {
    return segment.originalTreeIndex;
  }
  return Number.isInteger(pair?.sourceInputTreeIndex) ? pair.sourceInputTreeIndex : null;
}

function formatTreeName(segment, pair) {
  if (pair) return `Tree ${pair.sourceInputTreeIndex + 1} → Tree ${pair.targetInputTreeIndex + 1}`;
  if (segment.isInputTreeSegment && Number.isInteger(segment.originalTreeIndex)) {
    return `Input tree ${segment.originalTreeIndex + 1}`;
  }
  return segment.isInputTreeSegment ? null : 'Generated transition frames';
}

function formatRange(start, end, separator = '-') {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return start === end ? String(start) : `${start}${separator}${end}`;
}

function formatCount(value, singular, plural) {
  if (!Number.isFinite(value)) return null;
  return `${value} ${value === 1 ? singular : plural}`;
}

function formatPivotEdgeLabel(pivotEdge) {
  const preview = formatPivotEdgePreview(pivotEdge);
  if (!preview) return null;

  const countLabel = formatCount(pivotEdge.length, 'taxon', 'taxa');
  return `${preview} (${countLabel})`;
}

function formatNumber(value, decimals) {
  return Number.isFinite(value) ? value.toFixed(decimals) : null;
}

function formatSubtreeNames(names) {
  if (!Array.isArray(names) || names.length === 0) return 'Unnamed subtree';
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}
