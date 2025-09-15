import { generateLineChart } from "./chartGenerator.js";
import { useAppStore } from "../core/store.js";

/**
 * Unified chart rendering for phylo-movies line charts using chartGenerator.js.
 * Handles RFD, W-RFD, and Scale charts, including index mapping and callbacks.
 *
 * @param {Object} params
 *   - data: { robinsonFouldsDistances, weightedRobinsonFouldsDistances, scaleList }
 *   - config: { barOptionValue, currentTreeIndex, stickyChartPositionIfAvailable }
 *   - services: { transitionResolver }
 *   - chartState: { instance, type }
 *   - callbacks: { onGoToPosition, onHandleDrag, onGoToFullTreeDataIndex }
 *   - containerId: string
 * @returns {Object} Updated chartState
 */
export function renderOrUpdateLineChart({ data, config, services, chartState, callbacks, containerId }) {
    console.log('*** lineChartManager: renderOrUpdateLineChart called ***');
    const { robinsonFouldsDistances, weightedRobinsonFouldsDistances, scaleList } = data;
    const { barOptionValue, currentTreeIndex } = config;
    const { transitionResolver } = services;

    // Prepare chart data and config for chartGenerator.js
    let chartData, xLabel, yLabel, yMax, xAccessor, yAccessor, tooltipFormatter;
    if (barOptionValue === "rfd") {
        chartData = robinsonFouldsDistances;
        xLabel = "Transition Index";
        yLabel = "Relative RFD";
        yMax = 1;
        xAccessor = (_, i) => i + 1;
        yAccessor = (d) => d;
        tooltipFormatter = (d, i) => `Transition ${i + 1}<br>RFD: ${d.toFixed(3)}`;
    } else if (barOptionValue === "w-rfd") {
        chartData = weightedRobinsonFouldsDistances;
        xLabel = "Transition Index";
        yLabel = "Weighted RFD";
        yMax = Math.max(...weightedRobinsonFouldsDistances);
        xAccessor = (_, i) => i + 1;
        yAccessor = (d) => d;
        tooltipFormatter = (d, i) => `Transition ${i + 1}<br>Weighted RFD: ${d.toFixed(3)}`;
    } else if (barOptionValue === "scale") {
        chartData = scaleList.map((s) => s.value);
        xLabel = "Sequence Index";
        yLabel = "Scale";
        yMax = Math.max(...scaleList.map((s) => s.value));
        xAccessor = (_, i) => i + 1;
        yAccessor = (d) => d;
        tooltipFormatter = (d, i) => `Sequence ${i + 1}<br>Scale: ${d.toFixed(3)}`;
    }

    const onPositionChange = (chartPosition) => {
        callbacks.onGoToPosition(transitionResolver.getTreeIndexForDistanceIndex(chartPosition));
    };

    // Render the chart using chartGenerator.js with navigation callback
    const chartResult = generateLineChart(
        containerId,
        chartData,
        {
            xLabel,
            yLabel,
            yMax,
            xAccessor,
            yAccessor,
            tooltipFormatter
        },
        onPositionChange
    );

    chartState.instance = {
        updatePosition: (treeIndex) => {
            // THE FIX: Get the latest state directly from the store inside the function.
            // This avoids the stale closure problem where barOptionValue and transitionResolver
            // would be from the time the chart was first created.
            const { barOptionValue, transitionResolver } = useAppStore.getState();

            console.log('=== lineChartManager: updatePosition START ===');
            console.log('position:', treeIndex, 'current barOptionValue:', barOptionValue);

            // Resolve the tree index to the correct chart-specific index
            let chartIndex;
            if (barOptionValue === "rfd" || barOptionValue === "w-rfd") {
                // For RFD charts, we need the distance index (transition index)
                chartIndex = transitionResolver.getSourceTreeIndex(treeIndex);
            } else {
                // For the scale chart, the tree index is the sequence index
                chartIndex = treeIndex;
            }

            if (chartResult?.updatePositionChartIndex) {
                console.log('Calling chartResult.updatePositionChartIndex with chartIndex:', chartIndex);
                chartResult.updatePositionChartIndex(chartIndex);
            } else {
                console.error('chartResult.updatePositionChartIndex is missing!');
            }
            console.log('=== lineChartManager: updatePosition END ===');
        },
        destroy: () => {
            if (chartResult && typeof chartResult.destroy === 'function') {
                chartResult.destroy();
            }
        }
    };
    chartState.type = barOptionValue;
    return chartState;
}
