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
   * @param {Object} [options] - Optional { fromMap, toMap, velocityMap }
   *   - fromMap/toMap: precomputed id→element Maps
   *   - velocityMap: Map<id, { angularT }> for angle-only normalisation
   * @returns {Array} Interpolated elements
   */
  interpolateElements(fromElements, toElements, timeFactor, interpolateFn, options) {
    // Use precomputed maps if available, otherwise create valid maps
    // Note: If passed, they MUST be Map objects or convertible to iterables
    const fromMap = options?.fromMap || this._createElementMap(fromElements);
    const toMap = options?.toMap || this._createElementMap(toElements);
    const velocityMap = options?.velocityMap || null;

    const result = [];
    const processedFromIds = new Set();

    // Process elements in target (handles updating and entering)
    for (const [id, toElement] of toMap) {
      const fromElement = fromMap.get(id);

      if (fromElement) {
        // Element exists in both - interpolate
        processedFromIds.add(id);

        // Use per-element velocity entry when normalisation is active.
        // velocityEntry is { angularT } or null.
        const velocityEntry = velocityMap?.get(id) ?? null;

        // Keep the base eased time unchanged and pass angular remapping separately.
        result.push(interpolateFn(fromElement, toElement, timeFactor, fromElement, toElement, velocityEntry));
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
