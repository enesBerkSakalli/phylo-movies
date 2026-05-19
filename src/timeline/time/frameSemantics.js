function getFrameMetadata(treeMetadata, frameIndex) {
  if (!Array.isArray(treeMetadata) || !Number.isInteger(frameIndex)) return null;
  return treeMetadata[frameIndex] ?? null;
}

function isInputFrame(treeMetadata, frameIndex) {
  const metadata = getFrameMetadata(treeMetadata, frameIndex);
  if (!metadata) return false;
  if (metadata.frame_type === 'input_tree') return true;
  return false;
}

export function getSourceFrameIndexForFrameIndex(treeMetadata, frameIndex) {
  if (!Array.isArray(treeMetadata) || !Number.isInteger(frameIndex)) return null;
  if (isInputFrame(treeMetadata, frameIndex)) return frameIndex;

  const metadata = getFrameMetadata(treeMetadata, frameIndex);
  const sourceFrameIndex = metadata?.source_tree_global_index;
  if (!Number.isInteger(sourceFrameIndex)) return null;
  return isInputFrame(treeMetadata, sourceFrameIndex) ? sourceFrameIndex : null;
}
