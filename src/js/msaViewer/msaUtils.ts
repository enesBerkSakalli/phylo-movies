/**
 * Utility functions for MSA Viewer
 */

import { MSA_WINDOW_CONFIG } from './constants';

/**
 * Throttle function for resize events
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Calculate adjusted dimensions accounting for WinBox borders
 */
export function getAdjustedDimensions(width: number, height: number): { width: number; height: number } {
  return {
    width: Math.max(MSA_WINDOW_CONFIG.MIN_SIZE, width - MSA_WINDOW_CONFIG.BORDER_OFFSET),
    height: Math.max(MSA_WINDOW_CONFIG.MIN_SIZE, height - MSA_WINDOW_CONFIG.BORDER_OFFSET)
  };
}

/**
 * Create MSA container element
 */
export function createMSAContainer(): HTMLDivElement {
  const container = document.createElement("div");
  container.id = "msa-winbox-content";

  Object.assign(container.style, {
    width: "100%",
    height: "100%",
    overflow: "hidden",
    position: "relative",
    boxSizing: "border-box"
  });

  return container;
}

/**
 * Load test MSA data for demonstration
 */
export function loadTestMSAData(): void {
  console.log("[MSA] Loading test data for demonstration");
  // This would trigger the data service to load test data
  window.dispatchEvent(new CustomEvent('load-test-msa-data'));
}
