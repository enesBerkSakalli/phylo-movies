import { generateChartModal, ChartCallbackManager } from "./chartGenerator.js";

// Open a robust, feature-rich modal chart using WinBox and advanced chart logic
export function openModalChart(options) {
  // Remove any existing chart WinBox modal (not MSA viewer)
  const existing = document.querySelector('.winbox[data-chart="true"]');
  if (existing) existing.remove();

  const {
    barOptionValue,
    currentTreeIndex,
    robinsonFouldsDistances,
    weightedRobinsonFouldsDistances,
    scaleList,
    transitionResolver,
    onGoToFullTreeDataIndex,
    onGoToPosition,
    guiInstance // Pass the GUI instance for event/state sync
  } = options;

  let data, xLabel, yLabel, yMax, onClickHandler, chartSpecificIndexToSequence, chartSpecificSequenceToIndex, chartTitle;
  if (barOptionValue === "rfd") {
    data = robinsonFouldsDistances;
    xLabel = "Transition Index";
    yLabel = "Relative RFD";
    yMax = 1;
    onClickHandler = onGoToFullTreeDataIndex;
    chartSpecificIndexToSequence = (idx) => transitionResolver.getTreeIndexForDistanceIndex(idx);
    chartSpecificSequenceToIndex = (idx) => transitionResolver.getDistanceIndex(idx);
    chartTitle = "Relative Robinson-Foulds Distance";
  } else if (barOptionValue === "w-rfd") {
    data = weightedRobinsonFouldsDistances;
    xLabel = "Transition Index";
    yLabel = "Weighted RFD";
    yMax = weightedRobinsonFouldsDistances.length > 0 ? Math.max(...weightedRobinsonFouldsDistances) : 0;
    onClickHandler = onGoToFullTreeDataIndex;
    chartSpecificIndexToSequence = (idx) => transitionResolver.getTreeIndexForDistanceIndex(idx);
    chartSpecificSequenceToIndex = (idx) => transitionResolver.getDistanceIndex(idx);
    chartTitle = "Weighted Robinson-Foulds Distance";
  } else if (barOptionValue === "scale") {
    data = scaleList.map((s) => s.value);
    xLabel = "Sequence Index";
    yLabel = "Scale";
    yMax = scaleList.length > 0 ? Math.max(...scaleList.map((s) => s.value)) : 0;
    onClickHandler = onGoToPosition;
    chartSpecificIndexToSequence = (idx) => idx;
    chartSpecificSequenceToIndex = (idx) => idx;
    chartTitle = "Scale Value";
  } else {
    data = [];
    xLabel = "Index";
    yLabel = "Value";
    yMax = 0;
    onClickHandler = () => {};
    chartSpecificIndexToSequence = (idx) => idx;
    chartSpecificSequenceToIndex = (idx) => idx;
    chartTitle = "Chart";
  }

  if (!data || data.length === 0) {
    alert(`No data for ${barOptionValue} chart.`);
    return;
  }

  // Prepare config for generateChartModal
  const config = {
    xLabel,
    yLabel,
    yMax,
    title: chartTitle,
    xAccessor: (d, i) => i + 1,
    yAccessor: (d) => d,
    tooltipFormatter: (d, i) => `<div class='tooltip-title'>Position ${i + 1}</div><div class='tooltip-value'>Value: ${typeof d === 'number' ? d.toFixed(4) : d}</div>`
  };

  // Set the current position for the indicator (sequence index)
  let currentPosition = (barOptionValue === "scale")
    ? currentTreeIndex
    : transitionResolver.getDistanceIndex(currentTreeIndex);

  // Create unified callback manager for consistent behavior
  const callbackManager = new ChartCallbackManager({
    onPositionChange: (chartIdx) => {
      const seqIdx = chartSpecificIndexToSequence(chartIdx);
      if (barOptionValue === "scale" && typeof onGoToPosition === 'function') {
        onGoToPosition(seqIdx);
      } else if (typeof onGoToFullTreeDataIndex === 'function') {
        onGoToFullTreeDataIndex(seqIdx);
      }
    }
  });

  // Attach currentPosition to guiInstance for chartGenerator.js logic
  if (guiInstance) {
    guiInstance.currentPosition = currentPosition;
    guiInstance.callbackManager = callbackManager;
  }

  // Render the modal chart using the robust WinBox-based modal
  generateChartModal(
    data,
    guiInstance || {
      currentPosition,
      goToPosition: (idx) => {
        // Fallback: call the provided handler if guiInstance is not passed
        if (barOptionValue === "scale" && typeof onGoToPosition === 'function') onGoToPosition(idx);
        else if (typeof onGoToFullTreeDataIndex === 'function') onGoToFullTreeDataIndex(idx);
      },
      barOptionValue,
      robinsonFouldsDistances,
      weightedRobinsonFouldsDistances,
      scaleList,
      transitionResolver
    },
    config
  );
}
