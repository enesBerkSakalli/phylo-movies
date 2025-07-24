/**
 * Window calculation utilities for MSA (Multiple Sequence Alignment) position windows
 */

/**
 * Calculate MSA position window based on tree index and step size
 * @param {number} currentFullTreeDataIdx - 0-based index of current full tree data
 * @param {number} msaStepSize - Step size for MSA window advancement
 * @param {number} msaWindowSize - Size of the MSA window
 * @returns {Object} Window object with startPosition, midPosition, and endPosition (all 1-based)
 */
export function calculateWindow(currentFullTreeDataIdx, msaStepSize, msaWindowSize, treeListLength) {
    // Validate inputs
    if (currentFullTreeDataIdx < 0) {
        console.warn("[calculateWindow] Invalid currentFullTreeDataIdx:", currentFullTreeDataIdx);
        // Return a default window if the index is invalid
        const defaultEndPosition = (msaWindowSize && msaWindowSize > 0) ? msaWindowSize : 100;
        return { startPosition: 1, midPosition: 1, endPosition: Math.max(1, defaultEndPosition) };
    }

    if (!msaStepSize || msaStepSize <= 0) {
        console.warn("[calculateWindow] Invalid msaStepSize:", msaStepSize);
        msaStepSize = 1; // Default to 1
    }

    if (!msaWindowSize || msaWindowSize <= 0) {
        console.warn("[calculateWindow] Invalid msaWindowSize:", msaWindowSize);
        msaWindowSize = 100; // Default to 100
    }


    let midPosition =  (currentFullTreeDataIdx) * msaStepSize;
    let leftWindow = Math.trunc(msaWindowSize / 2);
    let rightWindow = Math.trunc((msaWindowSize -1) / 2);

    // Calculate positions: currentFullTreeDataIdx is the 0-based window frame.
    // msaStepSize is the increment for the start of each window frame.
    let startPosition = (midPosition - leftWindow);
    let endPosition = (midPosition+rightWindow);
    // Ensure positions are at least 1
    startPosition = Math.max(1, startPosition);
    // Ensure endPosition is at least startPosition
    endPosition = Math.min(treeListLength*msaStepSize, endPosition);


    return {
        startPosition: startPosition, // 1-based
        midPosition: midPosition,     // 1-based
        endPosition: endPosition,     // 1-based
    };
}
