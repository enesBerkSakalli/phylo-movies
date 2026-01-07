/**
 * Window calculation utilities for MSA (Multiple Sequence Alignment) position windows
 *
 * IMPORTANT: This calculation MUST match the backend windowing logic in:
 * electron-app/backend/BranchArchitect/msa_to_trees/split_alignment/windowing.py
 *
 * The backend uses:
 *   - 0-indexed positions
 *   - Center at position (frame_index * step_size)
 *   - left_half = floor(window_size / 2)
 *   - right_half = ceil(window_size / 2)
 *   - Truncation at edges (NOT shifting)
 *
 * This frontend function converts to 1-indexed for display while matching
 * the same window boundaries as the backend.
 */

/**
 * Calculate MSA position window based on tree index and step size
 * Mirrors backend: windowing.py::create_windows_from_parameters()
 *
 * @param {number} currentFullTreeDataIdx - 0-based index of current full tree data (frame index)
 * @param {number} msaStepSize - Step size for MSA window advancement
 * @param {number} msaWindowSize - Size of the MSA window
 * @param {number} alignmentLength - Total length of the MSA alignment
 * @returns {Object} Window object with startPosition, midPosition, and endPosition (all 1-based)
 */
export function calculateWindow(currentFullTreeDataIdx, msaStepSize, msaWindowSize, alignmentLength) {
    // Validate inputs
    if (currentFullTreeDataIdx < 0) {
        console.warn("[calculateWindow] Invalid currentFullTreeDataIdx:", currentFullTreeDataIdx);
        // Return a default window if the index is invalid
        const defaultEndPosition = (msaWindowSize && msaWindowSize > 0) ? Math.ceil(msaWindowSize / 2) : 100;
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

    // Match backend calculation (0-indexed)
    // Backend: center_pos = frame_index * step_size
    const centerPos0 = currentFullTreeDataIdx * msaStepSize;

    // Backend: left_half = int(window_size / 2), right_half = ceil(window_size / 2)
    const leftHalf = Math.floor(msaWindowSize / 2);
    const rightHalf = Math.ceil(msaWindowSize / 2);

    // Backend: start_pos = max(0, center_pos - left_half)
    // Backend: end_pos = min(alignment_length, center_pos + right_half)
    // Note: Backend end_pos is EXCLUSIVE, so we use it directly for display
    const startPos0 = Math.max(0, centerPos0 - leftHalf);
    const endPos0 = Math.min(alignmentLength, centerPos0 + rightHalf);

    // Convert to 1-based for display (frontend convention)
    // startPosition is 1-based inclusive
    // endPosition is 1-based inclusive (so endPos0 which is exclusive becomes endPos0)
    const startPosition = startPos0 + 1;
    const endPosition = endPos0; // endPos0 is exclusive, so it equals 1-based inclusive end

    // midPosition is the algorithm's center point, but clamp it to be within the visible window
    // This ensures the displayed mid is always between start and end
    const rawMidPosition = centerPos0 + 1;
    const midPosition = Math.max(startPosition, Math.min(endPosition, rawMidPosition));

    return {
        startPosition: startPosition, // 1-based inclusive
        midPosition: midPosition,     // 1-based (center position, clamped to window)
        endPosition: endPosition,     // 1-based inclusive
    };
}
