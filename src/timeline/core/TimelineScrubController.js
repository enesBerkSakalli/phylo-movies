import { TIMELINE_CONSTANTS } from '../constants.js';
import { TimelineMathUtils } from '../math/TimelineMathUtils.js';

/**
 * Owns the scrub gesture state machine for the timeline.
 *
 * Responsibilities:
 * - start, update, and finish scrubbing
 * - throttle scrub updates to the render backend
 * - keep scrub-specific transient state out of the manager
 */
export class TimelineScrubController {
  constructor({ timelineData, segments, store, getTimelineRenderer, getScrubberAPI, stopPlayback }) {
    this.timelineData = timelineData;
    this.segments = segments;
    this.store = store;
    this.getTimelineRenderer = getTimelineRenderer;
    this.getScrubberAPI = getScrubberAPI;
    this.stopPlayback = stopPlayback;

    this.isScrubbing = false;
    this.lastScrubTime = 0;
    this.scrubRequestId = null;
    this.pendingScrubTimeMs = null;
    this.lastScrubEndTime = 0;
  }

  async handleScrubbing(timeMs) {
    if (!this.isScrubbing) {
      await this.startScrubbing(timeMs);
    } else {
      await this.updateScrubbing(timeMs);
    }
  }

  async startScrubbing(timeMs) {
    if (this.isScrubbing) {
      await this.updateScrubbing(timeMs);
      return;
    }

    this.stopPlayback?.();
    this.isScrubbing = true;
    this.lastScrubTime = 0;
    this.pendingScrubTimeMs = null;
    this._clearPendingFrame();
    this.getTimelineRenderer()?.syncScrubState();

    const scrubberAPI = this.getScrubberAPI();
    if (scrubberAPI) {
      await scrubberAPI.startScrubbing(this._timeToProgress(timeMs));
    }
  }

  async updateScrubbing(timeMs) {
    const scrubberAPI = this.getScrubberAPI();
    if (!scrubberAPI || !this.isScrubbing) return;

    this.pendingScrubTimeMs = timeMs;
    const now = performance.now();

    if (now - this.lastScrubTime < TIMELINE_CONSTANTS.SCRUB_THROTTLE_MS) {
      if (this.scrubRequestId) return;

      this.scrubRequestId = requestAnimationFrame(async () => {
        this.scrubRequestId = null;
        if (!this.isScrubbing) return;

        const latestTimeMs = this.pendingScrubTimeMs;
        this.pendingScrubTimeMs = null;

        if (latestTimeMs != null) {
          await scrubberAPI.updatePosition(this._timeToProgress(latestTimeMs));
          this.lastScrubTime = performance.now();
        }
      });
      return;
    }

    this.pendingScrubTimeMs = null;
    await scrubberAPI.updatePosition(this._timeToProgress(timeMs));
    this.lastScrubTime = now;
  }

  async endScrubbing(finalTimeMs) {
    if (!this.isScrubbing) return;

    const scrubberAPI = this.getScrubberAPI();
    const finalProgress = this._timeToProgress(finalTimeMs);
    const lastState = scrubberAPI
      ? await scrubberAPI.endScrubbing(finalProgress)
      : null;

    this.isScrubbing = false;
    this.lastScrubEndTime = performance.now();
    this.getTimelineRenderer()?.syncScrubState();
    this._clearPendingFrame();

    if (lastState?.interpolationData) {
      const { fromIndex, toIndex, timeFactor } = lastState.interpolationData;
      const primaryTreeIndex = timeFactor < 0.5 ? fromIndex : toIndex;
      this.store.getState().setTimelineProgress(finalProgress, primaryTreeIndex);
      return;
    }

    const currentTime = TimelineMathUtils.progressToTime(finalProgress, this.timelineData.totalDuration);
    const target = TimelineMathUtils.getTargetTreeForTime(
      this.segments,
      currentTime,
      this.timelineData.segmentDurations,
      'nearest',
      this.timelineData.cumulativeDurations
    );

    this.store.getState().setTimelineProgress(finalProgress, target?.treeIndex);
  }

  resetOnUnmount() {
    this._clearPendingFrame();
    this.isScrubbing = false;
    this.pendingScrubTimeMs = null;
    this.getTimelineRenderer()?.syncScrubState();
  }

  destroy() {
    this.resetOnUnmount();
  }

  _clearPendingFrame() {
    if (this.scrubRequestId) {
      cancelAnimationFrame(this.scrubRequestId);
      this.scrubRequestId = null;
    }
  }

  _timeToProgress(time) {
    return TimelineMathUtils.timeToProgress(time, this.timelineData.totalDuration);
  }
}
