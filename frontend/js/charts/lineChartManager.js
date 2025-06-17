import * as d3 from "d3";
import { generateDistanceChart } from "./distanceChart.js";

/**
 * Modular chart rendering for phylo-movies line charts.
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
    const { robinsonFouldsDistances, weightedRobinsonFouldsDistances, scaleList } = data;
    const { barOptionValue, currentTreeIndex, stickyChartPositionIfAvailable } = config;
    const { transitionResolver } = services;

    // Fallback for empty data to prevent errors
    if (!robinsonFouldsDistances || !weightedRobinsonFouldsDistances || !scaleList) {
        console.warn('[renderOrUpdateLineChart] Data arrays are not initialized.');
        return chartState;
    }

    if (robinsonFouldsDistances.length === 0 && scaleList.length === 0) {
        // No data to plot, clear chart area or show message
        const chartContainer = document.getElementById(containerId);
        if (chartContainer) chartContainer.innerHTML = '<p>No chart data available.</p>';
        if (chartState.instance && chartState.instance.destroy) {
            chartState.instance.destroy();
        }
        chartState.instance = null;
        chartState.type = null;
        return chartState;
    }

    // Handle case where only one RFD value exists (no line chart to plot)
    if (barOptionValue !== "scale" && robinsonFouldsDistances.length === 1) {
        const chartContainer = document.getElementById(containerId);
        if (chartContainer) {
            let scaleValueText = "N/A";
            if (scaleList && scaleList[currentTreeIndex] && typeof scaleList[currentTreeIndex].value !== 'undefined') {
                scaleValueText = scaleList[currentTreeIndex].value.toFixed(3);
            } else if (scaleList && scaleList.length > 0 && typeof scaleList[0].value !== 'undefined' && currentTreeIndex === 0) {
                scaleValueText = scaleList[0].value.toFixed(3);
            }
            chartContainer.innerHTML = `
                <p>Relative Robinson-Foulds Distance: ${robinsonFouldsDistances[0]}</p>
                <p>Scale: ${scaleValueText}</p>
            `;
        }
        if (chartState.instance && chartState.instance.destroy) {
            chartState.instance.destroy();
        }
        chartState.instance = null;
        chartState.type = barOptionValue;
        return chartState;
    }

    const chartConfigurations = {
        rfd: {
            data: robinsonFouldsDistances,
            xLabel: "Transition Index",
            yLabel: "Relative RFD",
            yMax: 1,
        },
        "w-rfd": {
            data: weightedRobinsonFouldsDistances,
            xLabel: "Transition Index",
            yLabel: "Weighted RFD",
            yMax: weightedRobinsonFouldsDistances.length > 0 ? d3.max(weightedRobinsonFouldsDistances) : 0,
        },
        scale: {
            data: scaleList.map((s) => s.value),
            xLabel: "Sequence Index",
            yLabel: "Scale",
            yMax: scaleList.length > 0 ? d3.max(scaleList, (s) => s.value) : 0,
        },
    };

    const chartConfig = chartConfigurations[barOptionValue];

    if (!chartConfig || chartConfig.data.length === 0) {
        console.warn(`[renderOrUpdateLineChart] Invalid barOptionValue or empty data for: ${barOptionValue}`);
        const chartContainer = document.getElementById(containerId);
        if (chartContainer) chartContainer.innerHTML = `<p>No data for ${barOptionValue} chart.</p>`;
        if (chartState.instance && chartState.instance.destroy) {
            chartState.instance.destroy();
        }
        chartState.instance = null;
        chartState.type = barOptionValue;
        return chartState;
    }

    let determinedCurrentChartPosition;
    let onClickHandler;
    let onDragHandler;
    let chartSpecificIndexToSequence = (idx) => idx;
    let chartSpecificSequenceToIndex = (idx) => idx;

    if (!transitionResolver) {
        console.warn('[renderOrUpdateLineChart] TransitionIndexResolver not provided.');
        return chartState;
    }

    if (barOptionValue === "scale") {
        determinedCurrentChartPosition = currentTreeIndex;
        chartSpecificIndexToSequence = (chartIdx) => chartIdx;
        chartSpecificSequenceToIndex = (seqIdx) => seqIdx;
        onClickHandler = (chartIdx) => callbacks.onGoToPosition(chartIdx);
        onDragHandler = (chartIdx) => callbacks.onHandleDrag(chartIdx);
    } else {
        if (stickyChartPositionIfAvailable !== undefined) {
            determinedCurrentChartPosition = stickyChartPositionIfAvailable;
        } else {
            determinedCurrentChartPosition = transitionResolver.getDistanceIndex(currentTreeIndex);
        }
        if (determinedCurrentChartPosition < 0 || determinedCurrentChartPosition >= chartConfig.data.length) {
            determinedCurrentChartPosition = Math.max(0, Math.min(determinedCurrentChartPosition, chartConfig.data.length - 1));
            if (chartConfig.data.length === 0) determinedCurrentChartPosition = 0;
        }
        chartSpecificIndexToSequence = (chartIdx) => transitionResolver.getTreeIndexForDistanceIndex(chartIdx);
        chartSpecificSequenceToIndex = (seqIdx) => transitionResolver.getDistanceIndex(seqIdx);
        onClickHandler = (chartIdx) => callbacks.onGoToFullTreeDataIndex(chartIdx);
        onDragHandler = (chartIdx) => callbacks.onGoToFullTreeDataIndex(chartIdx);
    }

    const needsNewChart = !chartState.instance || !chartState.type || chartState.type !== barOptionValue;

    if (needsNewChart) {
        if (chartState.instance && chartState.instance.destroy) {
            chartState.instance.destroy();
        }
        d3.select(`#${containerId} svg`).remove();
        if (chartConfig.data.length > 0) {
            chartState.instance = generateDistanceChart(
                { containerId },
                chartConfig.data,
                {
                    xLabel: chartConfig.xLabel,
                    yLabel: chartConfig.yLabel,
                    yMax: chartConfig.yMax,
                    currentPosition: determinedCurrentChartPosition,
                    onClick: onClickHandler,
                    onDrag: onDragHandler,
                    indexToSequence: chartSpecificIndexToSequence,
                    sequenceToIndex: chartSpecificSequenceToIndex,
                }
            );
        } else {
            chartState.instance = null;
        }
        chartState.type = barOptionValue;
    } else {
        if (chartState.instance && chartState.instance.updatePosition) {
            if (chartConfig.data.length > 0) {
                chartState.instance.updatePosition(determinedCurrentChartPosition);
            }
        } else if (chartConfig.data.length > 0 && !chartState.instance) {
            d3.select(`#${containerId} svg`).remove();
            chartState.instance = generateDistanceChart(
                { containerId },
                chartConfig.data,
                {
                    xLabel: chartConfig.xLabel,
                    yLabel: chartConfig.yLabel,
                    yMax: chartConfig.yMax,
                    currentPosition: determinedCurrentChartPosition,
                    onClick: onClickHandler,
                    onDrag: onDragHandler,
                    indexToSequence: chartSpecificIndexToSequence,
                    sequenceToIndex: chartSpecificSequenceToIndex,
                }
            );
            chartState.type = barOptionValue;
        }
    }
    return chartState;
}
