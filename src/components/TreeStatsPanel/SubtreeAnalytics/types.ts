export interface SprMovedSubtreeFrequency {
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
    pairKeys?: string[];
}

export interface SprMoveEventRow {
    eventId: string;
    pairLabel: string;
    pairKey: string;
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
    stepRange: [number, number] | null;
    totalPathHops: number;
    totalPathLength: number;
    rfDistance: number | null;
    weightedRfDistance: number | null;
}
