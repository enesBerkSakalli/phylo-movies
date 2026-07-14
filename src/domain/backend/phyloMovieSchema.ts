import type {
  DatasetProvenance,
  PhyloMovieData,
  TemporalEvent,
  TimelineFrame,
  TimelinePair,
} from './phyloMovieTypes';
import { assertExactRecordKeys, assertRecord } from './schemaValidation';
import {
  validateFrames,
  validateMsa,
  validatePairs,
  validatePairMetrics,
  validateSubtreeHighlightTracking,
  validateTemporalEvents,
  validateAnnotationDefinitions,
  validateSplitDefinitions,
  validateTreeNameDefinitions,
  validateTreeList,
  validateTreePayloadList,
} from './treePayloadValidators';
import { hydrateMovieTreeAtIndex as hydrateMovieTreePayloadAtIndex } from './treeHydration.js';

export type {
  DatasetProvenance,
  MsaData,
  PairMetricRow,
  PairMetrics,
  PairSolution,
  PhyloMovieData,
  SplitChangeTemporalEvent,
  SprMoveTemporalEvent,
  SprPathSegment,
  SubtreeHighlightTracking,
  TemporalEvent,
  TimelineFrame,
  TimelinePair,
  TreeNode,
} from './phyloMovieTypes';

type ValidationOptions = {
  hydrateTrees?: boolean;
};

export type PhyloMovieTransportData = Omit<PhyloMovieData, 'interpolated_trees'> & {
  interpolated_trees: unknown[];
  annotation_definitions: ReturnType<typeof validateAnnotationDefinitions>;
  tree_name_definitions: string[];
  split_definitions: number[][];
};

export function validatePhyloMovieData(data: unknown): PhyloMovieData;
export function validatePhyloMovieData(
  data: unknown,
  options: { hydrateTrees: false }
): PhyloMovieTransportData;
export function validatePhyloMovieData(
  data: unknown,
  options: ValidationOptions = {}
): PhyloMovieData | PhyloMovieTransportData {
  assertRecord(data, 'phyloMovieData');
  assertExactRecordKeys(data, 'phyloMovieData', [
    'interpolated_trees',
    'annotation_definitions',
    'tree_name_definitions',
    'split_definitions',
    'frames',
    'pairs',
    'temporal_events',
    'subtree_highlight_tracking',
    'pair_metrics',
    'msa',
    'file_name',
    'dataset_provenance',
  ]);

  const annotationDefinitions = validateAnnotationDefinitions(data.annotation_definitions);
  const treeNameDefinitions = validateTreeNameDefinitions(data.tree_name_definitions);
  const splitDefinitions = validateSplitDefinitions(data.split_definitions);
  const treeDictionaries = {
    treeNameDefinitions,
    splitDefinitions,
  };
  const hydrateTrees = options.hydrateTrees !== false;
  const interpolatedTrees = hydrateTrees
    ? validateTreeList(data.interpolated_trees, annotationDefinitions, treeDictionaries)
    : validateTreePayloadList(data.interpolated_trees, annotationDefinitions, treeDictionaries);
  const treeCount = interpolatedTrees.length;
  const frames = validateFrames(data.frames, treeCount);
  const pairs = validatePairs(data.pairs, treeCount);
  const temporalEvents = validateTemporalEvents(data.temporal_events, treeCount);
  const subtreeHighlightTracking = validateSubtreeHighlightTracking(
    data.subtree_highlight_tracking,
    treeCount
  );
  const pairMetrics = validatePairMetrics(data.pair_metrics);
  const msa = validateMsa(data.msa);

  validateTimelineContracts(frames, pairs, temporalEvents, pairMetrics.rows);

  if (typeof data.file_name !== 'string') {
    throw new Error('Invalid phyloMovieData payload: file_name must be a string');
  }
  const datasetProvenance = validateDatasetProvenance(data.dataset_provenance);

  const validatedData = {
    interpolated_trees: interpolatedTrees,
    frames,
    pairs,
    temporal_events: temporalEvents,
    subtree_highlight_tracking: subtreeHighlightTracking,
    pair_metrics: pairMetrics,
    msa,
    file_name: data.file_name,
    dataset_provenance: datasetProvenance,
  };

  if (!hydrateTrees) {
    return {
      ...validatedData,
      annotation_definitions: annotationDefinitions,
      tree_name_definitions: treeNameDefinitions,
      split_definitions: splitDefinitions,
    } as PhyloMovieTransportData;
  }

  return validatedData as PhyloMovieData;
}

export function hydrateMovieTreeAtIndex(
  movieData: PhyloMovieData | PhyloMovieTransportData,
  treeIndex: number
) {
  return hydrateMovieTreePayloadAtIndex(
    movieData,
    treeIndex
  ) as PhyloMovieData['interpolated_trees'][number];
}

function optionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName} must be a string`);
  }
  return value;
}

function requiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName} must be a non-empty string`);
  }
  return value;
}

function validateDatasetProvenance(value: unknown): DatasetProvenance | null {
  if (value === undefined || value === null) return null;
  assertRecord(value, 'phyloMovieData.dataset_provenance');
  assertExactRecordKeys(value, 'phyloMovieData.dataset_provenance', [
    'source_type',
    'source_label',
    'tree_source',
    'alignment_source',
    'settings',
    'citation',
  ]);

  const settingsValue = value.settings;
  if (!Array.isArray(settingsValue)) {
    throw new Error('Invalid phyloMovieData payload: dataset_provenance.settings must be an array');
  }
  const settings = settingsValue.map((setting, index) => {
    assertRecord(setting, `phyloMovieData.dataset_provenance.settings[${index}]`);
    assertExactRecordKeys(setting, `phyloMovieData.dataset_provenance.settings[${index}]`, [
      'label',
      'value',
    ]);
    return {
      label: requiredString(
        setting.label,
        `phyloMovieData.dataset_provenance.settings[${index}].label`
      ),
      value: requiredString(
        setting.value,
        `phyloMovieData.dataset_provenance.settings[${index}].value`
      ),
    };
  });

  return {
    source_type: requiredString(value.source_type, 'phyloMovieData.dataset_provenance.source_type'),
    source_label: requiredString(
      value.source_label,
      'phyloMovieData.dataset_provenance.source_label'
    ),
    tree_source: requiredString(value.tree_source, 'phyloMovieData.dataset_provenance.tree_source'),
    ...(optionalString(value.alignment_source, 'phyloMovieData.dataset_provenance.alignment_source')
      ? {
          alignment_source: optionalString(
            value.alignment_source,
            'phyloMovieData.dataset_provenance.alignment_source'
          ),
        }
      : {}),
    settings,
    ...(optionalString(value.citation, 'phyloMovieData.dataset_provenance.citation')
      ? { citation: optionalString(value.citation, 'phyloMovieData.dataset_provenance.citation') }
      : {}),
  };
}

function validateTimelineContracts(
  frames: TimelineFrame[],
  pairs: TimelinePair[],
  temporalEvents: TemporalEvent[],
  pairMetricRows: PhyloMovieData['pair_metrics']['rows']
): void {
  const inputFrames = frames
    .filter((frame) => frame.frame_type === 'input_tree' || frame.is_observed_input)
    .sort((a, b) => a.frame_index - b.frame_index);
  const inputFrameIndices = new Set(inputFrames.map((frame) => frame.frame_index));
  const pairIds = new Set<string>();
  const pairByAdjacency = new Map<string, TimelinePair>();

  pairs.forEach((pair, index) => {
    if (pair.pair_ordinal !== index) {
      throw new Error(
        `Invalid phyloMovieData payload: pairs[${index}].pair_ordinal must equal adjacent input-frame ordinal ${index}`
      );
    }
    if (pairIds.has(pair.pair_id)) {
      throw new Error(`Invalid phyloMovieData payload: pairs[${index}].pair_id must be unique`);
    }
    pairIds.add(pair.pair_id);

    if (!inputFrameIndices.has(pair.source_frame_index)) {
      throw new Error(
        `Invalid phyloMovieData payload: pairs[${index}].source_frame_index must reference an input frame`
      );
    }
    if (!inputFrameIndices.has(pair.target_frame_index)) {
      throw new Error(
        `Invalid phyloMovieData payload: pairs[${index}].target_frame_index must reference an input frame`
      );
    }
    if (pair.target_frame_index < pair.source_frame_index) {
      throw new Error(
        `Invalid phyloMovieData payload: pairs[${index}].target_frame_index must be after source_frame_index`
      );
    }

    const adjacencyKey = frameAdjacencyKey(pair.source_frame_index, pair.target_frame_index);
    if (pairByAdjacency.has(adjacencyKey)) {
      throw new Error(
        `Invalid phyloMovieData payload: duplicate pair for adjacent input frames ${pair.source_frame_index} -> ${pair.target_frame_index}`
      );
    }
    pairByAdjacency.set(adjacencyKey, pair);

    const expectedSourceFrame = inputFrames[index];
    const expectedTargetFrame = inputFrames[index + 1];
    if (
      expectedSourceFrame &&
      expectedTargetFrame &&
      (pair.source_frame_index !== expectedSourceFrame.frame_index ||
        pair.target_frame_index !== expectedTargetFrame.frame_index ||
        pair.source_input_tree_index !== expectedSourceFrame.input_tree_index ||
        pair.target_input_tree_index !== expectedTargetFrame.input_tree_index)
    ) {
      throw new Error(
        `Invalid phyloMovieData payload: pairs[${index}] must connect adjacent input frames ${expectedSourceFrame.frame_index} -> ${expectedTargetFrame.frame_index}`
      );
    }
  });

  const pairById = new Map(pairs.map((pair) => [pair.pair_id, pair]));

  frames.forEach((frame, index) => {
    if (frame.frame_type === 'input_tree' || frame.is_observed_input) {
      if (
        frame.pair_id !== null ||
        frame.pair_ordinal !== null ||
        frame.local_step_index !== null
      ) {
        throw new Error(
          `Invalid phyloMovieData payload: frames[${index}] input frames must not reference a pair`
        );
      }
      if (frame.input_tree_index === null) {
        throw new Error(
          `Invalid phyloMovieData payload: frames[${index}].input_tree_index is required for input frames`
        );
      }
      return;
    }

    if (frame.pair_id === null || !pairIds.has(frame.pair_id)) {
      throw new Error(
        `Invalid phyloMovieData payload: frames[${index}].pair_id must reference pairs`
      );
    }
    const pair = pairById.get(frame.pair_id);
    if (!pair) return;
    if (frame.pair_ordinal !== pair.pair_ordinal) {
      throw new Error(
        `Invalid phyloMovieData payload: frames[${index}].pair_ordinal must match pairs`
      );
    }
    if (frame.source_frame_index !== pair.source_frame_index) {
      throw new Error(
        `Invalid phyloMovieData payload: frames[${index}].source_frame_index must match pairs`
      );
    }
    if (frame.target_frame_index !== pair.target_frame_index) {
      throw new Error(
        `Invalid phyloMovieData payload: frames[${index}].target_frame_index must match pairs`
      );
    }
  });

  for (let ordinal = 0; ordinal < inputFrames.length - 1; ordinal += 1) {
    const sourceFrame = inputFrames[ordinal];
    const targetFrame = inputFrames[ordinal + 1];
    const expectedKey = frameAdjacencyKey(sourceFrame.frame_index, targetFrame.frame_index);
    const pair = pairByAdjacency.get(expectedKey);

    if (!pair) {
      throw new Error(
        `Invalid phyloMovieData payload: missing pair for adjacent input frames ${sourceFrame.frame_index} -> ${targetFrame.frame_index}`
      );
    }

    const pairIndex = pairs.indexOf(pair);
    if (pairIndex !== ordinal) {
      throw new Error(
        `Invalid phyloMovieData payload: pairs[${pairIndex}] must appear at adjacent input-frame ordinal ${ordinal}`
      );
    }
    if (
      pair.pair_ordinal !== ordinal ||
      pair.source_frame_index !== sourceFrame.frame_index ||
      pair.target_frame_index !== targetFrame.frame_index ||
      pair.source_input_tree_index !== sourceFrame.input_tree_index ||
      pair.target_input_tree_index !== targetFrame.input_tree_index
    ) {
      throw new Error(
        `Invalid phyloMovieData payload: pairs[${pairIndex}] must connect adjacent input frames ${sourceFrame.frame_index} -> ${targetFrame.frame_index}`
      );
    }
  }

  const pairGeneratedBounds = new Map<
    string,
    {
      frameStart: number;
      frameEnd: number;
      localStart: number;
      localEnd: number;
      frameByLocalStep: Map<number, number>;
    } | null
  >();
  pairs.forEach((pair, index) => {
    pairGeneratedBounds.set(pair.pair_id, validatePairGeneratedRows(pair, frames, index));
  });

  temporalEvents.forEach((event, index) => {
    const pair = pairById.get(event.pair_id);
    if (!pair) {
      throw new Error(
        `Invalid phyloMovieData payload: temporal_events[${index}].pair_id must reference pairs`
      );
    }
    if (pair && event.pair_ordinal !== pair.pair_ordinal) {
      throw new Error(
        `Invalid phyloMovieData payload: temporal_events[${index}].pair_ordinal must match pairs`
      );
    }
    validateTemporalEventRange(
      event,
      index,
      pair,
      pairGeneratedBounds.get(event.pair_id) ?? null,
      frames
    );
  });

  const metricByPairId = new Map<string, PhyloMovieData['pair_metrics']['rows'][number]>();
  pairMetricRows.forEach((row, index) => {
    const pair = pairById.get(row.pair_id);
    if (!pair) {
      throw new Error(
        `Invalid phyloMovieData payload: pair_metrics.rows[${index}].pair_id must reference pairs`
      );
    }
    if (metricByPairId.has(row.pair_id)) {
      throw new Error(
        `Invalid phyloMovieData payload: pair_metrics.rows[${index}].pair_id must be unique`
      );
    }
    if (pair && row.pair_ordinal !== pair.pair_ordinal) {
      throw new Error(
        `Invalid phyloMovieData payload: pair_metrics.rows[${index}].pair_ordinal must match ${pair.pair_id} ordinal ${pair.pair_ordinal}`
      );
    }
    metricByPairId.set(row.pair_id, row);
  });

  pairs.forEach((pair) => {
    if (!metricByPairId.has(pair.pair_id)) {
      throw new Error(
        `Invalid phyloMovieData payload: pair_metrics.rows is missing row for ${pair.pair_id}`
      );
    }
  });
}

function frameAdjacencyKey(sourceFrameIndex: number, targetFrameIndex: number): string {
  return `${sourceFrameIndex}->${targetFrameIndex}`;
}

function validatePairGeneratedRows(pair: TimelinePair, frames: TimelineFrame[], pairIndex: number) {
  if (pair.generated_frame_range === null) {
    return null;
  }

  const [frameStart, frameEnd] = pair.generated_frame_range;
  const localSteps: number[] = [];
  for (let frameIndex = frameStart; frameIndex <= frameEnd; frameIndex += 1) {
    const frame = frames[frameIndex];
    if (!frame || frame.pair_id !== pair.pair_id) {
      throw new Error(
        `Invalid phyloMovieData payload: pairs[${pairIndex}].generated_frame_range must reference generated frames for ${pair.pair_id}`
      );
    }
    const localStep = frame.local_step_index;
    if (!Number.isInteger(localStep)) {
      throw new Error(
        `Invalid phyloMovieData payload: frames[${frameIndex}].local_step_index is required for generated pair frame ${pair.pair_id}`
      );
    }
    localSteps.push(localStep as number);
  }

  return {
    frameStart,
    frameEnd,
    localStart: Math.min(...localSteps),
    localEnd: Math.max(...localSteps),
    frameByLocalStep: buildFrameByLocalStep(frames, frameStart, frameEnd),
  };
}

function buildFrameByLocalStep(
  frames: TimelineFrame[],
  frameStart: number,
  frameEnd: number
): Map<number, number> {
  const frameByLocalStep = new Map<number, number>();
  for (let frameIndex = frameStart; frameIndex <= frameEnd; frameIndex += 1) {
    const localStep = frames[frameIndex].local_step_index;
    if (Number.isInteger(localStep)) {
      frameByLocalStep.set(localStep as number, frameIndex);
    }
  }
  return frameByLocalStep;
}

function validateTemporalEventRange(
  event: TemporalEvent,
  index: number,
  pair: TimelinePair | undefined,
  generatedBounds: {
    frameStart: number;
    frameEnd: number;
    localStart: number;
    localEnd: number;
    frameByLocalStep: Map<number, number>;
  } | null,
  frames: TimelineFrame[]
): void {
  if (!pair) return;
  if (generatedBounds === null) {
    throw new Error(
      `Invalid phyloMovieData payload: temporal_events[${index}] cannot exist because ${pair.pair_id} has no generated frames`
    );
  }

  const [eventFrameStart, eventFrameEnd] = event.frame_range;
  if (eventFrameStart < generatedBounds.frameStart || eventFrameEnd > generatedBounds.frameEnd) {
    throw new Error(
      `Invalid phyloMovieData payload: temporal_events[${index}].frame_range must be inside ${pair.pair_id} generated frame range ${generatedBounds.frameStart} -> ${generatedBounds.frameEnd}`
    );
  }

  for (let frameIndex = eventFrameStart; frameIndex <= eventFrameEnd; frameIndex += 1) {
    const frame = frames[frameIndex];
    if (!frame || frame.pair_id !== pair.pair_id || frame.pair_ordinal !== pair.pair_ordinal) {
      throw new Error(
        `Invalid phyloMovieData payload: temporal_events[${index}].frame_range must reference real frames for ${pair.pair_id}`
      );
    }
  }

  const [localStart, localEnd] = event.local_step_range;
  if (localStart < generatedBounds.localStart || localEnd > generatedBounds.localEnd) {
    throw new Error(
      `Invalid phyloMovieData payload: temporal_events[${index}].local_step_range must be inside ${pair.pair_id} local step range ${generatedBounds.localStart} -> ${generatedBounds.localEnd}`
    );
  }

  const expectedFrameStart = generatedBounds.frameByLocalStep.get(localStart);
  const expectedFrameEnd = generatedBounds.frameByLocalStep.get(localEnd);
  if (expectedFrameStart !== eventFrameStart || expectedFrameEnd !== eventFrameEnd) {
    throw new Error(
      `Invalid phyloMovieData payload: temporal_events[${index}].frame_range must match local_step_range rows for ${pair.pair_id}`
    );
  }
}
