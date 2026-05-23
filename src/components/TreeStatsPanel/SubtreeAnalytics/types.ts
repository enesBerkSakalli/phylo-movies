import type { BranchSupport } from '../../../domain/backend/phyloMovieTypes';

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
    movedSubtreeSupport?: BranchSupport | null;
    supportClass?: string;
    stepRange: [number, number] | null;
    totalPathHops: number;
    totalPathLength: number;
    rfDistance: number | null;
    weightedRfDistance: number | null;
}
