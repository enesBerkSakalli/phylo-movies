/**
 * ScrubberIntegration - Integration layer between ScrubberAPI and existing timeline system
 *
 * This module provides seamless integration of the new ScrubberAPI with the existing
 * MovieTimelineManager, ensuring backward compatibility while providing enhanced
 * scrubbing performance.
 */

import { ScrubberAPI } from './ScrubberAPI.js';
import { useAppStore } from '../core/store.js';

export class ScrubberIntegration {
  constructor(movieTimelineManager) {
    this.timelineManager = movieTimelineManager;
    this.scrubberAPI = null;
    this.isUsingCustomScrubber = false;

    // Integration state
    this.lastTimelineTime = 0;
    this.integrationConfig = {
      useCustomScrubber: true, // Feature flag
      fallbackToOriginal: true, // Fallback on errors
      debugMode: false // Enable detailed logging
    };

    this._initializeScrubberAPI();
  }

  /**
   * Initialize the custom scrubber API
   * @private
   */
  _initializeScrubberAPI() {
    try {
      const { treeController } = useAppStore.getState();

      if (!treeController) {
        console.warn('[ScrubberIntegration] No tree controller available, using fallback');
        return;
      }

      this.scrubberAPI = new ScrubberAPI(
        treeController,
        this.timelineManager.transitionResolver
      );

      if (this.integrationConfig.debugMode) {
        console.log('[ScrubberIntegration] Custom scrubber API initialized');
      }

    } catch (error) {
      console.error('[ScrubberIntegration] Failed to initialize scrubber API:', error);
      this.integrationConfig.useCustomScrubber = false;
    }
  }

  /**
   * Handle scrubbing start - delegates to appropriate system
   * @param {number} time - Timeline time in milliseconds
   */
  async handleScrubStart(time) {
    const progress = this._timeToProgress(time);

    if (this.integrationConfig.useCustomScrubber && this.scrubberAPI) {
      try {
        this.isUsingCustomScrubber = true;
        await this.scrubberAPI.startScrubbing(progress);

        if (this.integrationConfig.debugMode) {
          console.log('[ScrubberIntegration] Custom scrubber started at progress:', progress);
        }

        return true; // Indicate custom scrubber is handling
      } catch (error) {
        console.error('[ScrubberIntegration] Custom scrubber start failed:', error);
        return this._fallbackToOriginal('start', time);
      }
    }

    return this._fallbackToOriginal('start', time);
  }

  /**
   * Handle scrubbing update - delegates to appropriate system
   * @param {number} time - Timeline time in milliseconds
   */
  async handleScrubUpdate(time) {
    const progress = this._timeToProgress(time);

    if (this.isUsingCustomScrubber && this.scrubberAPI) {
      try {
        await this.scrubberAPI.updatePosition(progress);
        this.lastTimelineTime = time;

        if (this.integrationConfig.debugMode && Math.random() < 0.1) { // Log 10% of updates
          console.log('[ScrubberIntegration] Custom scrubber update:', progress.toFixed(3));
        }

        return true;
      } catch (error) {
        console.error('[ScrubberIntegration] Custom scrubber update failed:', error);
        return this._fallbackToOriginal('update', time);
      }
    }

    return this._fallbackToOriginal('update', time);
  }

  /**
   * Handle scrubbing end - delegates to appropriate system
   * @param {number} time - Final timeline time in milliseconds
   */
  async handleScrubEnd(time) {
    const progress = this._timeToProgress(time);

    if (this.isUsingCustomScrubber && this.scrubberAPI) {
      try {
        await this.scrubberAPI.endScrubbing(progress);
        this.isUsingCustomScrubber = false;

        if (this.integrationConfig.debugMode) {
          console.log('[ScrubberIntegration] Custom scrubber ended at progress:', progress);
        }

        return true;
      } catch (error) {
        console.error('[ScrubberIntegration] Custom scrubber end failed:', error);
        return this._fallbackToOriginal('end', time);
      }
    }

    return this._fallbackToOriginal('end', time);
  }

  /**
   * Configure integration behavior
   * @param {Object} config - Configuration options
   */
  configure(config) {
    this.integrationConfig = { ...this.integrationConfig, ...config };

    if (this.integrationConfig.debugMode) {
      console.log('[ScrubberIntegration] Configuration updated:', this.integrationConfig);
    }

    // Reinitialize scrubber if needed
    if (config.useCustomScrubber && !this.scrubberAPI) {
      this._initializeScrubberAPI();
    }
  }


  /**
   * Convert timeline time to progress (0-1)
   * @private
   */
  _timeToProgress(time) {
    if (!this.timelineManager.timelineData || this.timelineManager.timelineData.totalDuration === 0) {
      return 0;
    }

    return Math.max(0, Math.min(1, time / this.timelineManager.timelineData.totalDuration));
  }

  /**
   * Fallback to original scrubbing system
   * @private
   */
  _fallbackToOriginal(operation, time) {
    if (!this.integrationConfig.fallbackToOriginal) {
      console.warn('[ScrubberIntegration] Fallback disabled, operation failed:', operation);
      return false;
    }

    if (this.integrationConfig.debugMode) {
      console.log('[ScrubberIntegration] Falling back to original system for:', operation);
    }

    try {
      switch (operation) {
        case 'start':
          this.timelineManager._startScrubbing();
          return this.timelineManager._performScrubUpdate(time);

        case 'update':
          return this.timelineManager._performScrubUpdate(time);

        case 'end':
          this.timelineManager._endScrubbing();
          return true;

        default:
          console.warn('[ScrubberIntegration] Unknown fallback operation:', operation);
          return false;
      }
    } catch (error) {
      console.error('[ScrubberIntegration] Fallback also failed:', error);
      return false;
    }
  }

  /**
   * Clean up integration resources
   */
  destroy() {
    if (this.scrubberAPI) {
      this.scrubberAPI.destroy();
      this.scrubberAPI = null;
    }

    this.timelineManager = null;
    this.isUsingCustomScrubber = false;
  }
}

/**
 * Factory function to create scrubber integration
 * @param {MovieTimelineManager} timelineManager - Timeline manager instance
 * @returns {ScrubberIntegration} Integration instance
 */
export function createScrubberIntegration(timelineManager) {
  return new ScrubberIntegration(timelineManager);
}

