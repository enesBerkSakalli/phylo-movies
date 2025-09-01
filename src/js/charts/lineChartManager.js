import { generateLineChart, updateShipPosition } from "./chartGenerator.js";
import { useAppStore } from '../core/store.js';

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
    
    console.log('[lineChartManager] Rendering chart with type:', barOptionValue, 'at index:', currentTreeIndex);

    // Validate only the dataset required for the selected chart type
    const hasRFD = Array.isArray(robinsonFouldsDistances) && robinsonFouldsDistances.length > 0;
    const hasWRFD = Array.isArray(weightedRobinsonFouldsDistances) && weightedRobinsonFouldsDistances.length > 0;
    const hasScale = Array.isArray(scaleList) && scaleList.length > 0;

    const datasetOk =
        (barOptionValue === 'rfd' && hasRFD) ||
        (barOptionValue === 'w-rfd' && hasWRFD) ||
        (barOptionValue === 'scale' && hasScale);

    if (!datasetOk) {
        const lengths = {
            robinsonFouldsDistances: robinsonFouldsDistances?.length,
            weightedRobinsonFouldsDistances: weightedRobinsonFouldsDistances?.length,
            scaleList: scaleList?.length
        };
        console.warn('[renderOrUpdateLineChart] Required dataset missing for chart type', barOptionValue, lengths);
        // Clear chart area politely
        const chartContainer = document.getElementById(containerId);
        if (chartContainer) chartContainer.innerHTML = `<p>No data for ${barOptionValue} chart.</p>`;
        if (chartState.instance && chartState.instance.destroy) chartState.instance.destroy();
        chartState.instance = null;
        chartState.type = barOptionValue;
        return chartState;
    }

    // datasetOk above already guards by selected chart type; no mixed checks here

    // Assume weighted distances are present (per example.json schema)

    // Check if we can update existing chart instead of re-rendering
    if (chartState.instance && chartState.type === barOptionValue) {
        console.log('[lineChartManager] Chart type unchanged, only updating position');
        // Use store/helper mappings for indicator position
        const store = useAppStore.getState();
        const chartDataLength = barOptionValue === 'rfd' ? robinsonFouldsDistances.length
                              : barOptionValue === 'w-rfd' ? (weightedRobinsonFouldsDistances?.length ?? 0)
                              : scaleList.length;

        const idxForBounds = barOptionValue === 'scale'
          ? store.getNearestAnchorChartIndex()
          : transitionResolver.getDistanceIndex(store.currentTreeIndex);
        if (idxForBounds >= 0 && idxForBounds < chartDataLength) {
            const seqIndex = barOptionValue === 'scale'
              ? store.getNearestAnchorSeqIndex()
              : transitionResolver.getTreeIndexForDistanceIndex(idxForBounds);
            chartState.instance.updatePosition(seqIndex);
        }
        return chartState;
    }

    // Handle case where only one distance value exists (no line chart to plot)
    if (barOptionValue !== "scale") {
        const seriesLength = barOptionValue === 'rfd' ? robinsonFouldsDistances.length : weightedRobinsonFouldsDistances.length;
        if (seriesLength === 1) {
            const chartContainer = document.getElementById(containerId);
            if (chartContainer) {
                const value = barOptionValue === 'rfd' ? robinsonFouldsDistances[0] : weightedRobinsonFouldsDistances[0];
                const label = barOptionValue === 'rfd' ? 'Relative RFD' : 'Weighted RFD';
                chartContainer.innerHTML = `
                    <p>${label}: ${value}</p>
                `;
            }
            if (chartState.instance && chartState.instance.destroy) {
                chartState.instance.destroy();
            }
            chartState.instance = null;
            chartState.type = barOptionValue;
            return chartState;
        }
    }

    // --- Unified transition index mapping for all chart types ---
    if (!transitionResolver) {
        console.warn('[renderOrUpdateLineChart] TransitionIndexResolver not provided.');
        return chartState;
    }

    // Mapping depends on chart type:
    // - Distances: distance index <-> sequence index via resolver
    // - Scale: chart index (0..fullTrees-1) <-> sequence index via fullTreeIndices list
    const chartSpecificIndexToSequence = (chartIdx) => {
        if (barOptionValue === 'scale') {
            const fti = transitionResolver.fullTreeIndices;
            const clamped = Math.max(0, Math.min(fti.length - 1, chartIdx));
            return fti[clamped] ?? 0;
        }
        return transitionResolver.getTreeIndexForDistanceIndex(chartIdx);
    };

    const chartSpecificSequenceToIndex = (seqIdx) => {
        if (barOptionValue === 'scale') {
            const fti = transitionResolver.fullTreeIndices || [];
            if (fti.length === 0) return 0;
            let k = 0;
            for (let i = fti.length - 1; i >= 0; i--) {
                if (fti[i] <= seqIdx) { k = i; break; }
            }
            if (k + 1 < fti.length) {
                const left = Math.abs(seqIdx - fti[k]);
                const right = Math.abs(fti[k + 1] - seqIdx);
                if (right < left) k = k + 1;
            }
            return k;
        }
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
        yMax = weightedRobinsonFouldsDistances && weightedRobinsonFouldsDistances.length > 0 ? Math.max(...weightedRobinsonFouldsDistances) : 0;
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

    // Create navigation callback that converts chart positions to sequence indices
    const onPositionChange = (chartPosition) => {
        const { transitionResolver, goToPosition } = useAppStore.getState();
        if (!transitionResolver) return;

        // Bounds: based on currently selected dataset length
        const seriesLength = barOptionValue === 'rfd'
          ? robinsonFouldsDistances.length
          : barOptionValue === 'w-rfd'
            ? (weightedRobinsonFouldsDistances?.length ?? 0)
            : scaleList.length; // scale

        if (chartPosition < 0 || chartPosition >= seriesLength) return;

        let targetSeqIndex;
        if (barOptionValue === 'scale') {
          // Scale is per-full-tree; chart index maps to that full tree's sequence index
          const fti = transitionResolver.fullTreeIndices;
          targetSeqIndex = fti[Math.max(0, Math.min(fti.length - 1, chartPosition))];
        } else {
          // Distances are between full trees; use resolver to map distance index to target full tree
          targetSeqIndex = transitionResolver.getTreeIndexForDistanceIndex(chartPosition);
        }

        goToPosition(targetSeqIndex);
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
    // Note: Removed ResizeObserver for responsive chart handling
    // Charts will use CSS-based responsive design instead

    chartState.instance = {
        updatePosition: (newSequencePosition) => {
            // Map sequence position to chart position for the indicator
            let newChartPosition = chartSpecificSequenceToIndex(newSequencePosition);
            // Round and clamp to valid data index
            if (!Number.isFinite(newChartPosition)) newChartPosition = 0;
            newChartPosition = Math.max(0, Math.min((chartData?.length ?? 1) - 1, Math.round(newChartPosition)));

            // Use the generator's internal updater (captures scales/config)
            chartResult.updatePositionChartIndex(newChartPosition);
        },
        destroy: () => {
            chartResult.destroy();
        }
    };
    chartState.type = barOptionValue;
    return chartState;
}
