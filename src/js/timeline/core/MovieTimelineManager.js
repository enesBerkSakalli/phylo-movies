import { TIMELINE_CONSTANTS } from '../constants.js';
import { TimelineDataProcessor } from '../data/TimelineDataProcessor.js';
import { ScrubberAPI } from './ScrubberAPI.js';
import { TimelineMathUtils } from '../math/TimelineMathUtils.js';
import { useAppStore } from '../../core/store.js';
import { getIndexMappings } from '../../domain/indexing/IndexMapping.js';
import { DeckTimelineRenderer } from '../renderers/DeckTimelineRenderer.js';

export class MovieTimelineManager {
    constructor(movieData, transitionIndexResolver) {
        this.movieData = movieData;
        this.transitionResolver = transitionIndexResolver;
        this.isTimelinePlaying = false;
        this.isScrubbing = false;

        this.scrubberAPI = null;
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
            console.warn('[Timeline] Timeline creation deferred - container not found');
        } else {
            this._setupEvents();
        }

        this._initializeScrubberAPI();

        // Single, clean subscription to store changes
        this.unsubscribeFromStore = useAppStore.subscribe(
            (state, prevState) => {
                if (this.isScrubbing) return; // Ignore store updates while scrubbing

                if (state.currentTreeIndex !== prevState.currentTreeIndex ||
                    state.animationProgress !== prevState.animationProgress) {
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

        // Clean up existing timeline if it exists
        if (this.timeline && typeof this.timeline.destroy === 'function') {
            this.timeline.destroy();
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

        this.timeline = new DeckTimelineRenderer(this.timelineData, this.segments).init(container);
    }

    _setupEvents() {
        if (!this.timeline) return;

        this.timeline.on('timechange', this._onTimeChange.bind(this));
        this.timeline.on('timechanged', this._onTimeChanged.bind(this));
        this.timeline.on('select', this._onTimelineClick.bind(this));
    }

    _onTimeChange(properties) {
        if (properties.id === 'scrubber' && !this.isTimelinePlaying) {
            const ms = this._getTimeFromProperties(properties);
            this._handleScrubbing(ms);
        }
    }

    _onTimeChanged(properties) {
        if (properties.id === 'scrubber') {
            // If playing, ignore scrub end (since we ignored scrub start/move)
            if (this.isTimelinePlaying) return;

            const ms = this._getTimeFromProperties(properties);
            this._endScrubbing(ms);
        }
    }

    _onTimelineClick(properties) {
        if (properties.id) {
            this._handleSegmentClick(properties.id - TIMELINE_CONSTANTS.INDEX_OFFSET_UI);
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
        let lastState = null;

        if (this.scrubberAPI) {
            lastState = await this.scrubberAPI.endScrubbing(finalProgress);
            // If endScrubbing didn't return state (e.g., no update needed), fall back to whatever is cached
            if (!lastState) {
                lastState = this.scrubberAPI.lastInterpolationState;
            }
        }

        // Persist the exact scrub position so the handle stays where it was released,
        // rather than snapping back to the nearest anchor tree.
        this.isScrubbing = false;
        this.timeline?.setScrubbing(false);
        if (this.scrubRequestId) {
            cancelAnimationFrame(this.scrubRequestId);
            this.scrubRequestId = null;
        }
        this.scrubStartTimeMs = null;

        // Keep exact scrubbed position - don't snap to anchor
        // The tree indices are already stored in lastInterpolationState from the last render
        if (lastState?.interpolationData) {
            const { fromIndex, toIndex, timeFactor } = lastState.interpolationData;
            const primaryTreeIndex = timeFactor < 0.5 ? fromIndex : toIndex;
            useAppStore.getState().setTimelineProgress(finalProgress, primaryTreeIndex, timeFactor);
            return;
        }

        // Fallback: derive tree index/segment progress from the timeline itself
        const segments = this.segments || [];
        const segmentDurations =
            this.timelineData?.segmentDurations || TimelineMathUtils.calculateSegmentDurations(segments);
        const totalDuration = this.timelineData?.totalDuration || 0;
        const currentTime = TimelineMathUtils.progressToTime(finalProgress, totalDuration);
        const target = TimelineMathUtils.getTargetTreeForTime(
            segments,
            currentTime,
            segmentDurations
        );

        useAppStore.getState().setTimelineProgress(
            finalProgress,
            target?.treeIndex,
            target?.segmentProgress
        );
    }

    _handleSegmentClick(segmentIndex) {
        const segment = this._validateSegment(segmentIndex);
        if (!segment) return;

        // Get the first tree in the segment
        const targetTreeIndex = segment.interpolationData?.[0]?.originalIndex ?? segment.index;

        this._navigateToTree(targetTreeIndex);

        // Force update of timeline position immediately after navigation
        // This ensures the scrubber jumps to the clicked segment even if animationProgress hasn't propagated yet
        requestAnimationFrame(() => this.updateCurrentPosition());
    }

    updateCurrentPosition() {
        if (this.isScrubbing) return;

        const { animationProgress, timelineProgress, playing } = useAppStore.getState();

        // Use timelineProgress if available (preserves exact scrubbed positions),
        // but ONLY if not playing (animation progress takes precedence during playback)
        const progress = (playing ? null : timelineProgress) ?? animationProgress;
        const currentTime = TimelineMathUtils.progressToTime(progress, this.timelineData.totalDuration);

        // Update timeline scrubber visual to exact position
        this.timeline?.setCustomTime(currentTime, 'scrubber');

        // Find segment for selection highlighting (don't use this to update position)
        const { treeIndex, segmentIndex, segmentProgress } = TimelineMathUtils.getTargetTreeForTime(
            this.segments,
            currentTime,
            this.timelineData.segmentDurations
        );

        const segment = this._validateSegment(segmentIndex);
        if (!segment) return;

        // Update timeline selection
        this.timeline?.setSelection([segmentIndex + TIMELINE_CONSTANTS.INDEX_OFFSET_UI]);

        // Update store and UI
        this._updateStoreTimelineState(currentTime, segment, treeIndex);
        useAppStore.getState().setSegmentProgress(segmentProgress); // Sync segment progress with scrub position
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
        this.scrubberAPI?.destroy();

        this.timeline = null;
        this.segments = null;
        this.timelineData = null;
        this.scrubberAPI = null;
        this.scrubRequestId = null;
    }

}
