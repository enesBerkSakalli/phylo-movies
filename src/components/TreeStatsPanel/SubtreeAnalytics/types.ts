export interface SprMoverFrequency {
    signature: string;
    splitIndices: number[];
    driverSplitIndices?: number[];
    highlightGroup?: number[][];
    groupSize?: number;
    count: number;
    percentage: number;
    pathEventCount: number;
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
    hasMeasuredPath: boolean;
}
