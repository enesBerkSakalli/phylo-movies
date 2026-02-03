/**
 * ElementMatcher - Handles element matching and lifecycle during interpolation
 * Manages entering, updating, and exiting elements
 */
export class ElementMatcher {
  /**
   * Match and interpolate elements between two arrays
   * @param {Array} fromElements - Source elements
   * @param {Array} toElements - Target elements
   * @param {number} timeFactor - Interpolation factor (0-1)
   * @param {Function} interpolateFn - Function to interpolate matched elements
   * @param {Object} [precomputedMaps] - Optional cached maps { fromMap, toMap }
   * @returns {Array} Interpolated elements
   */
  interpolateElements(fromElements, toElements, timeFactor, interpolateFn, precomputedMaps) {
    // Use precomputed maps if available, otherwise create valid maps
    // Note: If passed, they MUST be Map objects or convertible to iterables
    const fromMap = precomputedMaps?.fromMap || this._createElementMap(fromElements);
    const toMap = precomputedMaps?.toMap || this._createElementMap(toElements);

    const result = [];
    const processedFromIds = new Set();

    // Process elements in target (handles updating and entering)
    for (const [id, toElement] of toMap) {
      const fromElement = fromMap.get(id);

      if (fromElement) {
        // Element exists in both - interpolate
        processedFromIds.add(id);

        // Pass the full from/to elements to the interpolation function
        // This allows the interpolator to access all necessary properties (e.g., for polar interpolation)
        result.push(interpolateFn(fromElement, toElement, timeFactor, fromElement, toElement));
      } else {
        // Element is entering - use target state
        // We interpolate(to, to, 1.0) to ensure derived properties (like paths) are calculated
        const computed = interpolateFn(toElement, toElement, 1.0, toElement, toElement);
        result.push(this._createEnteringElement(computed, timeFactor));
      }
    }

    // Process exiting elements (in source but not in target)
    for (const [id, fromElement] of fromMap) {
      if (!processedFromIds.has(id)) {
        // Element is exiting - use source state
        // We interpolate(from, from, 0.0) to ensure derived properties are calculated
        const computed = interpolateFn(fromElement, fromElement, 0.0, fromElement, fromElement);
        result.push(this._createExitingElement(computed));
      }
    }

    return result;
  }

  /**
   * Create element lookup map
   * @private
   */
  _createElementMap(elements) {
    return new Map(elements.map(el => [el.id, el]));
  }

  /**
   * Create entering element - appears instantly
   * @private
   */
  _createEnteringElement(element, timeFactor) {
    return {
      ...element,
      opacity: 1,  // Instant appearance, no fade-in
      isEntering: true
    };
  }

  /**
   * Create exiting element with fade-out effect
   * @private
   */
  _createExitingElement(element) {
    return {
      ...element,
      opacity: 1,
      isExiting: true
    };
  }


}
