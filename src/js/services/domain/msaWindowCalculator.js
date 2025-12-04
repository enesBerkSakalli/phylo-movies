/**
 * Window calculation utilities for MSA (Multiple Sequence Alignment) position windows
 */

/**
 * Calculate MSA position window based on tree index and step size
 * @param {number} currentFullTreeDataIdx - 0-based index of current full tree data
 * @param {number} msaStepSize - Step size for MSA window advancement
 * @param {number} msaWindowSize - Size of the MSA window
 * @param {number} treeListLength - Length of the tree list (or MSA length)
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

    // Calculate the center position for this window frame
    // For frame 0, midPosition should start at 1 (1-based indexing)
    // Each subsequent frame shifts by msaStepSize
    let midPosition = 1 + (currentFullTreeDataIdx * msaStepSize);

    // Calculate half-window sizes
    let leftWindow = Math.floor(msaWindowSize / 2);
    let rightWindow = Math.floor((msaWindowSize - 1) / 2);

    // Calculate start and end positions based on the center
    let startPosition = midPosition - leftWindow;
    let endPosition = midPosition + rightWindow;

    // Ensure positions stay within valid bounds (1 to treeListLength)
    startPosition = Math.max(1, startPosition);
    endPosition = Math.min(treeListLength, endPosition);

    // Adjust midPosition if it's outside the valid range
    // This can happen at the edges of the alignment
    midPosition = Math.max(1, Math.min(treeListLength, midPosition));

    return {
        startPosition: startPosition, // 1-based
        midPosition: midPosition,     // 1-based
        endPosition: endPosition,     // 1-based
    };
}
