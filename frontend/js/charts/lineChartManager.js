import * as d3 from "d3";
import { generateLineChart, updateChartIndicator, ChartCallbackManager, ChartStateManager } from "./chartGenerator.js";

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
    const { robinsonFouldsDistances, weightedRobinsonFouldsDistances, scaleList } = data;
    const { barOptionValue, currentTreeIndex } = config;
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

    // Check if we can update existing chart instead of re-rendering
    if (chartState.instance && chartState.type === barOptionValue) {
        // Only update the position indicator, don't re-render the entire chart
        // Note: currentTreeIndex here is the chart-specific index, but updatePosition expects sequence index
        // We need to map it back to sequence index first
        let sequenceIndex;
        if (barOptionValue === "scale") {
            // For scale charts, chart index = sequence index
            sequenceIndex = currentTreeIndex;
        } else {
            // For RFD/W-RFD charts, we need to map from transition index back to sequence index
            sequenceIndex = transitionResolver.getTreeIndexForDistanceIndex(currentTreeIndex);
        }
        chartState.instance.updatePosition(sequenceIndex);
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

    // --- Unified transition index mapping for all chart types ---
    if (!transitionResolver) {
        console.warn('[renderOrUpdateLineChart] TransitionIndexResolver not provided.');
        return chartState;
    }

    // Determine indicator position and mapping logic
    let determinedCurrentChartPosition;
    let chartSpecificIndexToSequence, chartSpecificSequenceToIndex;

    if (barOptionValue === "scale") {
        // For scale charts: direct 1:1 mapping between chart index and sequence index
        determinedCurrentChartPosition = currentTreeIndex;
        chartSpecificIndexToSequence = (chartIdx) => chartIdx;
        chartSpecificSequenceToIndex = (seqIdx) => seqIdx;
    } else {
        // For RFD/W-RFD charts: chart index = transition index, need to map to full tree indices
        determinedCurrentChartPosition = transitionResolver.getDistanceIndex(currentTreeIndex);

        // Map from chart index (transition index) to sequence index (full tree index)
        chartSpecificIndexToSequence = (chartIdx) => {
            return transitionResolver.getTreeIndexForDistanceIndex(chartIdx);
        };

        // Map from sequence index to chart index (transition index)
        chartSpecificSequenceToIndex = (seqIdx) => {
            return transitionResolver.getDistanceIndex(seqIdx);
        };
    }

    // Prepare chart data and config for chartGenerator.js
    let chartData, xLabel, yLabel, yMax, xAccessor, yAccessor, tooltipFormatter;
    if (barOptionValue === "rfd") {
        chartData = robinsonFouldsDistances;
        xLabel = "Transition Index";
        yLabel = "Relative RFD";
        yMax = 1;
        xAccessor = (d, i) => i + 1;
        yAccessor = (d) => d;
        tooltipFormatter = (d, i) => `Transition ${i + 1}<br>RFD: ${d.toFixed(3)}`;
    } else if (barOptionValue === "w-rfd") {
        chartData = weightedRobinsonFouldsDistances;
        xLabel = "Transition Index";
        yLabel = "Weighted RFD";
        yMax = weightedRobinsonFouldsDistances.length > 0 ? Math.max(...weightedRobinsonFouldsDistances) : 0;
        xAccessor = (d, i) => i + 1;
        yAccessor = (d) => d;
        tooltipFormatter = (d, i) => `Transition ${i + 1}<br>Weighted RFD: ${d.toFixed(3)}`;
    } else if (barOptionValue === "scale") {
        chartData = scaleList.map((s) => s.value);
        xLabel = "Sequence Index";
        yLabel = "Scale";
        yMax = scaleList.length > 0 ? Math.max(...scaleList.map((s) => s.value)) : 0;
        xAccessor = (d, i) => i + 1;
        yAccessor = (d) => d;
        tooltipFormatter = (d, i) => `Sequence ${i + 1}<br>Scale: ${d.toFixed(3)}`;
    } else {
        // Unknown chart type
        const chartContainer = document.getElementById(containerId);
        if (chartContainer) chartContainer.innerHTML = `<p>No data for ${barOptionValue} chart.</p>`;
        if (chartState.instance && chartState.instance.destroy) {
            chartState.instance.destroy();
        }
        chartState.instance = null;
        chartState.type = barOptionValue;
        return chartState;
    }

    // Prepare a guiInstance-like object for chartGenerator.js (for indicator/ship, drag/click, etc.)
    const guiInstance = {
        currentPosition: determinedCurrentChartPosition,
        goToPosition: (chartIdx) => {
            // Map chart index back to sequence index for GUI
            const seqIdx = chartSpecificIndexToSequence(chartIdx);
            if (typeof callbacks.onGoToPosition === 'function') {
                callbacks.onGoToPosition(seqIdx);
            }
        }
    };

    // Render the chart using chartGenerator.js
    const chartStateManager = generateLineChart(
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
        guiInstance
    );

    // Set up index mappings on the chart state manager
    chartStateManager.setIndexMappings(chartSpecificIndexToSequence, chartSpecificSequenceToIndex);

    chartState.instance = {
        updatePosition: (newSequencePosition) => {
            // Map sequence position to chart position for the indicator
            const newChartPosition = chartSpecificSequenceToIndex(newSequencePosition);
            guiInstance.currentPosition = newChartPosition;

            // Store the current values for direct update
            const currentConfig = {
                xAccessor,
                yAccessor
            };

            // Check if chart exists and has been rendered
            const container = document.getElementById(containerId);
            const svg = container ? d3.select(container).select("svg").select("g") : null;

            if (!svg || svg.empty()) {
                console.warn(`[lineChartManager] Chart not found for container ${containerId}`);
                return;
            }

            // Get scales from chartStateManager if available, fallback to SVG properties
            let xScale, yScale;
            if (chartStateManager.scales) {
                xScale = chartStateManager.scales.xScale;
                yScale = chartStateManager.scales.yScale;
            } else {
                xScale = svg.property('__xScale');
                yScale = svg.property('__yScale');
            }

            if (!xScale || !yScale) {
                console.warn(`[lineChartManager] Scales not available for container ${containerId}`);
                return;
            }

            // Validate position bounds
            const validPosition = Math.max(0, Math.min(chartData.length - 1, newChartPosition));

            // Look for ship group
            let shipGroup = svg.select("#ship-modal-group");
            if (shipGroup.empty()) {
                shipGroup = svg.select(".ship-indicator-group");
            }

            if (shipGroup.empty()) {
                console.warn(`[lineChartManager] Ship group not found in container ${containerId}`);
                return;
            }

            // Update ship position directly
            const shipX = xScale(currentConfig.xAccessor(chartData[validPosition], validPosition));
            const height = yScale.range()[0];

            shipGroup.select(".ship-touch-target").attr("x", shipX - 15);
            shipGroup.select(".ship-line").attr("x1", shipX).attr("x2", shipX);
            shipGroup.select(".ship-handle").attr("cx", shipX);
            shipGroup.select(".handle-value")
                .attr("x", shipX)
                .text(currentConfig.yAccessor(chartData[validPosition]).toFixed(3));
            shipGroup.select(".current-position-label")
                .attr("x", shipX)
                .text(`${validPosition + 1}`);

            // Update data points highlighting
            svg.selectAll(".data-points circle").attr("fill", "#4390e1").attr("r", 4);
            svg.selectAll(".data-points circle")
                .filter((d, i) => i === validPosition)
                .attr("fill", "#FF4500").attr("r", 6);
        },
        destroy: () => {
            chartStateManager.destroy();
        }
    };
    chartState.type = barOptionValue;
    return chartState;
}
