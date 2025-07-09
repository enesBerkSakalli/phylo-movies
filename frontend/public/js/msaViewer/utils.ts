/**
 * Utility functions for AlignmentViewer2Component
 */

import { FastaAlignment, Alignment } from "alignment-viewer-2";

/**
 * Throttle function to limit the rate of function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;

  return (...args: Parameters<T>) => {
    const currentTime = Date.now();

    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}

/**
 * Parse MSA string into alignment object
 */
export function createAlignmentFromMSA(msaString: string): Alignment {
  if (!msaString) {
    throw new Error("No MSA string provided");
  }

  if (typeof msaString !== 'string') {
    throw new Error(`Expected string, got ${typeof msaString}`);
  }

  if (msaString.length === 0) {
    throw new Error("MSA string is empty");
  }

  // Check if it looks like FASTA format
  if (!msaString.trim().startsWith('>')) {
    throw new Error("MSA string does not appear to be in FASTA format (should start with '>')");
  }

  try {
    const upperCaseMSA = msaString.toUpperCase();
    const alignment = FastaAlignment.fromFileContents("MSA_ALIGNMENT", upperCaseMSA);
    return alignment;
  } catch (error: any) {
    throw new Error(`Failed to parse FASTA alignment: ${error.message}`);
  }
}

/**
 * Calculate world offset for viewport positioning
 * @param posStart - Starting position index
 * @param cellSizePx - Actual cell size in pixels from AlignmentViewer
 * @param fallbackWidth - Fallback width if cellSize not available
 */
export function calculateWorldOffset(posStart: number, cellSizePx?: number, fallbackWidth: number = 10): number {
  const actualCellWidth = cellSizePx || fallbackWidth;
  return posStart * actualCellWidth;
}

/**
 * Validate and clamp position indices to alignment bounds
 */
export function clampPosition(position: number, min: number, max: number): number {
  return Math.max(min, Math.min(position, max));
}