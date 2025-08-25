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
   * @param {string} elementType - Type of elements for special handling
   * @returns {Array} Interpolated elements
   */
  interpolateElements(fromElements, toElements, timeFactor, interpolateFn, elementType = null) {
    // Create lookup maps for efficient matching
    const fromMap = this._createElementMap(fromElements);
    const toMap = this._createElementMap(toElements);

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
        // Element is entering - fade in
        result.push(this._createEnteringElement(toElement, timeFactor));
      }
    }

    // Process exiting elements (in source but not in target)
    for (const [id, fromElement] of fromMap) {
      if (!processedFromIds.has(id)) {
        // Element is exiting - fade out
        result.push(this._createExitingElement(fromElement, timeFactor));
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
   * Create entering element with fade-in effect
   * @private
   */
  _createEnteringElement(element, timeFactor) {
    return {
      ...element,
      opacity: timeFactor,
      isEntering: true
    };
  }

  /**
   * Create exiting element with fade-out effect
   * @private
   */
  _createExitingElement(element, timeFactor) {
    return {
      ...element,
      opacity: 1 - timeFactor,
      isExiting: true
    };
  }

  /**
   * Classify elements into enter, update, and exit categories
   * Useful for staged animation systems
   */
  classifyElements(fromElements, toElements) {
    const fromMap = this._createElementMap(fromElements);
    const toMap = this._createElementMap(toElements);

    const enter = [];
    const update = [];
    const exit = [];

    // Find entering and updating elements
    for (const [id, toElement] of toMap) {
      if (fromMap.has(id)) {
        update.push({ from: fromMap.get(id), to: toElement });
      } else {
        enter.push(toElement);
      }
    }

    // Find exiting elements
    for (const [id, fromElement] of fromMap) {
      if (!toMap.has(id)) {
        exit.push(fromElement);
      }
    }

    return { enter, update, exit };
  }
}
