import { TIMELINE_CONSTANTS } from './constants.js';
import { TimelineUI } from './TimelineUI.js';
import { useAppStore } from '../core/store.js';
import { getIndexMappings, getMSAFrameIndex, getPhaseMetadata } from '../core/IndexMapping.js';
import { calculateWindow } from '../utils/windowUtils.js';

export class TimelineUIManager {
    constructor(movieData, timeline) {
        this.movieData = movieData;
        this.timeline = timeline;
        this.ui = new TimelineUI();
    }

    _getLeafNamesByIndices(indices) {
        const sortedLeaves = this.movieData?.sorted_leaves;

        if (!sortedLeaves || !Array.isArray(sortedLeaves)) return [];

        const leafNames = [];
        for (const idx of indices) {
            if (Number.isInteger(idx) && idx >= 0 && idx < sortedLeaves.length) {
                leafNames.push(sortedLeaves[idx]);
            }
        }

        return leafNames;
    }

    setupControls() {
        this.ui.setupButtonHandlers({
            zoomIn: () => this.timeline?.zoomIn(TIMELINE_CONSTANTS.ZOOM_PERCENTAGE_UI),
            zoomOut: () => this.timeline?.zoomOut(TIMELINE_CONSTANTS.ZOOM_PERCENTAGE_UI),
            fitToWindow: () => this.timeline?.fit(),
            scrollToStart: () => this.timeline?.moveTo(TIMELINE_CONSTANTS.DEFAULT_PROGRESS),
            scrollToEnd: () => {
                // THE FIX: Get the total duration and visible range to correctly
                // calculate the position that will place the end of the timeline
                // at the edge of the viewport.
                const totalDuration = this.timeline?.getTotalDuration();
                const visibleRange = this.timeline?.getVisibleTimeRange();
                if (totalDuration !== undefined && visibleRange) {
                    const visibleDuration = visibleRange.max - visibleRange.min;
                    this.timeline.moveTo(totalDuration - visibleDuration);
                }
            }
        });
    }

    updateDisplay(segment, transitionProgress) {
        const storeState = useAppStore.getState();
        const { totalSequenceLength: totalTrees } = getIndexMappings(storeState);

        this.ui.updatePositionDisplay({
            progress: storeState.timelineProgress,
            currentTree: storeState.currentTreeIndex + TIMELINE_CONSTANTS.INDEX_OFFSET_UI,
            totalTrees,
            treeInSegment: storeState.treeInSegment,
            treesInSegment: storeState.treesInSegment
        });

        this.ui.updateSegmentInfo(segment, transitionProgress, storeState);


        if (segment?.isFullTree) {
            this._updateMSAWindowChip();
        }
    }

    _updateMSAWindowChip() {
        const {
            transitionResolver,
            msaWindowSize,
            msaStepSize,
            msaColumnCount,
            syncMSAEnabled
        } = useAppStore.getState();

        if (!syncMSAEnabled || !transitionResolver || msaColumnCount <= 0) {
            return;
        }

        const frameIndex = getMSAFrameIndex();
        if (frameIndex < 0) {
            return;
        }

        const { startPosition, midPosition, endPosition } =
            calculateWindow(frameIndex, msaStepSize, msaWindowSize, msaColumnCount);

        // Update timeline MSA window
        const startEl = document.getElementById('windowStart');
        const midEl = document.getElementById('windowMid');
        const endEl = document.getElementById('windowEnd');

        if (startEl && midEl && endEl) {
            startEl.textContent = String(startPosition);
            midEl.textContent = String(midPosition);
            endEl.textContent = String(endPosition);

            startEl.setAttribute('aria-label', `Window start: position ${startPosition}`);
            midEl.setAttribute('aria-label', `Window center: position ${midPosition}`);
            endEl.setAttribute('aria-label', `Window end: position ${endPosition}`);
        }

        // Update HUD MSA window
        const hudStartEl = document.getElementById('hudWindowStart');
        const hudMidEl = document.getElementById('hudWindowMid');
        const hudEndEl = document.getElementById('hudWindowEnd');

        if (hudStartEl && hudMidEl && hudEndEl) {
            hudStartEl.textContent = String(startPosition);
            hudMidEl.textContent = String(midPosition);
            hudEndEl.textContent = String(endPosition);

            hudStartEl.setAttribute('aria-label', `Window start: position ${startPosition}`);
            hudMidEl.setAttribute('aria-label', `Window center: position ${midPosition}`);
            hudEndEl.setAttribute('aria-label', `Window end: position ${endPosition}`);
        }
    }

    updateMetrics(totalSequenceLength, segmentsLength) {
        this.ui.updateMetrics(totalSequenceLength, segmentsLength);
    }

    destroy() {
        this.ui?.clear();
        this.ui = null;
    }
}
