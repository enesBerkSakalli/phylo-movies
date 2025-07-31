/**
 * TimelineInterpolator - Handles tree interpolation and rendering
 */


export class TimelineInterpolator {
    constructor(getTreeController, getTransitionResolver) {
        this.getTreeController = getTreeController;
        this.getTransitionResolver = getTransitionResolver;
    }

    /**
     * Interpolate between two timeline segments
     * @param {Object} fromSegment - Source segment
     * @param {Object} toSegment - Target segment
     * @param {number} progress - Interpolation progress (0-1)
     * @throws {ValidationError} If segments or progress are invalid
     */
    interpolate(fromSegment, toSegment, progress) {
        try {

            // Get interpolation data
            const interpolationData = this._prepareInterpolationData(
                fromSegment,
                toSegment,
                progress
            );

            // Get tree controller
            const treeController = this.getTreeController();


            // Delegate rendering to tree controller
            treeController.renderInterpolatedFrame(
                interpolationData.sourceTree,
                interpolationData.targetTree,
                interpolationData.progress,
                interpolationData.renderOptions
            );

        } catch (error) {
            this._handleInterpolationError(error, fromSegment, toSegment);
        }
    }

    /**
     * Render a specific segment instantly (no interpolation)
     * @param {Object} segment - Timeline segment to render
     */
    renderSegment(segment) {
        try {
            const treeController = this.getTreeController();
            
            // For grouped segments with interpolation data, render the first tree
            if (segment.hasInterpolation && segment.interpolationData?.length > 0) {
                treeController.renderAllElements(segment.interpolationData[0].tree);
            } else {
                treeController.renderAllElements(segment.tree);
            }
        } catch (error) {
            console.error('[TimelineInterpolator] Error rendering segment:', error);
        }
    }


    /**
     * Prepare interpolation data
     * @private
     * @param {Object} fromSegment - Source segment
     * @param {Object} toSegment - Target segment
     * @param {number} progress - Progress value
     * @returns {Object} Interpolation data
     */
    _prepareInterpolationData(fromSegment, toSegment, progress) {
        // Check if we're interpolating within a grouped segment
        if (fromSegment === toSegment && fromSegment.hasInterpolation && fromSegment.interpolationData?.length > 1) {
            // Interpolating within a single segment using its interpolation data
            const interpolationData = fromSegment.interpolationData;
            
            // Find the correct interpolation step based on progress
            const stepSize = 1 / (interpolationData.length - 1);
            const stepIndex = Math.min(
                Math.floor(progress / stepSize),
                interpolationData.length - 2
            );
            
            const fromStep = interpolationData[stepIndex];
            const toStep = interpolationData[stepIndex + 1];
            
            const stepStart = stepIndex * stepSize;
            const stepProgress = (progress - stepStart) / stepSize;
            
            return {
                sourceTree: fromStep.tree,
                targetTree: toStep.tree,
                progress: stepProgress,
                interpolatedIndex: Math.round(fromStep.originalIndex + (toStep.originalIndex - fromStep.originalIndex) * stepProgress),
                renderOptions: {}
            };
        } else {
            // Traditional interpolation between different segments
            const sourceTree = fromSegment.tree;
            const targetTree = toSegment.tree;
            const interpolatedIndex = Math.round(
                fromSegment.index + (toSegment.index - fromSegment.index) * progress
            );

            return {
                sourceTree,
                targetTree,
                progress,
                interpolatedIndex,
                renderOptions: {}
            };
        }
    }

    /**
     * Handle interpolation errors
     * @private
     * @param {Error} error - The error that occurred
     * @param {Object} fromSegment - Source segment
     * @param {Object} toSegment - Target segment
     */
    _handleInterpolationError(error, fromSegment, toSegment) {
        console.error('[TimelineInterpolator] Interpolation error:', {
            error: error.message,
            fromIndex: fromSegment?.index,
            toIndex: toSegment?.index,
            stack: error.stack
        });
    }
}
