import React from 'react';
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
  const segment = timeline?.segments[segmentIndex];

  if (!segment) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
        Select a timeline segment to inspect its transition.
      </div>
    );
  }

  const details = buildInspectorDetails({
    segment,
    leafNamesByIndex,
    pairChanges,
    scaleList,
    hasMsa,
    msaStepSize,
    msaWindowSize,
    msaColumnCount,
  });
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
          <span className="truncate">{names.join(', ')}</span>
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
  const isInputTree = segment.isInputTreeSegment;
  const change = pairChanges.byPairId.get(segment.pairId);
  const scaleValue = getScaleValue(
    scaleList,
    isInputTree ? segment.globalIndex : segment.sourceGlobalIndex
  );
  const stepRange = isInputTree ? null : getSegmentStepRange(segment);
  const msaFrameIndex = isInputTree ? segment.originalTreeIndex : segment.sourceInputTreeIndex;
  const msaWindow =
    hasMsa && msaColumnCount > 0
      ? calculateWindow(msaFrameIndex, msaStepSize, msaWindowSize, msaColumnCount)
      : null;

  return {
    name: isInputTree
      ? `Input tree ${segment.originalTreeIndex + 1}`
      : `Tree ${segment.sourceInputTreeIndex + 1} → Tree ${segment.targetInputTreeIndex + 1}`,
    directionLabel: isInputTree
      ? null
      : `Source tree ${segment.sourceInputTreeIndex + 1} -> Target tree ${
          segment.targetInputTreeIndex + 1
        }`,
    stepLabel: stepRange
      ? `${stepRange.start === stepRange.end ? stepRange.start : `${stepRange.start}–${stepRange.end}`} of ${stepRange.total}`
      : null,
    eventLabel: segment.splitCount > 1 ? `${segment.splitIndex} of ${segment.splitCount}` : null,
    positionLabel: isInputTree
      ? `Input tree ${segment.originalTreeIndex + 1}`
      : `Transition ${segment.pairOrdinal + 1} of ${pairChanges.byPairId.size}`,
    movingTaxaLabel: formatCount(segment.subtreeMoveCount, 'taxon', 'taxa'),
    animationStepLabel: formatCount(segment.lastFrame - segment.firstFrame, 'step', 'steps'),
    pivotEdgeLabel: formatPivotEdgeLabel(segment.pivotEdge),
    rfLabel: change?.rf?.toFixed(3),
    weightedRfLabel: change?.weightedRf?.toFixed(3),
    scaleLabel: scaleValue === null ? null : formatScaleValue(scaleValue),
    msaWindowLabel: msaWindow
      ? `${msaWindow.startPosition}-${msaWindow.midPosition}-${msaWindow.endPosition}`
      : null,
    subtreeGroups: extractAffectedSubtreeGroups(segment.affectedSubtrees, leafNamesByIndex),
  };
}

function formatCount(value, singular, plural) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function formatPivotEdgeLabel(pivotEdge) {
  const preview = formatPivotEdgePreview(pivotEdge);
  return preview && `${preview} (${formatCount(pivotEdge.length, 'taxon', 'taxa')})`;
}
