/**
 * TimelineInterpolator - Handles tree interpolation and rendering
 */

import { ValidationError } from './constants.js';
import { useAppStore } from '../core/store.js';

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
            // Validate inputs
            this._validateInterpolationInputs(fromSegment, toSegment, progress);
            
            // Get interpolation data
            const interpolationData = this._prepareInterpolationData(
                fromSegment, 
                toSegment, 
                progress
            );
            
            // Get tree controller
            const treeController = this.getTreeController();
            if (!treeController) {
                throw new Error('TreeController not available for interpolation');
            }
            
            // Update color manager if needed
            this._updateColorManager(treeController, interpolationData.monophyleticData);
            
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
            if (!treeController) {
                throw new Error('TreeController not available for rendering');
            }

            // For instant rendering, we can use the tree controller's direct rendering methods
            // This would depend on the specific API of the tree controller
            const { getActualHighlightData, movieData } = useAppStore.getState();
            
            const latticeEdge = movieData?.lattice_edge_tracking?.[segment.index];
            const highlightEdges = latticeEdge ? [latticeEdge] : [];
            const monophyleticData = getActualHighlightData();

            this._updateColorManager(treeController, monophyleticData);

            // Use renderAllElements or similar method for instant rendering
            treeController.renderAllElements(segment.tree, {
                highlightEdges,
                showExtensions: true,
                showLabels: true
            });

        } catch (error) {
            console.error('[TimelineInterpolator] Error rendering segment:', error);
        }
    }

    /**
     * Validate interpolation inputs
     * @private
     * @param {Object} fromSegment - Source segment
     * @param {Object} toSegment - Target segment
     * @param {number} progress - Progress value
     * @throws {ValidationError} If inputs are invalid
     */
    _validateInterpolationInputs(fromSegment, toSegment, progress) {
        if (!fromSegment || !toSegment) {
            throw new ValidationError('Invalid segments provided for interpolation');
        }
        if (typeof progress !== 'number' || progress < 0 || progress > 1) {
            throw new ValidationError(`Invalid progress value: ${progress}. Must be between 0 and 1`);
        }
        if (!fromSegment.tree || !toSegment.tree) {
            throw new ValidationError('Segments missing tree data');
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
        const { getActualHighlightData, movieData } = useAppStore.getState();
        
        // Use natural tree order - let WebGL controller handle direction-aware diffing
        const sourceTree = fromSegment.tree;
        const targetTree = toSegment.tree;
            
        const interpolatedIndex = Math.round(
            fromSegment.index + (toSegment.index - fromSegment.index) * progress
        );
        
        const latticeEdge = movieData?.lattice_edge_tracking?.[interpolatedIndex];
        const highlightEdges = latticeEdge ? [latticeEdge] : [];
        
        return {
            sourceTree,
            targetTree,
            progress,
            interpolatedIndex,
            monophyleticData: getActualHighlightData(),
            renderOptions: {
                highlightEdges,
                showExtensions: true,
                showLabels: true
            }
        };
    }

    /**
     * Update color manager with monophyletic data
     * @private
     * @param {Object} treeController - Tree controller instance
     * @param {Array} monophyleticData - Monophyletic highlight data
     */
    _updateColorManager(treeController, monophyleticData) {
        if (treeController.colorManager && monophyleticData) {
            const transformedData = this._transformHighlightData(monophyleticData);
            treeController.colorManager.updateMarkedComponents(transformedData);
        }
    }

    /**
     * Transform highlight data to the format expected by ColorManager
     * @private
     * @param {Array} highlightData - Raw highlight data
     * @returns {Array} Transformed data as array of Sets
     */
    _transformHighlightData(highlightData) {
        if (!Array.isArray(highlightData) || highlightData.length === 0) {
            return [];
        }
        
        const isArrayOfArrays = highlightData.every(item => Array.isArray(item));
        return isArrayOfArrays 
            ? highlightData.map(innerArray => new Set(innerArray))
            : [new Set(highlightData)];
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