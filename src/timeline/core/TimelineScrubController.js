import { TIMELINE_CONSTANTS } from '../constants.js';

/**
 * Owns the scrub gesture state machine for the timeline.
 *
 * Responsibilities:
 * - start, update, and finish scrubbing
 * - throttle scrub updates to the render backend
 * - keep scrub-specific transient state out of the manager
 */
export class TimelineScrubController {
  constructor({
    timelineDataset,
    timelineData,
    segments,
    store,
    getTimelineRenderer,
    getScrubberAPI,
    stopPlayback,
  }) {
    this.timelineDataset = timelineDataset;
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
      this.updateScrubbing(timeMs);
    }
  }

  async startScrubbing(timeMs) {
    if (this.isScrubbing) {
      this.updateScrubbing(timeMs);
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

  updateScrubbing(timeMs) {
    const scrubberAPI = this.getScrubberAPI();
    if (!scrubberAPI || !this.isScrubbing) return;

    this.pendingScrubTimeMs = timeMs;
    const now = performance.now();

    if (now - this.lastScrubTime < TIMELINE_CONSTANTS.SCRUB_THROTTLE_MS) {
      if (this.scrubRequestId) return;

      this.scrubRequestId = requestAnimationFrame(() => {
        this.scrubRequestId = null;
        if (!this.isScrubbing) return;

        const latestTimeMs = this.pendingScrubTimeMs;
        this.pendingScrubTimeMs = null;

        if (latestTimeMs != null) {
          this.lastScrubTime = performance.now();
          this._requestScrubRender(scrubberAPI, latestTimeMs);
        }
      });
      return;
    }

    this.pendingScrubTimeMs = null;
    this.lastScrubTime = now;
    this._requestScrubRender(scrubberAPI, timeMs);
  }

  async endScrubbing(finalTimeMs) {
    if (!this.isScrubbing) return;

    const scrubberAPI = this.getScrubberAPI();
    const finalProgress = this._timeToProgress(finalTimeMs);
    this.pendingScrubTimeMs = null;
    this._clearPendingFrame();
    const lastState = scrubberAPI ? await scrubberAPI.endScrubbing(finalProgress) : null;

    this.isScrubbing = false;
    this.lastScrubEndTime = performance.now();
    this.getTimelineRenderer()?.syncScrubState();

    if (lastState?.transitionFrame) {
      this.store
        .getState()
        .setTimelineProgress(finalProgress, lastState.transitionFrame.cursorTreeIndex);
      return;
    }

    const cursor = this.timelineDataset.getCursorAtTimelineProgress(finalProgress, {
      bias: 'nearest',
    });

    this.store.getState().setTimelineProgress(finalProgress, cursor.frameIndex);
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
    return this.timelineDataset.getTimelineProgressAtMovieTime(time);
  }

  _requestScrubRender(scrubberAPI, timeMs) {
    scrubberAPI.updatePosition(this._timeToProgress(timeMs)).catch((error) => {
      console.error('[TimelineScrubController] Scrub render request failed:', {
        timeMs,
        error,
      });
    });
  }
}
