/**
 * TrailBuilder - Manages motion trail generation for tree elements.
 * Creates smooth trails behind moving nodes and labels to help track motion.
 */

export class TrailBuilder {
  constructor(options = {}) {
    this.trailHistory = new Map(); // Map of element id -> array of past positions
    this.minDistanceSq = options.minDistanceSq || 0.25; // Minimum distance to record new point
  }

  /**
   * Build trail segments for nodes and labels
   * @param {Array} nodes - Array of node elements with position and id
   * @param {Array} labels - Array of label elements with position and id
   * @param {Object} config - Trail configuration
   * @param {boolean} config.enabled - Whether trails are enabled
   * @param {number} config.length - Maximum trail length
   * @param {number} config.opacity - Base trail opacity (0-1)
   * @returns {Array} Array of trail segment objects
   */
  buildTrails(nodes, labels, config) {
    const { enabled, length, opacity } = config;

    if (!enabled) return [];

    // Add current positions to history
    this._updateHistory(nodes, length);
    this._updateHistory(labels, length);

    // Generate trail segments from history
    const segments = [];

    (nodes || []).forEach(node => {
      this._generateSegments(node, 'node', opacity, segments);
    });

    (labels || []).forEach(label => {
      this._generateSegments(label, 'label', opacity, segments);
    });

    return segments;
  }

  /**
   * Clear all trail history (e.g., when starting new interpolation)
   */
  clearHistory() {
    this.trailHistory.clear();
  }

  /**
   * Clear history for specific element
   * @param {string} elementId - Element ID to clear
   */
  clearElement(elementId) {
    this.trailHistory.delete(elementId);
  }

  /**
   * Update configuration
   * @param {Object} options - Configuration options
   */
  configure(options) {
    if (options.minDistanceSq !== undefined) {
      this.minDistanceSq = options.minDistanceSq;
    }
  }

  /**
   * Get trail history for debugging
   * @returns {Map} Current trail history
   */
  getHistory() {
    return this.trailHistory;
  }

  // Private methods

  /**
   * Update trail history with current positions
   * @private
   */
  _updateHistory(elements, maxLength) {
    (elements || []).forEach(el => {
      const id = el.id;
      const [x, y] = el.position;

      let history = this.trailHistory.get(id);
      if (!history) history = [];

      const lastPoint = history[history.length - 1];

      // Only add point if it moved enough (avoid noise)
      if (!lastPoint || this._distanceSq(lastPoint, { x, y }) > this.minDistanceSq) {
        history.push({ x, y });

        // Limit history length
        if (history.length > maxLength) {
          history.shift();
        }

        this.trailHistory.set(id, history);
      }
    });
  }

  /**
   * Generate trail segments from element history
   * @private
   */
  _generateSegments(element, kind, baseOpacity, segments) {
    const id = element.id;
    const history = this.trailHistory.get(id) || [];

    // Need at least 2 points to make a segment
    if (history.length < 2) return;

    for (let i = 0; i < history.length - 1; i++) {
      const p0 = history[i];
      const p1 = history[i + 1];

      // Calculate age factor (older = more transparent)
      const ageFactor = (i + 1) / Math.max(1, history.length);
      const alphaFactor = baseOpacity * (1 - ageFactor);

      const segment = {
        id: `${id}-seg-${i}`,
        path: [[p0.x, p0.y, 0], [p1.x, p1.y, 0]],
        alphaFactor,
        kind
      };

      // Attach element-specific data
      if (kind === 'label') {
        segment.leaf = element.leaf;
      } else if (kind === 'node') {
        segment.node = element;
      }

      segments.push(segment);
    }
  }

  /**
   * Calculate squared distance between two points
   * @private
   */
  _distanceSq(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return dx * dx + dy * dy;
  }
}
