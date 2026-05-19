import { getSourceFrameIndexForFrameIndex } from '../time/frameSemantics.js';

export function buildTimelineFrameRows(movieData) {
    const treeMetadata = Array.isArray(movieData?.tree_metadata)
        ? movieData.tree_metadata
        : [];
    const inputTreeIndexByFrame = buildInputTreeIndexByFrame(movieData, treeMetadata);

    return treeMetadata.map((metadata, frameIndex) => {
        const sourceFrameIndex = getSourceFrameIndexForFrameIndex(treeMetadata, frameIndex);
        const resolvedSourceFrameIndex = Number.isInteger(sourceFrameIndex)
            ? sourceFrameIndex
            : null;
        const inputTreeIndex = Number.isInteger(resolvedSourceFrameIndex)
            ? inputTreeIndexByFrame.get(resolvedSourceFrameIndex) ?? null
            : null;
        if (Number.isInteger(resolvedSourceFrameIndex) && !Number.isInteger(inputTreeIndex)) {
            throw new Error('[TimelineFrameRows] split_change_timeline original entry is required for input tree frames');
        }

        return {
            frameIndex,
            inputTreeIndex,
            sourceFrameIndex: resolvedSourceFrameIndex,
            msaWindowIndex: inputTreeIndex,
            frameType: metadata?.frame_type ?? null,
            stateSemantics: metadata?.state_semantics ?? null,
            isObservedInput: metadata?.is_observed_input === true,
            pairKey: metadata?.tree_pair_key ?? null,
            pairStepIndex: Number.isInteger(metadata?.step_in_pair)
                ? metadata.step_in_pair
                : null,
        };
    });
}

function buildInputTreeIndexByFrame(movieData, treeMetadata) {
    const indexByFrame = new Map();
    const timeline = Array.isArray(movieData?.split_change_timeline)
        ? movieData.split_change_timeline
        : [];

    for (const entry of timeline) {
        if (
            entry?.type === 'original' &&
            Number.isInteger(entry.global_index) &&
            Number.isInteger(entry.tree_index)
        ) {
            indexByFrame.set(entry.global_index, entry.tree_index);
        }
    }

    for (let frameIndex = 0; frameIndex < treeMetadata.length; frameIndex++) {
        if (!isInputFrame(treeMetadata[frameIndex])) continue;
        if (!indexByFrame.has(frameIndex)) {
            throw new Error('[TimelineFrameRows] split_change_timeline original entry is required for input tree frames');
        }
    }

    return indexByFrame;
}

function isInputFrame(metadata) {
    if (!metadata) return false;
    if (metadata.frame_type === 'input_tree') return true;
    return false;
}
