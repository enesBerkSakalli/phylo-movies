import * as d3 from "d3";
import { generateLineChart } from "./chartGenerator.js";

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
        // currentTreeIndex here is already the chart-specific index from getChartTreeIndex()
        // For scale charts: currentTreeIndex = sequence index
        // For RFD/W-RFD charts: currentTreeIndex = transition index
        // We need to convert to sequence index for updatePosition
        let sequenceIndex;
        if (barOptionValue === "scale") {
            // For scale charts, chart index = sequence index
            sequenceIndex = currentTreeIndex;
        } else {
            // For RFD/W-RFD charts, handle different cases
            if (currentTreeIndex >= 0) {
                // If we have a valid transition index, convert it to sequence index
                const chartDataLength = barOptionValue === "rfd" ? robinsonFouldsDistances.length : weightedRobinsonFouldsDistances.length;
                if (currentTreeIndex < chartDataLength) {
                    // Valid transition index - convert to sequence index
                    sequenceIndex = transitionResolver.getTreeIndexForDistanceIndex(currentTreeIndex);
                } else {
                    // Transition index is out of bounds - don't update scrubber
                    return chartState;
                }
            } else {
                // Invalid transition index (e.g., -1) - don't update scrubber to prevent jumping
                return chartState;
            }
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
    }    // Prepare a guiInstance-like object for chartGenerator.js (for indicator/ship, drag/click, etc.)
    const guiInstance = {
        currentPosition: determinedCurrentChartPosition,
        goToPosition: (chartIdx) => {
            // Map chart index back to sequence index for GUI
            let targetSequenceIndex;

            if (barOptionValue === "scale") {
                // For scale charts: direct 1:1 mapping
                targetSequenceIndex = chartIdx;
            } else {
                // For RFD/W-RFD charts: map from chart index (transition index) to full tree sequence index
                // Chart index represents a transition, so we want the target full tree of that transition
                targetSequenceIndex = transitionResolver.getTreeIndexForDistanceIndex(chartIdx);
            }

            if (typeof callbacks.onGoToPosition === 'function') {
                // Call async callback but don't await to avoid blocking chart updates
                Promise.resolve(callbacks.onGoToPosition(targetSequenceIndex)).catch(error => {
                    console.error('[lineChartManager] Error in onGoToPosition callback:', error);
                });
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

    // Add ResizeObserver for responsive chart handling in movie player bar
    const container = document.getElementById(containerId);
    if (container && container.closest('.movie-player-bar')) {
        // Store the chart generation parameters for re-rendering
        container._chartParams = {
            data: chartData,
            config: { xLabel, yLabel, yMax, xAccessor, yAccessor, tooltipFormatter },
            guiInstance: guiInstance,
            indexMappings: { chartSpecificIndexToSequence, chartSpecificSequenceToIndex }
        };

        // Only add resize observer for charts in movie player bar
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                // Check if container size actually changed
                const rect = container.getBoundingClientRect();
                const currentSize = `${Math.round(rect.width)}x${Math.round(rect.height)}`;

                if (container._lastSize !== currentSize) {
                    container._lastSize = currentSize;

                    // Debounce resize to avoid excessive re-renders
                    clearTimeout(container._resizeTimeout);
                    container._resizeTimeout = setTimeout(() => {
                        console.log(`[lineChartManager] Container ${containerId} resized to ${currentSize}, re-rendering chart`);

                        // Re-render the chart with updated dimensions
                        const newChartStateManager = generateLineChart(
                            containerId,
                            container._chartParams.data,
                            container._chartParams.config,
                            container._chartParams.guiInstance
                        );

                        // Restore index mappings
                        newChartStateManager.setIndexMappings(
                            container._chartParams.indexMappings.chartSpecificIndexToSequence,
                            container._chartParams.indexMappings.chartSpecificSequenceToIndex
                        );

                        // Update current position if set
                        if (container._chartParams.guiInstance &&
                            typeof container._chartParams.guiInstance.currentPosition === 'number') {
                            const sequencePosition = container._chartParams.indexMappings.chartSpecificIndexToSequence(
                                container._chartParams.guiInstance.currentPosition
                            );
                            newChartStateManager.updatePosition(sequencePosition);
                        }
                    }, 200); // Increased debounce for better performance
                }
            }
        });

        resizeObserver.observe(container);

        // Store observer for cleanup
        container._resizeObserver = resizeObserver;

        // Initialize size tracking
        const rect = container.getBoundingClientRect();
        container._lastSize = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
    }

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

            // Get scales from chartStateManager if available
            const { xScale, yScale } = chartStateManager.scales;

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
            // Clean up ResizeObserver and stored chart parameters
            const container = document.getElementById(containerId);
            if (container) {
                if (container._resizeObserver) {
                    container._resizeObserver.disconnect();
                    container._resizeObserver = null;
                }
                if (container._resizeTimeout) {
                    clearTimeout(container._resizeTimeout);
                    container._resizeTimeout = null;
                }
                // Clean up stored chart parameters
                container._chartParams = null;
                container._lastSize = null;
            }

            chartStateManager.destroy();
        }
    };
    chartState.type = barOptionValue;
    return chartState;
}
