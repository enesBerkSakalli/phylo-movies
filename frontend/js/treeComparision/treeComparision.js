import { ComparisonWindow } from "./ComparisonWindow.js";
import { InterpolationWindow } from "./InterpolationWindow.js";

/**
 * Main tree comparison manager - simplified to use core components directly
 */
class TreeComparisonManager {
  constructor() {
    this.comparisonWindow = new ComparisonWindow();
    this.interpolationWindow = new InterpolationWindow();
  }

  async createSideBySideComparison(options) {
    const windowInstance = await this.comparisonWindow.createSideBySideWindow(options);
    return windowInstance;
  }

  async createInterpolationWindow(options) {
    const windowInstance = await this.interpolationWindow.createInterpolationWindow(options);
    return windowInstance;
  }

  /**
   * Generate unique SVG ID
   */
  generateSvgId(prefix = 'tree-svg') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create singleton instance
const treeComparisonManager = new TreeComparisonManager();

// Clean public API - using both modal and window names for compatibility
export async function createSideBySideComparisonWindow(options) {
  return await treeComparisonManager.createSideBySideComparison(options);
}

export async function createSideBySideComparisonModal(options) {
  return await treeComparisonManager.createSideBySideComparison(options);
}

export async function createInterpolationWindow(options) {
  return await treeComparisonManager.createInterpolationWindow(options);
}

export async function createInterpolationModal(options) {
  return await treeComparisonManager.createInterpolationWindow(options);
}

