import { useAppStore } from '../../core/store.js';

/**
 * Resolves rendering options by merging provided options with store state
 * Provides a unified way to access store state with option overrides
 * @param {Object} options - User-provided options that can override store defaults
 * @returns {Object} Resolved options with store state as fallbacks
 */
export function resolveRenderingOptions(options = {}) {
  const storeState = useAppStore.getState();

  return {
    markedComponents: options.markedComponents || storeState.markedComponents || [],
    updateColorManagerAction: options.updateColorManagerAction || storeState.updateColorManagerHighlight || null,
    previousTreeIndex: options.previousTreeIndex !== undefined
      ? options.previousTreeIndex
      : storeState.currentTreeIndex - 1,
    getLayoutCache: options.getLayoutCache || storeState.getLayoutCache || null,
    latticeEdges: options.latticeEdges || storeState.latticeEdges || [],
    storeState // Include full store state for additional access if needed
  };
}
