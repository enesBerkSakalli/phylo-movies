/**
 * Scale Utility Functions
 * Provides utilities for handling scale calculations, formatting, and visualization.
 */

/**
 * Get the current scale value for a given tree index
 * @param {Array} scaleList - Array of scale objects
 * @param {number} currentTreeIndex - Current tree index
 * @returns {number} Current scale value
 */
export function getCurrentScaleValue(scaleList, currentTreeIndex) {
  if (!scaleList || !Array.isArray(scaleList) || currentTreeIndex < 0) {
    return 0;
  }

  if (scaleList[currentTreeIndex] !== undefined) {
    const scaleItem = scaleList[currentTreeIndex];
    return typeof scaleItem === 'object' ? scaleItem.value : scaleItem;
  }

  return 0;
}

/**
 * Get the maximum scale value from the scale list
 * @param {Array} scaleList - Array of scale objects
 * @returns {number} Maximum scale value
 */
export function getMaxScaleValue(scaleList) {
  if (!scaleList || !Array.isArray(scaleList) || scaleList.length === 0) {
    return 1;
  }

  return Math.max(...scaleList.map((item) =>
    typeof item === 'object' ? item.value : item
  ));
}

/**
 * Calculate percentage of current scale relative to maximum
 * @param {number} currentScale - Current scale value
 * @param {number} maxScale - Maximum scale value
 * @returns {number} Percentage (0-100)
 */
export function calculateScalePercentage(currentScale, maxScale) {
  if (maxScale === 0) return 0;
  return Math.max(0, Math.min(100, (currentScale / maxScale) * 100));
}

/**
 * Format scale value for display
 * @param {number} value - Scale value to format
 * @param {number} decimals - Number of decimal places (default: 3)
 * @returns {string} Formatted scale value
 */
export function formatScaleValue(value, decimals = 3) {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0.000';
  }
  return value.toFixed(decimals);
}

/**
 * Create scale tooltip information
 * @param {Object} options - Tooltip options
 * @param {number} options.currentScale - Current scale value
 * @param {number} options.maxScale - Maximum scale value
 * @param {number} options.treeIndex - Current tree index
 * @param {number} options.totalTrees - Total number of trees
 * @returns {Object} Tooltip information object
 */
export function createScaleTooltipInfo(options) {
  const { currentScale, maxScale, treeIndex, totalTrees } = options;
  const percentage = calculateScalePercentage(currentScale, maxScale);

  return {
    branchLengthProgress: `Branch length progress: ${formatScaleValue(currentScale)} / ${formatScaleValue(maxScale)}`,
    currentPosition: `Current position: ${formatScaleValue(percentage, 1)}%`,
    currentTreeValue: `Current tree scale value: ${formatScaleValue(currentScale)} units`,
    maxTreeValue: `Maximum scale across all trees: ${formatScaleValue(maxScale)} units`,
    treePosition: `Currently viewing tree ${treeIndex + 1} of ${totalTrees}`
  };
}

/**
 * Update scale marker positions and values
 * @param {number} currentScale - Current scale value
 * @param {number} maxScale - Maximum scale value
 * @returns {Object} Scale marker update data
 */
export function getScaleMarkerData(currentScale, maxScale) {
  const percentage = calculateScalePercentage(currentScale, maxScale);

  return {
    progressPercentage: percentage,
    quarterValue: formatScaleValue(maxScale * 0.25),
    halfValue: formatScaleValue(maxScale * 0.5),
    threeQuarterValue: formatScaleValue(maxScale * 0.75),
    maxValue: formatScaleValue(maxScale),
    currentValue: formatScaleValue(currentScale),
    progressText: `${formatScaleValue(percentage, 1)}%`
  };
}

/**
 * Validate scale data integrity
 * @param {Array} scaleList - Scale list to validate
 * @returns {Object} Validation result
 */
export function validateScaleData(scaleList) {
  const result = {
    isValid: true,
    issues: []
  };

  if (!Array.isArray(scaleList)) {
    result.isValid = false;
    result.issues.push('Scale list is not an array');
    return result;
  }

  if (scaleList.length === 0) {
    result.isValid = false;
    result.issues.push('Scale list is empty');
    return result;
  }

  const invalidItems = scaleList.filter((item, index) => {
    if (typeof item === 'number') return false;
    if (typeof item === 'object' && item !== null && typeof item.value === 'number') return false;
    result.issues.push(`Invalid scale item at index ${index}: ${JSON.stringify(item)}`);
    return true;
  });

  if (invalidItems.length > 0) {
    result.isValid = false;
  }

  return result;
}

/**
 * Initialize scale tooltips system
 * @param {Object} guiContext - GUI context object containing scale methods
 * @returns {Function} Cleanup function to remove tooltips
 */
export function initializeScaleTooltips(guiContext) {
  // Create tooltip element
  const tooltip = document.createElement('div');
  tooltip.className = 'scale-tooltip';
  tooltip.id = 'scaleTooltip';
  document.body.appendChild(tooltip);

  // Add tooltips to scale elements using utility functions
  const scaleElements = [
    {
      selector: '.scale-progress-bar',
      getText: () => {
        const tooltipInfo = createScaleTooltipInfo({
          currentScale: guiContext.getCurrentScaleValue(),
          maxScale: guiContext.getMaxScale(),
          treeIndex: guiContext.currentTreeIndex,
          totalTrees: guiContext.scaleList?.length || 1
        });
        return tooltipInfo.branchLengthProgress;
      }
    },
    {
      selector: '.scale-current-marker',
      getText: () => {
        const tooltipInfo = createScaleTooltipInfo({
          currentScale: guiContext.getCurrentScaleValue(),
          maxScale: guiContext.getMaxScale(),
          treeIndex: guiContext.currentTreeIndex,
          totalTrees: guiContext.scaleList?.length || 1
        });
        return tooltipInfo.currentPosition;
      }
    },
    {
      selector: '#currentScaleText',
      getText: () => {
        const tooltipInfo = createScaleTooltipInfo({
          currentScale: guiContext.getCurrentScaleValue(),
          maxScale: guiContext.getMaxScale(),
          treeIndex: guiContext.currentTreeIndex,
          totalTrees: guiContext.scaleList?.length || 1
        });
        return tooltipInfo.currentTreeValue;
      }
    },
    {
      selector: '#maxScaleText',
      getText: () => {
        const tooltipInfo = createScaleTooltipInfo({
          currentScale: guiContext.getCurrentScaleValue(),
          maxScale: guiContext.getMaxScale(),
          treeIndex: guiContext.currentTreeIndex,
          totalTrees: guiContext.scaleList?.length || 1
        });
        return tooltipInfo.maxTreeValue;
      }
    },
    {
      selector: '#treeIndexText',
      getText: () => {
        const tooltipInfo = createScaleTooltipInfo({
          currentScale: guiContext.getCurrentScaleValue(),
          maxScale: guiContext.getMaxScale(),
          treeIndex: guiContext.currentTreeIndex,
          totalTrees: guiContext.scaleList?.length || 1
        });
        return tooltipInfo.treePosition;
      }
    }
  ];

  const eventListeners = [];

  scaleElements.forEach(({ selector, getText }) => {
    const element = document.querySelector(selector);
    if (element) {
      const mouseEnterHandler = (e) => {
        tooltip.textContent = getText();
        tooltip.classList.add('visible');
        updateTooltipPosition(e, tooltip);
      };

      const mouseMoveHandler = (e) => {
        updateTooltipPosition(e, tooltip);
      };

      const mouseLeaveHandler = () => {
        tooltip.classList.remove('visible');
      };

      element.addEventListener('mouseenter', mouseEnterHandler);
      element.addEventListener('mousemove', mouseMoveHandler);
      element.addEventListener('mouseleave', mouseLeaveHandler);

      eventListeners.push({
        element,
        events: [
          { type: 'mouseenter', handler: mouseEnterHandler },
          { type: 'mousemove', handler: mouseMoveHandler },
          { type: 'mouseleave', handler: mouseLeaveHandler }
        ]
      });
    }
  });

  // Return cleanup function
  return () => {
    eventListeners.forEach(({ element, events }) => {
      events.forEach(({ type, handler }) => {
        element.removeEventListener(type, handler);
      });
    });
    if (tooltip.parentNode) {
      tooltip.parentNode.removeChild(tooltip);
    }
  };
}

/**
 * Update tooltip position based on mouse event
 * @param {MouseEvent} event - Mouse event
 * @param {HTMLElement} tooltip - Tooltip element
 */
export function updateTooltipPosition(event, tooltip) {
  const rect = event.target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();

  let left = rect.left + (rect.width / 2);
  let top = rect.top - 10;

  // Ensure tooltip stays within viewport
  if (left + tooltipRect.width / 2 > window.innerWidth) {
    left = window.innerWidth - tooltipRect.width / 2 - 10;
  }
  if (left - tooltipRect.width / 2 < 0) {
    left = tooltipRect.width / 2 + 10;
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}
