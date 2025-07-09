/**
 * Unified callback interface for chart interactions
 */
export class ChartCallbackManager {
  constructor(callbacks = {}) {
    this.onPositionChange = callbacks.onPositionChange || (() => {});
    this.onDragStart = callbacks.onDragStart || (() => {});
    this.onDragEnd = callbacks.onDragEnd || (() => {});
    this.onPointClick = callbacks.onPointClick || (() => {});
  }

  // Map chart index to sequence index using provided mapping function
  mapToSequenceIndex(chartIndex, mappingFunction) {
    return mappingFunction ? mappingFunction(chartIndex) : chartIndex;
  }

  // Map sequence index to chart index using provided mapping function
  mapToChartIndex(sequenceIndex, mappingFunction) {
    return mappingFunction ? mappingFunction(sequenceIndex) : sequenceIndex;
  }
}
