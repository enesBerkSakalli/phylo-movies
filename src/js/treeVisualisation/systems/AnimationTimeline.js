import gsap from 'gsap';

/**
 * AnimationTimeline
 *
 * Manages sequenced animation with configurable pauses between segments.
 * Wraps a timeline library internally but exposes a generic API.
 *
 * Timeline Structure:
 *   [Transition 0→1] [Pause] [Transition 1→2] [Pause] ... [Transition N-1→N]
 *
 * The onUpdate callback receives { fromIndex, toIndex, localT } for each frame,
 * where localT goes from 0 to 1 within each transition segment.
 */
export class AnimationTimeline {
  /**
   * @param {Object} config
   * @param {number} config.segmentCount - Number of transitions (treeCount - 1)
   * @param {number} config.transitionDuration - Duration per transition in seconds
   * @param {number} config.pauseDuration - Pause between transitions in seconds
   * @param {Function} config.onUpdate - Called each frame with { fromIndex, toIndex, localT }
   * @param {Function} config.onComplete - Called when animation finishes
   * @param {Function} [config.onPauseStart] - Called when a pause segment begins
   * @param {Function} [config.onPauseEnd] - Called when a pause segment ends
   */
  constructor({
    segmentCount,
    transitionDuration,
    pauseDuration,
    onUpdate,
    onComplete,
    onPauseStart,
    onPauseEnd
  }) {
    this._onUpdate = onUpdate;
    this._onComplete = onComplete;
    this._onPauseStart = onPauseStart;
    this._onPauseEnd = onPauseEnd;
    this._segmentCount = segmentCount;
    this._transitionDuration = transitionDuration;
    this._pauseDuration = pauseDuration;

    // Animation state
    this._currentFromIndex = 0;
    this._currentToIndex = 1;
    this._isPaused = false;
    this._isInPauseSegment = false;
    this._isReady = false;

    // Use a simpler approach: single tween tracking overall progress
    // This avoids the overhead of building 444 individual tweens
    this._totalDuration = this._calculateTotalDuration(segmentCount, transitionDuration, pauseDuration);

    // Progress object that GSAP will tween
    this._progress = { value: 0 };

    // Build the timeline
    this._timeline = gsap.timeline({
      paused: true,
      onComplete: () => this._handleComplete()
    });

    // Single tween for the entire duration, we calculate segment/localT ourselves
    this._timeline.to(this._progress, {
      value: 1,
      duration: this._totalDuration,
      ease: 'none',
      onUpdate: () => this._handleProgressUpdate()
    });

    this._isReady = true;
  }

  /**
   * Calculate total animation duration
   */
  _calculateTotalDuration(segmentCount, transitionDuration, pauseDuration) {
    const totalTransitionTime = segmentCount * transitionDuration;
    const totalPauseTime = Math.max(0, segmentCount - 1) * pauseDuration;
    return totalTransitionTime + totalPauseTime;
  }

  /**
   * Convert overall progress to segment index and localT
   * O(1) calculation - no loops needed
   */
  _progressToSegment(progress) {
    const { _segmentCount: segmentCount, _transitionDuration: transDur, _pauseDuration: pauseDur } = this;

    if (segmentCount === 0) return { fromIndex: 0, toIndex: 0, localT: 0, isInPause: false };

    // Clamp progress
    const clampedProgress = Math.max(0, Math.min(1, progress));

    // Total time elapsed
    const totalTime = clampedProgress * this._totalDuration;

    // Each segment (except last) has duration = transDur + pauseDur
    const segmentWithPauseDuration = transDur + pauseDur;

    // Calculate which segment we're in using division (O(1))
    // For segments 0 to N-2, each has duration segmentWithPauseDuration
    // Segment N-1 (last) has duration transDur only

    let segmentIndex;
    let timeIntoSegment;

    // Time covered by all segments except the last
    const timeBeforeLastSegment = (segmentCount - 1) * segmentWithPauseDuration;

    if (totalTime >= timeBeforeLastSegment) {
      // We're in the last segment
      segmentIndex = segmentCount - 1;
      timeIntoSegment = totalTime - timeBeforeLastSegment;
    } else {
      // We're in one of the earlier segments
      segmentIndex = Math.floor(totalTime / segmentWithPauseDuration);
      timeIntoSegment = totalTime - (segmentIndex * segmentWithPauseDuration);
    }

    // Ensure segmentIndex is valid
    segmentIndex = Math.min(segmentIndex, segmentCount - 1);

    // Determine if in transition or pause phase
    if (timeIntoSegment <= transDur) {
      // In transition phase
      const localT = Math.min(1, Math.max(0, timeIntoSegment / transDur));
      return {
        fromIndex: segmentIndex,
        toIndex: segmentIndex + 1,
        localT,
        isInPause: false
      };
    } else {
      // In pause phase (after transition, before next segment)
      return {
        fromIndex: segmentIndex,
        toIndex: segmentIndex + 1,
        localT: 1,
        isInPause: true
      };
    }
  }

  /**
   * Handle progress updates from GSAP
   */
  _handleProgressUpdate() {
    const { fromIndex, toIndex, localT, isInPause } = this._progressToSegment(this._progress.value);

    // Track pause state changes
    const wasInPause = this._isInPauseSegment;
    this._isInPauseSegment = isInPause;

    if (isInPause && !wasInPause) {
      this._onPauseStart?.();
    } else if (!isInPause && wasInPause) {
      this._onPauseEnd?.();
    }

    // Update current indices
    this._currentFromIndex = fromIndex;
    this._currentToIndex = toIndex;

    // Only call onUpdate during transitions, not pauses
    if (!isInPause) {
      this._onUpdate({
        fromIndex,
        toIndex,
        localT
      });
    }
  }

  _handleComplete() {
    this._onComplete?.();
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Start or resume playback
   */
  play() {
    this._isPaused = false;
    this._timeline.play();
  }

  /**
   * Pause playback
   */
  pause() {
    this._isPaused = true;
    this._timeline.pause();
  }

  /**
   * Resume from paused state
   */
  resume() {
    if (this._isPaused) {
      this._isPaused = false;
      this._timeline.resume();
    }
  }

  /**
   * Stop and reset to beginning
   */
  stop() {
    this._timeline.pause();
    this._timeline.seek(0);
    this._progress.value = 0;
    this._currentFromIndex = 0;
    this._currentToIndex = 1;
    this._isInPauseSegment = false;
  }

  /**
   * Seek to a normalized progress (0-1)
   * @param {number} progress - 0 to 1
   */
  seek(progress) {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    this._timeline.seek(clampedProgress * this._timeline.duration());
  }

  /**
   * Set playback speed multiplier
   * @param {number} speed - 1.0 = normal, 2.0 = double speed, etc.
   */
  setSpeed(speed) {
    this._timeline.timeScale(speed);
  }

  /**
   * Get current speed multiplier
   */
  getSpeed() {
    return this._timeline.timeScale();
  }

  /**
   * Get normalized progress (0-1)
   */
  getProgress() {
    return this._progress.value;
  }

  /**
   * Get total duration in seconds (including pauses)
   */
  getDuration() {
    return this._totalDuration;
  }

  /**
   * Check if timeline is actively playing
   */
  isActive() {
    return this._timeline.isActive();
  }

  /**
   * Check if currently in a pause segment
   */
  isInPauseSegment() {
    return this._isInPauseSegment;
  }

  /**
   * Check if timeline is ready to play
   */
  isReady() {
    return this._isReady;
  }

  /**
   * Get current animation state
   */
  getCurrentState() {
    return {
      fromIndex: this._currentFromIndex,
      toIndex: this._currentToIndex,
      localT: this._progressToSegment(this._progress.value).localT,
      progress: this.getProgress(),
      isInPause: this._isInPauseSegment
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    this._timeline.kill();
    this._timeline = null;
    this._progress = null;
  }
}
