import { generateLineChart, generateChartModal } from "./chartGenerator.js";
import { updateChartIndicator } from "./ChartStateManager.js";
import { ChartStateManager } from "./ChartStateManager.js";
import { useAppStore } from '../core/store.js';
import { GoToPositionCommand } from '../core/NavigationCommands.js';

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
    onGoToPosition
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


  // Create a context object for the chart that provides store access
  const chartContext = {
    getCurrentPosition: () => {
      const { currentTreeIndex } = useAppStore.getState();
      return (barOptionValue === "scale")
        ? currentTreeIndex
        : transitionResolver.getDistanceIndex(currentTreeIndex);
    },
    goToPosition: (idx) => {
      const command = new GoToPositionCommand(barOptionValue === "scale" ? idx : transitionResolver.getTreeIndexForDistanceIndex(idx));
      const { navigationController } = useAppStore.getState();
      if (navigationController) {
        navigationController.execute(command);
      } else {
        command.execute();
      }
    },
    // Keep these for compatibility during migration
    barOptionValue,
    robinsonFouldsDistances,
    weightedRobinsonFouldsDistances,
    scaleList,
    transitionResolver
  };

  // Render the modal chart using the robust WinBox-based modal
  generateChartModal(
    data,
    chartContext,
    config
  );
}
