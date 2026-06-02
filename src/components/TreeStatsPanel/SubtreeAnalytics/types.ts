import type { BranchAnnotationValue, BranchSupport } from '../../../domain/backend/phyloMovieTypes';

export interface SprMovedSubtreeTopologyNode {
  name: string;
  length: number | null;
  splitIndices: number[];
  children: SprMovedSubtreeTopologyNode[];
}

export interface SprMovedSubtreeTopologySnapshot {
  root: SprMovedSubtreeTopologyNode | null;
  newick: string;
  leafCount: number;
  nodeCount: number;
  splitIndices: number[];
  unavailableReason?: string | null;
}

export interface SprMovedSubtreeRecurrence {
  signature: string;
  splitIndices: number[];
  driverSplitIndices?: number[];
  contextSplitIndices?: number[];
  highlightGroup?: number[][];
  groupSize?: number;
  count: number;
  percentage: number;
  totalPathHops: number;
  averagePathHops: number;
  totalPathLength: number;
  averagePathLength: number;
  pairCount?: number;
  pairIds?: string[];
  sourceMovedSubtreeTopology?: SprMovedSubtreeTopologySnapshot | null;
  destinationMovedSubtreeTopology?: SprMovedSubtreeTopologySnapshot | null;
  sourceMovedSubtreeNewick?: string;
  destinationMovedSubtreeNewick?: string;
  sourceTopologyVariantCount?: number;
  destinationTopologyVariantCount?: number;
  topologyVariantCount?: number;
  sourceParentBranchValueMedian?: number | null;
  destinationParentBranchValueMedian?: number | null;
  lowParentBranchValueCount?: number;
  missingParentBranchValueCount?: number;
}

export interface SprMoveEventRow {
  eventId: string;
  pairLabel: string;
  pairId: string;
  pairIndex: number;
  sourceInputTreeIndex: number | null;
  targetInputTreeIndex: number | null;
  eventIndex: number;
  signature: string;
  splitIndices: number[];
  driverSplitIndices: number[];
  contextSplitIndices: number[];
  highlightGroup: number[][];
  groupSize: number;
  pivotEdge: number[];
  sourceAttachment: number[];
  destinationAttachment: number[];
  sourceAttachmentSupport?: BranchSupport | null;
  destinationAttachmentSupport?: BranchSupport | null;
  sourceMovedSubtreeBranchValue?: BranchAnnotationValue | null;
  destinationMovedSubtreeBranchValue?: BranchAnnotationValue | null;
  sourceParentBranchValue?: BranchAnnotationValue | null;
  destinationParentBranchValue?: BranchAnnotationValue | null;
  branchValueClass?: string;
  contextBranchValueClass?: string;
  sourceMovedSubtreeTopology?: SprMovedSubtreeTopologySnapshot | null;
  destinationMovedSubtreeTopology?: SprMovedSubtreeTopologySnapshot | null;
  sourceMovedSubtreeNewick?: string;
  destinationMovedSubtreeNewick?: string;
  stepRange: [number, number] | null;
  totalPathHops: number;
  totalPathLength: number;
  rfDistance: number | null;
  weightedRfDistance: number | null;
}
