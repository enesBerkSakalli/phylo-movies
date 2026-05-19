import { getSourceFrameIndexForFrameIndex } from '../../../timeline/time/frameSemantics.js';
import { selectFrameIndex } from './selectFrameIndex.js';

export const selectActiveSourceFrameIndex = (state) => {
  const frameIndex = selectFrameIndex(state);
  const metadataSourceFrameIndex = getSourceFrameIndexForFrameIndex(state.treeMetadata, frameIndex);
  if (Number.isInteger(metadataSourceFrameIndex)) return metadataSourceFrameIndex;

  const resolverSourceFrameIndex = state.transitionResolver?.getSourceGlobalIndex?.(frameIndex);
  if (Number.isInteger(resolverSourceFrameIndex) && isKnownFrameIndex(state.treeMetadata, resolverSourceFrameIndex)) {
    return resolverSourceFrameIndex;
  }

  return frameIndex;
};

function isKnownFrameIndex(treeMetadata, frameIndex) {
  return Array.isArray(treeMetadata) && frameIndex >= 0 && frameIndex < treeMetadata.length;
}
