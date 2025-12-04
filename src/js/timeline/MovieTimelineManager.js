import { TIMELINE_CONSTANTS } from './constants.js';
import { TimelineDataProcessor } from './TimelineDataProcessor.js';
import { TimelineUIManager } from './TimelineUIManager.js';
import { ScrubberAPI } from './ScrubberAPI.js';
import { TimelineMathUtils } from './TimelineMathUtils.js';
import { useAppStore } from '../core/store.js';
import { getIndexMappings } from '../domain/indexing/IndexMapping.js';
import { TimelineTooltip } from './tooltip/TimelineTooltip.js';
import { buildTimelineTooltipContent } from './tooltip/buildTooltipContent.js';
import { createTimelineRenderer } from './renderers/TimelineRendererFactory.js';

export class MovieTimelineManager {
    constructor(movieData, transitionIndexResolver) {
        this.movieData = movieData;
        this.transitionResolver = transitionIndexResolver;
        this.isTimelinePlaying = false;
        this.isScrubbing = false;

        this.uiManager = null;
        this.scrubberAPI = null;
        this.tooltip = null;
        this.timeline = null;

        this.segments = TimelineDataProcessor.createSegments(movieData);
        this.timelineData = TimelineDataProcessor.createTimelineData(this.segments);

        // Scrubbing state management
        this.lastScrubTime = 0;
        this.scrubRequestId = null;

        this._initialize();
    }

    /**
     * Select the tree controller for scrubbing.
     * Returns the first available controller (now always a single controller).
     */
    _selectScrubberController() {
        const { treeControllers } = useAppStore.getState();
        if (!Array.isArray(treeControllers) || !treeControllers.length) {
            return null;
        }

        return treeControllers[0] || null;
    }

    _initialize() {
        const { totalSequenceLength } = getIndexMappings();
        const { playing } = useAppStore.getState();
        this.isTimelinePlaying = playing;

        this._createTimeline();
        if (!this.timeline) {
            console.error('[Timeline] Failed to create timeline renderer');
            return;
        }

        this.uiManager = new TimelineUIManager(this.movieData, this.timeline);
        this.uiManager.updateMetrics(totalSequenceLength, this.segments.length);
        this._setupEvents();
        this._initializeScrubberAPI();
        this.tooltip = new TimelineTooltip();

        // Single, clean subscription to store changes
        this.unsubscribeFromStore = useAppStore.subscribe(
            (state, prevState) => {
                if (this.isScrubbing) return; // Ignore store updates while scrubbing

                if (state.currentTreeIndex !== prevState.currentTreeIndex) {
                    requestAnimationFrame(() => this.updateCurrentPosition());
                }
                if (state.playing !== prevState.playing) {
                    this.isTimelinePlaying = state.playing;
                }

                // When controllers change (e.g., toggling comparison mode), refresh scrubber target
                if (state.treeControllers !== prevState.treeControllers) {
                    const controller = this._selectScrubberController();
                    if (controller && controller !== this.scrubberAPI?.treeController) {
                        this._initializeScrubberAPI(controller);
                    }
                }
            }
        );

        // Initial position update
        requestAnimationFrame(() => this.updateCurrentPosition());
    }

    _initializeScrubberAPI(controllerOverride = null) {
        try {
            const controller = controllerOverride || this._selectScrubberController();
            if (!controller) {
                console.warn('[Timeline] TreeControllers not available for ScrubberAPI');
                return;
            }

            // Use the first tree controller (primary visualization)
            this.scrubberAPI = new ScrubberAPI(
                controller,
                this.transitionResolver,
                this
            );
        } catch (error) {
            console.error('[Timeline] Failed to initialize ScrubberAPI:', error);
        }
    }

    _createTimeline() {
        const timelineParent = document.querySelector('.interpolation-timeline-container');
        if (!timelineParent) {
            console.warn('[Timeline] Parent container not found. Skipping timeline initialisation.');
            return;
        }

        // Remove any stale container to avoid duplicate IDs when re-initialising.
        const existing = timelineParent.querySelector('#timelineContainer');
        if (existing && existing.parentNode) {
            existing.parentNode.removeChild(existing);
        }

        const container = document.createElement('div');
        container.id = 'timelineContainer';
        container.className = 'timeline-visual-layer';
        // Use insertAdjacentElement to place it correctly after the header
        timelineParent.insertAdjacentElement('beforeend', container);

        this.timeline = createTimelineRenderer(this.timelineData, this.segments).init(container);
    }

    _setupEvents() {
        if (!this.timeline) return;

        this.timeline.on('timechange', this._onTimeChange.bind(this));
        this.timeline.on('timechanged', this._onTimeChanged.bind(this));
        this.timeline.on('click', this._onTimelineClick.bind(this));
        this.timeline.on('itemover', this._onItemOver.bind(this));
        this.timeline.on('itemout', this._onItemOut.bind(this));
        this.timeline.on('mouseMove', this._onMouseMove.bind(this));
    }

    _onTimeChange(properties) {
        if (properties.id === 'scrubber' && !this.isTimelinePlaying) {
            const ms = this._getTimeFromProperties(properties);
            this._handleScrubbing(ms);
        }
    }

    _onTimeChanged(properties) {
        if (properties.id === 'scrubber') {
            const ms = this._getTimeFromProperties(properties);
            this._endScrubbing(ms);
        }
    }

    _onTimelineClick(properties) {
        if (properties.item) {
            this._handleSegmentClick(properties.item - TIMELINE_CONSTANTS.INDEX_OFFSET_UI);
        }
    }

    _onItemOver(props) {
        const segIndex = (props.item ?? 1) - TIMELINE_CONSTANTS.INDEX_OFFSET_UI;
        const segment = this.segments[segIndex];
        if (!segment) return;

        const { clientX, clientY } = props.event || { clientX: 0, clientY: 0 };
        const html = buildTimelineTooltipContent(
            segment,
            segIndex,
            this.segments.length,
            useAppStore.getState(),
            this._getLeafNamesByIndices.bind(this)
        );
        this.tooltip.show(html, clientX, clientY);
    }

    _onItemOut() {
        this.tooltip.hide();
    }

    _onMouseMove(props) {
        const { clientX, clientY } = props.event || { clientX: 0, clientY: 0 };
        this.tooltip.updatePosition(clientX, clientY);
    }

    async _handleScrubbing(timeMs) {
        if (!this.isScrubbing) {
            await this._startScrubbing(timeMs);
        } else {
            await this._updateScrubbing(timeMs);
        }
    }

    async _startScrubbing(timeMs) {
        this.isScrubbing = true;
        this.scrubStartTimeMs = timeMs;
        this.timeline?.setScrubbing(true);

        if (this.scrubberAPI) {
            const progress = this._timeToProgress(timeMs);
            await this.scrubberAPI.startScrubbing(progress);
        }
    }

    async _updateScrubbing(timeMs) {
        if (!this.scrubberAPI || !this.isScrubbing) return;

        const now = performance.now();
        if (now - this.lastScrubTime < TIMELINE_CONSTANTS.SCRUB_THROTTLE_MS) {
            if (this.scrubRequestId) {
                cancelAnimationFrame(this.scrubRequestId);
            }
            this.scrubRequestId = requestAnimationFrame(async () => {
                if (!this.isScrubbing) return;
                await this._updateScrubbing(timeMs);
            });
            return;
        }

        const progress = this._timeToProgress(timeMs);
        try {
            await this.scrubberAPI.updatePosition(progress);
            this.lastScrubTime = now;
        } catch (error) {
            console.error('[Timeline] Error updating scrubber position:', error);
        }
    }

    async _endScrubbing(finalTimeMs) {
        if (!this.isScrubbing) return;

        const finalProgress = this._timeToProgress(finalTimeMs);

        if (this.scrubberAPI) {
            await this.scrubberAPI.endScrubbing(finalProgress);
        }

        // Determine final tree position
        const bias = (finalTimeMs >= (this.scrubStartTimeMs ?? finalTimeMs)) ? 'forward' : 'backward';
        const { treeIndex: finalTreeIndex } = TimelineMathUtils.getTargetTreeForTime(
            this.segments,
            finalTimeMs,
            this.timelineData.segmentDurations,
            bias
        );

        // Navigate to final position
        this._navigateToTree(finalTreeIndex);

        this.isScrubbing = false;
        this.timeline?.setScrubbing(false);
        if (this.scrubRequestId) {
            cancelAnimationFrame(this.scrubRequestId);
            this.scrubRequestId = null;
        }
        this.scrubStartTimeMs = null;
    }

    _handleSegmentClick(segmentIndex) {
        const segment = this._validateSegment(segmentIndex);
        if (!segment) return;

        // Get the first tree in the segment
        const targetTreeIndex = segment.interpolationData?.[0]?.originalIndex ?? segment.index;

        this._navigateToTree(targetTreeIndex);
    }

    updateCurrentPosition() {
        if (this.isScrubbing) return;

        const { currentTreeIndex } = useAppStore.getState();
        const { segmentIndex, timeInSegment } = TimelineMathUtils.findSegmentForTreeIndex(this.segments, currentTreeIndex);

        const segment = this._validateSegment(segmentIndex);
        if (!segment) return;

        const segmentDuration = this.timelineData.segmentDurations[segmentIndex] || 0;
        const rawProgress = segmentDuration > 0 ? timeInSegment / segmentDuration : 0;
        const segmentProgress = Math.min(1.0, Math.max(0.0, rawProgress)); // Clamp to [0,1]

        const currentTime = this._calculateTimeForSegment(segmentIndex, timeInSegment);

        // Update timeline visuals
        this.timeline?.setCustomTime(currentTime, 'scrubber');
        this.timeline?.setSelection([segmentIndex + TIMELINE_CONSTANTS.INDEX_OFFSET_UI]);

        // Update store and UI
        this._updateStoreTimelineState(currentTime, segment, currentTreeIndex);
        useAppStore.getState().setSegmentProgress(segmentProgress); // Move this call here
        this.uiManager?.updateDisplay(segment, segmentProgress, currentTreeIndex);
    }

    _calculateTimeForSegment(segmentIndex, timeInSegment = 0) {
        return TimelineMathUtils.calculateTimeForSegment(
            this.segments,
            segmentIndex,
            timeInSegment,
            this.timelineData.segmentDurations
        );
    }

    _validateSegment(segmentIndex) {
        if (segmentIndex < 0 || segmentIndex >= this.segments.length) {
            return null;
        }
        return this.segments[segmentIndex];
    }

    _timeToProgress(time) {
        return TimelineMathUtils.timeToProgress(time, this.timelineData.totalDuration);
    }

    _updateStoreTimelineState(time, segment, currentTreeIndex) {
        const totalProgress = this._timeToProgress(time);
        const segmentIndex = this.segments.indexOf(segment);

        if (segmentIndex === -1) return;

        let treeInSegment, treesInSegment;

        if (segment.hasInterpolation && segment.interpolationData?.length > 1) {
            treesInSegment = segment.interpolationData.length;

            // Branch A: Exact tree position known
            const result = TimelineMathUtils.calculateTreePositionInSegment(segment, currentTreeIndex);
            treeInSegment = result.treeInSegment;
        } else {
            // Default values for non-interpolated segments
            treeInSegment = TIMELINE_CONSTANTS.DEFAULT_TREE_IN_SEGMENT;
            treesInSegment = TIMELINE_CONSTANTS.DEFAULT_TREES_IN_SEGMENT;
        }

        useAppStore.getState().updateTimelineState({
            currentSegmentIndex: segmentIndex,
            totalSegments: this.segments.length,
            treeInSegment,
            treesInSegment,
            timelineProgress: totalProgress
        });
    }

    _getLeafNamesByIndices(indices) {
        const sortedLeaves = this.movieData?.sorted_leaves;
        if (!sortedLeaves || !Array.isArray(indices)) return [];

        return indices
            .filter(idx => Number.isInteger(idx) && idx >= 0 && idx < sortedLeaves.length)
            .map(idx => sortedLeaves[idx]);
    }

    _navigateToTree(targetTreeIndex) {
        const { currentTreeIndex, goToPosition } = useAppStore.getState();
        const direction = targetTreeIndex === currentTreeIndex ? 'jump' :
                         (targetTreeIndex > currentTreeIndex ? 'forward' : 'backward');
        goToPosition(targetTreeIndex, direction);
    }

    _getTimeFromProperties(properties) {
        const { time } = properties;
        // Handle both raw milliseconds (timeline-relative) and Date objects (legacy)
        if (typeof time === 'number') {
            return time;
        }
        return time instanceof Date ? time.getTime() : time;
    }

    destroy() {
        if (this.scrubRequestId) {
            cancelAnimationFrame(this.scrubRequestId);
        }
        if (this.unsubscribeFromStore) {
            this.unsubscribeFromStore();
        }

        this.timeline?.destroy();
        this.uiManager?.destroy();
        this.scrubberAPI?.destroy();
        this.tooltip?.destroy();

        this.timeline = null;
        this.segments = null;
        this.timelineData = null;
        this.uiManager = null;
        this.scrubberAPI = null;
        this.tooltip = null;
        this.scrubRequestId = null;
    }

}
