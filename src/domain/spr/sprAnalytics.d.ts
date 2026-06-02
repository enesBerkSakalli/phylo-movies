import type { BranchAnnotationValue, BranchSupport } from '../backend/phyloMovieTypes';

export interface SprMovedSubtreeTopologyNode {
  name: string;
  length: number | null;
  splitIndices: number[];
  children: SprMovedSubtreeTopologyNode[];
}

export interface SprMovedSubtreeTopologySnapshot {
  root: SprMovedSubtreeTopologyNode | null;
  newick: string;
  topologySignature: string;
  leafCount: number;
  nodeCount: number;
  splitIndices: number[];
  unavailableReason?: string | null;
}

export interface SprMovedSubtreeAttachmentContext {
  pivotEdge: number[];
  sourceAttachment: number[];
  destinationAttachment: number[];
  eventId: string;
}

export interface SprMovedSubtreeRecurrence {
  signature: string;
  splitIndices: number[];
  driverSplitIndices: number[];
  contextSplitIndices: number[];
  highlightGroup: number[][];
  groupSize: number;
  count: number;
  totalPathHops: number;
  averagePathHops: number;
  totalPathLength: number;
  averagePathLength: number;
  percentage: number;
  pairCount: number;
  pairIds: string[];
  attachmentContexts: SprMovedSubtreeAttachmentContext[];
  sourceMovedSubtreeTopology: SprMovedSubtreeTopologySnapshot | null;
  destinationMovedSubtreeTopology: SprMovedSubtreeTopologySnapshot | null;
  sourceMovedSubtreeNewick: string;
  destinationMovedSubtreeNewick: string;
  sourceTopologyVariantCount: number;
  destinationTopologyVariantCount: number;
  topologyVariantCount: number;
  sourceParentBranchValueMedian: number | null;
  destinationParentBranchValueMedian: number | null;
  lowParentBranchValueCount: number;
  missingParentBranchValueCount: number;
}

export interface SprMoveEventRow {
  eventId: string;
  pairLabel: string;
  pairId: string;
  pairIndex: number;
  pairOrdinal: number;
  sourceInputTreeIndex: number | null;
  targetInputTreeIndex: number | null;
  eventIndex: number;
  signature: string;
  splitIndices: number[];
  driverSplitIndices: number[];
  contextSplitIndices: number[];
  highlightGroup: number[][];
  groupSize: number;
  taxaCount: number;
  pivotEdge: number[];
  sourceAttachment: number[];
  destinationAttachment: number[];
  sourceAttachmentSupport: BranchSupport | null;
  destinationAttachmentSupport: BranchSupport | null;
  sourceMovedSubtreeBranchValue: BranchAnnotationValue | null;
  destinationMovedSubtreeBranchValue: BranchAnnotationValue | null;
  sourceParentBranchValue: BranchAnnotationValue | null;
  destinationParentBranchValue: BranchAnnotationValue | null;
  branchValueClass: string;
  contextBranchValueClass: string;
  sourceMovedSubtreeTopology: SprMovedSubtreeTopologySnapshot;
  destinationMovedSubtreeTopology: SprMovedSubtreeTopologySnapshot;
  sourceMovedSubtreeNewick: string;
  destinationMovedSubtreeNewick: string;
  stepRange: [number, number] | null;
  frameRange: [number, number] | null;
  collapseHops: number;
  expandHops: number;
  totalPathHops: number;
  collapsePathLength: number;
  expandPathLength: number;
  totalPathLength: number;
  collapsePath: unknown[];
  expandPath: unknown[];
  interpolationRange: [number, number];
  generatedFrameRange: [number, number] | null;
  rfDistance: number | null;
  weightedRfDistance: number | null;
}

export interface SprPairActivityRow {
  pairId: string;
  pairIndex: number;
  pairOrdinal: number;
  sourceInputTreeIndex: number | null;
  targetInputTreeIndex: number | null;
  interpolationRange: [number, number];
  generatedFrameRange: [number, number] | null;
  rfDistance: number | null;
  weightedRfDistance: number | null;
  uniqueMovedSubtreeCount: number;
  singleTaxonMoveEventCount: number;
  multiTaxonMoveEventCount: number;
  transitionEventCount: number;
  sprMoveEventCount: number;
  totalPathHops: number;
  averagePathHops: number;
  totalPathLength: number;
  averagePathLength: number;
  topMovedSubtree: SprMovedSubtreeRecurrence | null;
  movedSubtrees: SprMovedSubtreeRecurrence[];
  events: SprMoveEventRow[];
}

export interface SprDatasetSummary {
  pairCount: number;
  activePairCount: number;
  transitionEventCount: number;
  uniqueMovedSubtreeCount: number;
  singleTaxonMoveEventCount: number;
  multiTaxonMoveEventCount: number;
  topMovedSubtreeSharePercentage: number;
  sprMoveEventCount: number;
  totalPathHops: number;
  averagePathHops: number;
  totalPathLength: number;
  averagePathLength: number;
  farthestMovedSubtree: SprMovedSubtreeRecurrence | null;
}

export interface SprAnalyticsModel {
  eventRows: SprMoveEventRow[];
  movedSubtreeRecurrences: SprMovedSubtreeRecurrence[];
  pairActivityRows: SprPairActivityRow[];
  summary: SprDatasetSummary;
}

export interface SprAnalyticsOptions {
  temporalEvents: unknown[];
  pairMetrics: {
    rows: Array<{
      pair_id: string;
      pair_ordinal: number;
      robinson_foulds: number | null;
      weighted_robinson_foulds: number | null;
    }>;
    semantics?: Record<string, unknown>;
  };
  branchSupportIndex?: {
    getSupport?: (inputTreeIndex: number | null, splitIndices: number[]) => BranchSupport | null;
    getBranchValue?: (
      inputTreeIndex: number | null,
      splitIndices: number[],
      valueKey?: string
    ) => BranchAnnotationValue | null;
    getNearestParentBranchValue?: (
      inputTreeIndex: number | null,
      splitIndices: number[],
      valueKey?: string
    ) => BranchAnnotationValue | null;
  };
  interpolatedTrees?: unknown[];
  branchAnnotationValueKey?: string;
  branchValueThreshold?: number;
}

export function buildSprMoveEventRows(
  pairs: unknown[],
  options?: SprAnalyticsOptions
): SprMoveEventRow[];
export function buildSprAnalyticsModel(
  pairs: unknown[],
  options?: SprAnalyticsOptions
): SprAnalyticsModel;
export function calculateSprMovedSubtreeRecurrences(
  pairs: unknown[],
  options?: SprAnalyticsOptions
): SprMovedSubtreeRecurrence[];
export function calculateSprPairActivity(
  pairs: unknown[],
  options?: SprAnalyticsOptions
): SprPairActivityRow[];
export function calculateSprDatasetSummary(
  pairs: unknown[],
  options?: SprAnalyticsOptions
): SprDatasetSummary;
export function buildSprActivityTimelinePoints(pairActivityRows: SprPairActivityRow[]): Array<{
  pairIndex: number;
  pairId: string;
  pairLabel: string;
  sprMoveEvents: number;
  uniqueMovedSubtrees: number;
  singleTaxonMoveEventCount: number;
  multiTaxonMoveEventCount: number;
  topMovedSubtreeSignature: string | null;
}>;
export function getTopSprMovedSubtreeRecurrences(
  recurrences: SprMovedSubtreeRecurrence[],
  n?: number
): SprMovedSubtreeRecurrence[];
export function formatSubtreeLabel(splitIndices: number[], leafNames?: string[]): string;
