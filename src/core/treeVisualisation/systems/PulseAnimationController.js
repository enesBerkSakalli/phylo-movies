import { PULSE_DURATION_MS } from '@/utils/animation/animationUtils.js';

/**
 * Controls pulse animation for highlighted tree elements.
 * Manages the requestAnimationFrame loop and phase calculation.
 */
export class PulseAnimationController {
  constructor({ onPhaseUpdate, onRender, shouldContinue }) {
    this._animationId = null;
    this._startTime = null;
    this._onPhaseUpdate = onPhaseUpdate;
    this._onRender = onRender; // Optional - omit for deck.gl updateTrigger-based updates
    this._shouldContinue = shouldContinue;
  }

  get isRunning() {
    return this._animationId !== null;
  }

  start() {
    if (this._animationId) return; // Already running

    this._startTime = performance.now();
    this._animate(this._startTime);
  }

  stop() {
    cancelAnimationFrame(this._animationId);
    this._animationId = null;
    this._startTime = null;
    this._onPhaseUpdate(0);
  }

  _animate = (timestamp) => {
    if (!this._shouldContinue()) {
      this.stop();
      return;
    }

    const elapsed = timestamp - this._startTime;
    const phase = (elapsed % PULSE_DURATION_MS) / PULSE_DURATION_MS;

    this._onPhaseUpdate(phase);
    this._onRender?.(); // Only call if provided

    this._animationId = requestAnimationFrame(this._animate);
  };
}
