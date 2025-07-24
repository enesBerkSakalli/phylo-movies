import { generateLineChart, updateShipPosition } from "./chartGenerator.js";
import { useAppStore } from '../core/store.js';
import { GoToFullTreeDataIndexCommand } from '../core/NavigationCommands.js';

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
        console.warn('[renderOrUpdateLineChart] Data arrays are not initialized.', {
            robinsonFouldsDistances: robinsonFouldsDistances?.length,
            weightedRobinsonFouldsDistances: weightedRobinsonFouldsDistances?.length,
            scaleList: scaleList?.length
        });
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
        // currentTreeIndex is now always the distance index from store.js
        // Convert to full tree sequence index for updatePosition
        if (currentTreeIndex >= 0) {
            const chartDataLength = barOptionValue === "rfd" ? robinsonFouldsDistances.length :
                                   barOptionValue === "w-rfd" ? weightedRobinsonFouldsDistances.length :
                                   scaleList.length;
            if (currentTreeIndex < chartDataLength) {
                // Valid distance index - convert to full tree sequence index
                const fullTreeIndex = transitionResolver.getTreeIndexForDistanceIndex(currentTreeIndex);
                chartState.instance.updatePosition(fullTreeIndex);
            }
            // If index is out of bounds, don't update scrubber
        }
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

    // All chart types use the same mapping functions since they all use distance index
    const chartSpecificIndexToSequence = (chartIdx) => {
        return transitionResolver.getTreeIndexForDistanceIndex(chartIdx);
    };

    const chartSpecificSequenceToIndex = (seqIdx) => {
        return transitionResolver.getDistanceIndex(seqIdx);
    };

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
        yMax = weightedRobinsonFouldsDistances.length > 0 ? Math.max(...weightedRobinsonFouldsDistances) : 0;
        xAccessor = (_, i) => i + 1;
        yAccessor = (d) => d;
        tooltipFormatter = (d, i) => `Transition ${i + 1}<br>Weighted RFD: ${d.toFixed(3)}`;
    } else if (barOptionValue === "scale") {
        chartData = scaleList.map((s) => s.value);
        xLabel = "Sequence Index";
        yLabel = "Scale";
        yMax = scaleList.length > 0 ? Math.max(...scaleList.map((s) => s.value)) : 0;
        xAccessor = (_, i) => i + 1;
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

    // Create navigation callback that converts chart positions to full trees
    const onPositionChange = (chartPosition) => {
        // Use proper navigation command pattern
        const command = new GoToFullTreeDataIndexCommand(chartPosition);
        // Get navigation controller if available, otherwise execute directly
        const { navigationController } = useAppStore.getState();
        if (navigationController) {
            navigationController.execute(command);
        } else {
            command.execute();
        }
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
    const chartStateManager = chartResult.chartStateManager;

    // Add ResizeObserver for responsive chart handling in movie player bar
    const container = document.getElementById(containerId);
    if (container && container.closest('.movie-player-bar')) {
        // Store the chart generation parameters for re-rendering
        container._chartParams = {
            data: chartData,
            config: { xLabel, yLabel, yMax, xAccessor, yAccessor, tooltipFormatter },
            indexMappings: { chartSpecificIndexToSequence, chartSpecificSequenceToIndex }
        };

        // Only add resize observer for charts in movie player bar
        const resizeObserver = new ResizeObserver(() => {
            // Check if container size actually changed
            const rect = container.getBoundingClientRect();
            const currentSize = `${Math.round(rect.width)}x${Math.round(rect.height)}`;

            if (container._lastSize !== currentSize) {
                container._lastSize = currentSize;

                // Debounce resize to avoid excessive re-renders
                clearTimeout(container._resizeTimeout);
                container._resizeTimeout = setTimeout(() => {

                    // Re-render the chart with updated dimensions
                    const newChartResult = generateLineChart(
                        containerId,
                        container._chartParams.data,
                        container._chartParams.config,
                        onPositionChange
                    );
                    const newChartStateManager = newChartResult.chartStateManager;

                    // Restore index mappings
                    newChartStateManager.setIndexMappings(
                        container._chartParams.indexMappings.chartSpecificIndexToSequence,
                        container._chartParams.indexMappings.chartSpecificSequenceToIndex
                    );

                    // Update current position using store - always move to full tree
                    const { currentTreeIndex } = useAppStore.getState();
                    const fullTreePosition = transitionResolver.getTreeIndexForDistanceIndex(currentTreeIndex);
                    newChartResult.updatePosition(fullTreePosition);
                }, 200); // Increased debounce for better performance
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

            // Get the chart container
            const container = document.getElementById(containerId);
            if (!container) {
                console.warn(`[lineChartManager] Container not found: ${containerId}`);
                return;
            }

            // Get scales from chartStateManager if available
            const { xScale, yScale } = chartStateManager.scales;
            if (!xScale || !yScale) {
                console.warn(`[lineChartManager] Scales not available for container ${containerId}`);
                return;
            }

            // Create config object for the indicator
            const config = {
                xAccessor,
                yAccessor
            };

            // Use the centralized updateShipPosition function with navigation callback
            updateShipPosition(
                newChartPosition,
                { xScale, yScale },
                config,
                chartData,
                containerId,
                onPositionChange
            );
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
