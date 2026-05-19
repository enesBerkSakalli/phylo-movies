import React, { useMemo } from 'react';
import { ArrowRightLeft, Dna, Gauge, GitBranch, X } from 'lucide-react';
import { calculateWindow } from '../domain/msa/msaWindowCalculator';
import { formatScaleValue, getScaleValue } from '../domain/tree/scaleUtils';
import { useAppStore } from '../state/phyloStore/store.js';
import {
  selectDistanceRfd,
  selectDistanceWeightedRfd,
  selectHasMsa,
  selectLeafNamesByIndex,
  selectMovieTimelineManager,
  selectMsaColumnCount,
  selectMsaStepSize,
  selectMsaWindowSize,
  selectScaleList,
  selectSelectedTimelineSegmentIndex,
  selectSetSelectedTimelineSegment,
} from '../state/phyloStore/store.js';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { extractMovingSubtreeGroups } from './timeline/TimelineSegmentTooltip.jsx';

export function TransitionInspectorPanel() {
  const segmentIndex = useAppStore(selectSelectedTimelineSegmentIndex);
  const setSelectedTimelineSegment = useAppStore(selectSetSelectedTimelineSegment);
  const movieTimelineManager = useAppStore(selectMovieTimelineManager);
  const leafNamesByIndex = useAppStore(selectLeafNamesByIndex);
  const distanceRfd = useAppStore(selectDistanceRfd);
  const distanceWeightedRfd = useAppStore(selectDistanceWeightedRfd);
  const scaleList = useAppStore(selectScaleList);
  const hasMsa = useAppStore(selectHasMsa);
  const msaStepSize = useAppStore(selectMsaStepSize);
  const msaWindowSize = useAppStore(selectMsaWindowSize);
  const msaColumnCount = useAppStore(selectMsaColumnCount);
  const segment = Number.isInteger(segmentIndex)
    ? movieTimelineManager?.getSegment?.(segmentIndex) ?? null
    : null;

  const details = useMemo(() => buildInspectorDetails({
    segment,
    leafNamesByIndex,
    distanceRfd,
    distanceWeightedRfd,
    scaleList,
    hasMsa,
    msaStepSize,
    msaWindowSize,
    msaColumnCount,
  }), [
    segment,
    leafNamesByIndex,
    distanceRfd,
    distanceWeightedRfd,
    scaleList,
    hasMsa,
    msaStepSize,
    msaWindowSize,
    msaColumnCount,
  ]);

  if (!segment) return null;

  const totalSegments = movieTimelineManager?.getSegmentCount?.() ?? 0;
  const isInputTree = segment.isFullTree;
  const Icon = isInputTree ? GitBranch : ArrowRightLeft;

  return (
    <aside
      className="absolute right-4 top-4 bottom-4 z-[70] flex w-[22rem] max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-lg border border-border bg-card/95 text-card-foreground shadow-xl backdrop-blur-md"
      aria-label="Transition Inspector"
    >
      <div className="flex items-start gap-3 border-b border-border p-4">
        <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
          <Icon className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold">Transition Inspector</h2>
            <Badge variant={isInputTree ? 'outline' : 'secondary'} className="text-2xs">
              {isInputTree ? 'Input tree' : 'Generated frames'}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Segment {segmentIndex + 1}{totalSegments ? ` of ${totalSegments}` : ''}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="-mr-1 -mt-1 text-muted-foreground hover:text-foreground"
          aria-label="Close transition inspector"
          onClick={() => setSelectedTimelineSegment(null)}
        >
          <X className="size-4" aria-hidden />
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
        <Section title="Selection">
          <KeyValue label="Name" value={details.name} />
          <KeyValue label="Direction" value={details.directionLabel} />
          <KeyValue label="Global frames" value={details.globalRangeLabel} />
          <KeyValue label="Local steps" value={details.localStepLabel} />
        </Section>

        <Section title="Movement">
          <KeyValue label="Moving taxa" value={details.movingTaxaLabel} />
          <KeyValue label="Generated frames" value={details.generatedFrameLabel} />
          <KeyValue label="Animation steps" value={details.animationStepLabel} />
          <KeyValue label="Changing split" value={details.pivotEdgeLabel} />
          <SubtreeList groups={details.subtreeGroups} />
        </Section>

        <Section title="Metrics">
          <Metric icon={GitBranch} label="RF distance" value={details.rfLabel} />
          <Metric icon={GitBranch} label="Weighted RF" value={details.weightedRfLabel} />
          <Metric icon={Gauge} label="Source input tree scale" value={details.scaleLabel} />
        </Section>

        <Section title="Alignment">
          <Metric icon={Dna} label="MSA window" value={details.msaWindowLabel} />
        </Section>
      </div>
    </aside>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h3 className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-2 rounded-md border border-border/70 bg-background/60 p-3">
        {children}
      </div>
    </section>
  );
}

function KeyValue({ label, value }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words font-medium text-foreground">{value ?? 'Unavailable'}</span>
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
        <Badge key={`${names.join('|')}-${index}`} variant="secondary" className="max-w-full text-2xs">
          <span className="truncate">{formatSubtreeNames(names)}</span>
        </Badge>
      ))}
      {hiddenCount > 0 && (
        <Badge variant="outline" className="text-2xs">+{hiddenCount} more</Badge>
      )}
    </div>
  );
}

function buildInspectorDetails({
  segment,
  leafNamesByIndex,
  distanceRfd,
  distanceWeightedRfd,
  scaleList,
  hasMsa,
  msaStepSize,
  msaWindowSize,
  msaColumnCount,
}) {
  if (!segment) return null;

  const getLeafNames = (indices) => getLeafNamesByIndices(indices, leafNamesByIndex);
  const subtreeGroups = extractMovingSubtreeGroups(segment.affectedSubtrees, getLeafNames);
  const pair = parsePairKey(segment.treePairKey);
  const sourceGlobalIndex = resolveSourceGlobalIndex(segment);
  const scaleValue = getScaleValue(scaleList, sourceGlobalIndex);
  const msaFrameIndex = resolveMsaFrameIndex(segment, pair);
  const msaWindow = hasMsa && Number.isInteger(msaFrameIndex)
    ? calculateWindow(msaFrameIndex, msaStepSize, msaWindowSize, msaColumnCount || 0)
    : null;

  return {
    name: formatTreeName(segment),
    directionLabel: pair
      ? `source input tree ${pair.sourceTreeIndex + 1} -> target input tree ${pair.targetTreeIndex + 1}`
      : segment.treePairKey,
    globalRangeLabel: formatRange(segment.globalStart, segment.globalEnd),
    localStepLabel: formatRange(segment.localStepStart, segment.localStepEnd),
    movingTaxaLabel: formatCount(segment.subtreeMoveCount, 'taxon', 'taxa'),
    generatedFrameLabel: formatCount(resolveGeneratedFrameCount(segment), 'frame', 'frames'),
    animationStepLabel: formatCount(resolveAnimationStepCount(segment), 'step', 'steps'),
    pivotEdgeLabel: Array.isArray(segment.pivotEdge) && segment.pivotEdge.length
      ? formatCount(segment.pivotEdge.length, 'taxon', 'taxa')
      : null,
    rfLabel: formatNumber(getPairMetric(distanceRfd, pair), 3),
    weightedRfLabel: formatNumber(getPairMetric(distanceWeightedRfd, pair), 3),
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

function parsePairKey(pairKey) {
  const match = /^pair_(\d+)_(\d+)$/.exec(pairKey || '');
  if (!match) return null;
  return {
    sourceTreeIndex: Number(match[1]),
    targetTreeIndex: Number(match[2]),
  };
}

function resolveSourceGlobalIndex(segment) {
  if (Number.isInteger(segment.globalIndex)) return segment.globalIndex;
  if (Number.isInteger(segment.sourceGlobalIndex)) return segment.sourceGlobalIndex;
  if (Number.isInteger(segment.interpolationData?.[0]?.metadata?.source_tree_global_index)) {
    return segment.interpolationData[0].metadata.source_tree_global_index;
  }
  return null;
}

function resolveGeneratedFrameCount(segment) {
  if (Number.isInteger(segment.generatedFrameCount)) return segment.generatedFrameCount;
  return segment.interpolationData?.length;
}

function resolveAnimationStepCount(segment) {
  if (Number.isInteger(segment.animationStepCount)) return segment.animationStepCount;
  return Array.isArray(segment.interpolationData) ? Math.max(0, segment.interpolationData.length - 1) : null;
}

function resolveMsaFrameIndex(segment, pair) {
  if (segment.isFullTree && Number.isInteger(segment.originalTreeIndex)) {
    return segment.originalTreeIndex;
  }
  return Number.isInteger(pair?.sourceTreeIndex) ? pair.sourceTreeIndex : null;
}

function getPairMetric(values, pair) {
  if (!Array.isArray(values) || !Number.isInteger(pair?.sourceTreeIndex)) return null;
  const value = values[pair.sourceTreeIndex];
  return Number.isFinite(value) ? value : null;
}

function formatTreeName(segment) {
  if (typeof segment.treeName === 'string' && segment.treeName.trim()) {
    return segment.treeName;
  }
  if (segment.isFullTree && Number.isInteger(segment.originalTreeIndex)) {
    return `Input Tree ${segment.originalTreeIndex + 1}`;
  }
  return segment.isFullTree ? null : 'Generated transition frames';
}

function formatRange(start, end) {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return start === end ? String(start) : `${start}-${end}`;
}

function formatCount(value, singular, plural) {
  if (!Number.isFinite(value)) return null;
  return `${value} ${value === 1 ? singular : plural}`;
}

function formatNumber(value, decimals) {
  return Number.isFinite(value) ? value.toFixed(decimals) : null;
}

function formatSubtreeNames(names) {
  if (!Array.isArray(names) || names.length === 0) return 'Unnamed subtree';
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

export default TransitionInspectorPanel;
