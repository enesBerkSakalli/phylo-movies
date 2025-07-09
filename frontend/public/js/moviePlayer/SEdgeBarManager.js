import { gsap } from 'gsap';
import '../../css/s-edge-bar.css'; // Import the new CSS file
/**
 * S-Edge Bar Manager - Creates visual progress bars for each s_edge transformation
 * ...existing code...
 */
export class SEdgeBarManager {
    /**
     * Track the last known GSAP timeline progress (fractional, 0-1)
     * This is the single source of truth for scrubber and UI updates during animation/scrubbing
     */
    lastTimelineProgress = 0;
    /**
     * @param {MovieData} movieData
     * @param {Gui} gui
     */
    constructor(movieData, gui) {
        console.log('[SEdgeBarManager] CONSTRUCTOR: Enhanced debug version loaded - timestamp', new Date().toISOString());

        // COMPREHENSIVE DATA STRUCTURE ANALYSIS
        console.log('[SEdgeBarManager] CONSTRUCTOR: Complete movieData structure:', {
            keys: Object.keys(movieData),
            tree_metadata_length: movieData.tree_metadata?.length,
            interpolated_trees_length: movieData.interpolated_trees?.length,
            tree_pair_solutions_keys: Object.keys(movieData.tree_pair_solutions || {}),
            lattice_edge_tracking_length: movieData.lattice_edge_tracking?.length,
            highlighted_elements_length: movieData.highlighted_elements?.length,
            s_edge_metadata: movieData.s_edge_metadata
        });

        // Deep analysis of tree_metadata structure
        if (movieData.tree_metadata && movieData.tree_metadata.length > 0) {
            console.log('[SEdgeBarManager] CONSTRUCTOR: tree_metadata analysis:');
            movieData.tree_metadata.forEach((meta, index) => {
                console.log(`  [${index}]: ${meta.tree_name || 'unnamed'} - Phase: ${meta.phase} - Pair: ${meta.tree_pair_key || 'none'} - Step: ${meta.step_in_pair || 'none'} - SEdge: ${meta.s_edge_tracker || 'none'}`);
            });
        }

        // Deep analysis of tree_pair_solutions structure
        if (movieData.tree_pair_solutions) {
            console.log('[SEdgeBarManager] CONSTRUCTOR: tree_pair_solutions analysis:');
            Object.entries(movieData.tree_pair_solutions).forEach(([pairKey, solution]) => {
                console.log(`  Pair ${pairKey}:`, {
                    lattice_edge_solutions: solution.lattice_edge_solutions ? Object.keys(solution.lattice_edge_solutions) : 'null',
                    lattice_edge_count: solution.lattice_edge_solutions ? Object.keys(solution.lattice_edge_solutions).length : 0,
                    other_keys: Object.keys(solution).filter(k => k !== 'lattice_edge_solutions')
                });
            });
        }

        this.movieData = movieData;
        this.gui = gui;
        this.sEdgeBars = new Map(); // Map<sEdgeKey, barElement>
        this.currentSEdgeKey = null;
        this.currentStep = 0;
        this.isTimelinePlaying = false;
        this.isScrubbing = false; // Track scrubbing state
        this.lastTimelineProgress = 0;

        // Zoom and mode control state
        this.currentZoomLevel = 1;
        this.maxZoomLevel = 5;
        this.minZoomLevel = 0.5;
        this.currentMode = 'auto'; // 'auto', 'detailed', 'grouped', 'overview'
        this.timelineSegments = null;

        // Initialize GSAP main timeline (single source of truth for progress)
        this.mainTimeline = gsap.timeline({ paused: true });
        // We'll set the onUpdate after segments are created, since we need segment data

        this._initializeSEdgeBars();
    }

    getCurrentFullTreeInfo(globalIndex) {
        if (!this.movieData || !this.movieData.tree_metadata) return { fullTreeIndex: 0, fullTreeName: '', fullTreeGlobalIndex: 0 };
        let lastFullTreeIdx = 0;
        let lastFullTreeName = '';
        let lastFullTreeGlobalIdx = 0;
        for (let i = 0; i <= globalIndex; i++) {
            const meta = this.movieData.tree_metadata[i];
            if (meta && (!meta.tree_pair_key || meta.phase === 'ORIGINAL')) {
                lastFullTreeIdx++;
                lastFullTreeName = meta.tree_name || `Tree ${lastFullTreeIdx}`;
                lastFullTreeGlobalIdx = i;
            }
        }
        // lastFullTreeIdx is 1-based, so subtract 1 for 0-based index
        return {
            fullTreeIndex: Math.max(0, lastFullTreeIdx - 1),
            fullTreeName: lastFullTreeName,
            fullTreeGlobalIndex: lastFullTreeGlobalIdx
        };
    }

    /**
     * Initialize visual bars for each s_edge
     * @private
     */
    _initializeSEdgeBars() {
        const { tree_metadata } = this.movieData;
        if (!tree_metadata) {
            console.warn('[SEdgeBarManager] No tree metadata available');
            return;
        }

        // Create all timeline segments in chronological order
        const timelineSegments = this._createTimelineSegments();

        // Store timeline segments for testing access
        this.timelineSegments = timelineSegments;

        // Create the timeline container
        this._createTimelineContainer();

        // Create a single timeline bar with all segments
        this._createSingleTimelineBar(timelineSegments);

        // Update the enhanced timeline metrics in the header
        this._updateTimelineMetrics(timelineSegments);

        // Initialize current position after a small delay to ensure DOM is ready
        setTimeout(() => {
            this.updateCurrentPosition();
            // Initialize zoom button states
            this._updateZoomButtonStates();
        }, 100);
    }

    /**
     * Update timeline metrics in the header with comprehensive information
     * @param {Array} timelineSegments - All timeline segments
     * @private
     */
    _updateTimelineMetrics(timelineSegments) {
        const totalTrees = timelineSegments.length;
        const interpolatedTrees = timelineSegments.filter(seg => seg.hasInterpolation).length;
        const originalTrees = timelineSegments.filter(seg => !seg.hasInterpolation).length;

        // Calculate tree pairs
        const treePairs = new Set();
        timelineSegments.forEach(seg => {
            if (seg.treePairKey) {
                treePairs.add(seg.treePairKey);
            }
        });
        const treePairCount = treePairs.size;

        // Calculate interpolation density
        const interpolationDensity = totalTrees > 0 ? Math.round((interpolatedTrees / totalTrees) * 100) : 0;

        // Update UI elements
        const sedgeCountElement = document.getElementById('sedgeCount');
        const fullTreeCountElement = document.getElementById('fullTreeCount');
        const interpolationDensityElement = document.getElementById('interpolationDensity');
        const treePairCountElement = document.getElementById('treePairCount');

        if (sedgeCountElement) {
            sedgeCountElement.textContent = totalTrees.toString();
        }

        if (fullTreeCountElement) {
            fullTreeCountElement.textContent = originalTrees.toString();
        }

        if (interpolationDensityElement) {
            interpolationDensityElement.textContent = `${interpolationDensity}%`;
        }

        if (treePairCountElement) {
            treePairCountElement.textContent = treePairCount.toString();
        }

        console.log('[SEdgeBarManager] Timeline metrics updated:', {
            totalTrees,
            originalTrees,
            interpolatedTrees,
            treePairCount,
            interpolationDensity: `${interpolationDensity}%`
        });
    }

    /**
     * Create a single timeline with all interpolation segments in chronological order
     * Each tree becomes a segment in one continuous row, like a movie timeline
     *
     * CRITICAL: Follows ProcessingResult logic where "No s-edges = No interpolation trees"
     * Only creates segments for trees where interpolation actually occurred
     * @returns {Array<object>} Array of all tree segments in chronological order
     * @private
     */
    _createTimelineSegments() {
        const { tree_pair_solutions, tree_metadata, interpolated_trees, lattice_edge_tracking } = this.movieData;
        const allSegments = [];

        // Debug: Log start of timeline segment creation
        console.log('[SEdgeBarManager] _createTimelineSegments: called', {
            tree_pair_solutions_keys: Object.keys(tree_pair_solutions || {}),
            tree_metadata_length: tree_metadata?.length,
            interpolated_trees_length: interpolated_trees?.length,
            lattice_edge_tracking_length: lattice_edge_tracking?.length
        });

        console.log('[SEdgeBarManager] _createTimelineSegments: tree_pair_solutions', tree_pair_solutions);
        console.log('[SEdgeBarManager] _createTimelineSegments: tree_metadata', tree_metadata);

        // Check if we have tree_pair_solutions to determine actual interpolation
        const hasPairSolutions = tree_pair_solutions &&
                                Object.keys(tree_pair_solutions).length > 0;

        if (hasPairSolutions) {
            // Use ProcessingResult logic: check tree_pair_solutions for actual interpolation
            tree_metadata.forEach((metadata, index) => {
                console.log('[SEdgeBarManager] _createTimelineSegments: forEach metadata', { index, metadata });
                const shouldInclude = this._shouldIncludeTreeInTimeline(metadata, index);
                console.log('[SEdgeBarManager] _createTimelineSegments: shouldInclude', { index, shouldInclude });
                if (shouldInclude) {
                    allSegments.push({
                        index,
                        metadata,
                        tree: interpolated_trees[index],
                        latticeEdge: lattice_edge_tracking?.[index] || null,
                        phase: metadata.phase,
                        sEdgeTracker: metadata.s_edge_tracker,
                        treePairKey: metadata.tree_pair_key,
                        stepInPair: metadata.step_in_pair,
                        treeName: metadata.tree_name || `Tree ${index}`,
                        hasInterpolation: (() => {
                            const result = this._hasActualInterpolation(metadata);
                            console.log(`[SEdgeBarManager] Creating segment ${index}: ${metadata.tree_name}, hasInterpolation=${result}`);
                            return result;
                        })()
                    });
                }
            });
        } else {
            // Fallback: Include all trees (backwards compatibility)
            tree_metadata.forEach((metadata, index) => {
                allSegments.push({
                    index,
                    metadata,
                    tree: interpolated_trees[index],
                    latticeEdge: lattice_edge_tracking?.[index] || null,
                    phase: metadata.phase,
                    sEdgeTracker: metadata.s_edge_tracker,
                    treePairKey: metadata.tree_pair_key,
                    stepInPair: metadata.step_in_pair,
                    treeName: metadata.tree_name || `Tree ${index}`,
                    hasInterpolation: false
                });
            });
        }

        // Already in chronological order by index
        console.log('[SEdgeBarManager] _createTimelineSegments: FINAL ANALYSIS');
        console.log(`[SEdgeBarManager] Total segments created: ${allSegments.length}`);

        // Group segments by type for analysis
        const originalSegments = allSegments.filter(s => !s.hasInterpolation);
        const interpolatedSegments = allSegments.filter(s => s.hasInterpolation);

        console.log(`[SEdgeBarManager] Original trees: ${originalSegments.length}`);
        console.log(`[SEdgeBarManager] Interpolated trees: ${interpolatedSegments.length}`);

        // Analyze segments by tree pair
        const pairGroups = {};
        allSegments.forEach(segment => {
            const pairKey = segment.treePairKey || 'original';
            if (!pairGroups[pairKey]) pairGroups[pairKey] = [];
            pairGroups[pairKey].push(segment);
        });

        console.log('[SEdgeBarManager] Segments by pair:');
        Object.entries(pairGroups).forEach(([pairKey, segments]) => {
            console.log(`  ${pairKey}: ${segments.length} segments`);
            segments.forEach(seg => {
                console.log(`    [${seg.index}] ${seg.treeName} - Phase: ${seg.phase} - Step: ${seg.stepInPair || 'none'} - SEdge: ${seg.sEdgeTracker || 'none'}`);
            });
        });

        console.log('[SEdgeBarManager] _createTimelineSegments: allSegments', allSegments);
        return allSegments;
    }

    /**
     * Determine if a tree should be included in the timeline based on ProcessingResult logic
     * @param {object} metadata - Tree metadata
     * @param {number} index - Tree index
     * @returns {boolean} Whether to include this tree
     * @private
     */
    _shouldIncludeTreeInTimeline(metadata) {
        // Always include original trees (no tree_pair_key)
        if (!metadata.tree_pair_key) {
            return true;
        }

        // Check if this tree pair actually has interpolation
        const pairSolution = this.movieData.tree_pair_solutions[metadata.tree_pair_key];
        console.log('[SEdgeBarManager] _shouldIncludeTreeInTimeline: checking pair', {
            tree_pair_key: metadata.tree_pair_key,
            pairSolution: pairSolution,
            hasSolution: !!pairSolution
        });

        if (!pairSolution) {
            return false; // No solution data = don't include
        }

        // Check if there are actual s-edges (lattice_edge_solutions)
        // lattice_edge_solutions is an object/dict, not an array
        const hasLatticeEdges = pairSolution.lattice_edge_solutions &&
                               Object.keys(pairSolution.lattice_edge_solutions).length > 0;

        console.log('[SEdgeBarManager] _shouldIncludeTreeInTimeline: lattice edges check', {
            lattice_edge_solutions: pairSolution.lattice_edge_solutions,
            hasLatticeEdges: hasLatticeEdges
        });

        if (!hasLatticeEdges) {
            // No s-edges = identical trees, only include if this is the original tree
            return metadata.step_in_pair === 1 || !metadata.step_in_pair;
        }

        // Has s-edges = include all interpolated trees
        return true;
    }

    /**
     * Check if metadata indicates actual interpolation occurred
     * @param {object} metadata - Tree metadata
     * @returns {boolean} Whether interpolation occurred
     * @private
     */
    _hasActualInterpolation(metadata) {
        console.log('[SEdgeBarManager] _hasActualInterpolation called with metadata:', metadata);

        // Check if this tree has a tree_pair_key (is interpolated)
        if (!metadata.tree_pair_key) {
            console.log('[SEdgeBarManager] _hasActualInterpolation: no tree_pair_key, returning false');
            return false; // Original tree, not interpolated
        }

        // Check if the tree pair actually has s-edges (actual interpolation)
        const pairSolution = this.movieData.tree_pair_solutions[metadata.tree_pair_key];
        console.log('[SEdgeBarManager] _hasActualInterpolation: pairSolution for', metadata.tree_pair_key, ':', pairSolution);

        if (!pairSolution) {
            console.log('[SEdgeBarManager] _hasActualInterpolation: no pairSolution, returning false');
            return false; // No solution data
        }

        // Check if there are actual s-edges in the solution
        const latticeEdgeSolutions = pairSolution.lattice_edge_solutions;
        const hasLatticeEdges = latticeEdgeSolutions &&
                               typeof latticeEdgeSolutions === 'object' &&
                               Object.keys(latticeEdgeSolutions).length > 0;

        console.log('[SEdgeBarManager] _hasActualInterpolation: lattice edge check:', {
            latticeEdgeSolutions,
            hasLatticeEdges,
            latticeKeys: latticeEdgeSolutions ? Object.keys(latticeEdgeSolutions) : 'null'
        });

        if (!hasLatticeEdges) {
            console.log('[SEdgeBarManager] _hasActualInterpolation: no lattice edges, returning false');
            return false; // No s-edges means identical trees, not interpolated
        }

        // Has s-edges and is not the original tree
        const isInterpolated = !!metadata.step_in_pair;

        console.log('[SEdgeBarManager] _hasActualInterpolation result:', {
            tree_pair_key: metadata.tree_pair_key,
            step_in_pair: metadata.step_in_pair,
            hasLatticeEdges,
            isInterpolated,
            finalResult: isInterpolated
        });

        return isInterpolated;
    }

    /**
     * CRITICAL: Check if interpolation should occur between two segments based on ProcessingResult logic
     * Only perform over-interpolation when ProcessingResult logic allows it
     * @param {object} fromSegment - Source segment
     * @param {object} toSegment - Target segment
     * @returns {boolean} Whether interpolation should occur
     * @private
     */
    _shouldInterpolateBetweenSegments(fromSegment, toSegment) {
        console.log(`[SEdgeBarManager] _shouldInterpolateBetweenSegments: fromIndex=${fromSegment?.index}, toIndex=${toSegment?.index}, fromHasInterpolation=${fromSegment?.hasInterpolation}, toHasInterpolation=${toSegment?.hasInterpolation}`);
        if (!fromSegment || !toSegment) {
            return false;
        }

        // Check if both segments are from the same tree pair
        const fromPairKey = fromSegment.treePairKey;
        const toPairKey = toSegment.treePairKey;

        if (fromPairKey && toPairKey && fromPairKey === toPairKey) {
            // Same tree pair - check if it has actual interpolation
            const pairSolution = this.movieData.tree_pair_solutions[fromPairKey];
            const hasInterpolation = pairSolution &&
                                    pairSolution.lattice_edge_solutions &&
                                    Object.keys(pairSolution.lattice_edge_solutions).length > 0;
            return hasInterpolation;
        }

        // Different tree pairs - check if both have actual interpolation
        const fromHasInterpolation = fromSegment.hasInterpolation;
        const toHasInterpolation = toSegment.hasInterpolation;

        // Allow interpolation if either segment has actual interpolation (for smooth transitions)
        return fromHasInterpolation || toHasInterpolation;
    }

    /**
     * Create the main container for the timeline
     * @private
     */
    _createTimelineContainer() {
        // Find the timeline container in the movie player bar
        const timelineContainer = document.querySelector('.timeline-container');
        if (!timelineContainer) {
            console.error('[SEdgeBarManager] Timeline container not found');
            return;
        }

        // Create interpolation timeline container
        const interpolationContainer = document.createElement('div');
        interpolationContainer.className = 'interpolation-timeline-container';
        interpolationContainer.innerHTML = `
            <div class="interpolation-timeline-header">
                <div class="timeline-header-left">
                    <span class="timeline-label">
                        <span class="material-icons" aria-hidden="true">timeline</span>
                        Phylogenetic Movie Timeline
                    </span>
                </div>
                <div class="timeline-header-metrics">
                    <div class="timeline-metric">
                        <span class="metric-label">Total</span>
                        <span class="metric-value" id="sedgeCount">0 trees</span>
                    </div>
                    <div class="timeline-metric">
                        <span class="metric-label">Full Trees</span>
                        <span class="metric-value" id="fullTreeCount">0</span>
                    </div>
                    <div class="timeline-metric">
                        <span class="metric-label">Interpolated</span>
                        <span class="metric-value" id="interpolationDensity">0%</span>
                    </div>
                    <div class="timeline-metric">
                        <span class="metric-label">Tree Pairs</span>
                        <span class="metric-value" id="treePairCount">0</span>
                    </div>
                </div>
                <div class="timeline-header-right">
                    <div class="timeline-zoom-controls">
                        <button class="zoom-button" id="zoomOutBtn" title="Zoom out timeline">
                            <span class="material-icons">zoom_out</span>
                        </button>
                        <div class="timeline-zoom-level" id="zoomLevel">1×</div>
                        <button class="zoom-button" id="zoomInBtn" title="Zoom in timeline">
                            <span class="material-icons">zoom_in</span>
                        </button>
                    </div>
                    <div class="timeline-mode-selector">
                        <button class="mode-button" id="detailedModeBtn" data-mode="detailed" title="Detailed view - all trees">Detail</button>
                        <button class="mode-button" id="groupedModeBtn" data-mode="grouped" title="Grouped view - tree pairs">Group</button>
                        <button class="mode-button" id="overviewModeBtn" data-mode="overview" title="Overview - compressed view">Overview</button>
                        <button class="mode-button auto active" id="autoModeBtn" data-mode="auto" title="Automatic mode selection">Auto</button>
                    </div>
                </div>
            </div>
            <div class="interpolation-timeline-track" id="interpolationTimeline">
                <!-- Timeline segments will be inserted here -->
            </div>
            <div class="timeline-scrubber-container">
                <div class="timeline-scrubber-track" id="timelineScrubberTrack">
                    <div class="timeline-scrubber-handle" id="timelineScrubberHandle"
                         tabindex="0" aria-label="Movie timeline scrubber"
                         title="Drag to navigate through the phylogenetic movie"></div>
                </div>
            </div>
            <div class="timeline-info">
                <div class="timeline-info-left">
                    <span class="current-position-indicator" id="currentPositionInfo">Tree 0 / 0</span>
                </div>
                <div class="timeline-info-right">
                    <span class="full-tree-position" id="fullTreePosition">Full Tree: 0 / 0</span>
                    <span class="interpolation-status" id="interpolationStatus">Original</span>
                </div>
            </div>
        `;

        // Insert after the main timeline
        timelineContainer.appendChild(interpolationContainer);

        // Setup zoom and mode control event handlers
        this._setupZoomControls();
    }

    /**
     * Create a single timeline bar with all segments
     * @param {Array} timelineSegments - All tree segments in chronological order
     * @private
     */
    _createSingleTimelineBar(timelineSegments) {
        const container = document.getElementById('interpolationTimeline');
        if (!container) return;

        // Use current mode or auto-determine if in auto mode
        let timelineMode;
        if (this.currentMode === 'auto') {
            timelineMode = this._determineTimelineMode(timelineSegments);
        } else {
            timelineMode = this.currentMode;
        }

        console.log('[SEdgeBarManager] Timeline mode:', timelineMode, '(current mode:', this.currentMode + ')');

        // Update mode selector UI
        this._updateModeSelector(timelineMode);

        // Clear container and apply appropriate CSS class
        container.innerHTML = '';
        container.className = `interpolation-timeline-track ${timelineMode}-mode`;

        // Create segments based on timeline mode
        if (timelineMode === 'overview') {
            this._createOverviewTimeline(container, timelineSegments);
        } else if (timelineMode === 'grouped') {
            this._createGroupedTimeline(container, timelineSegments);
        } else {
            this._createDetailedTimeline(container, timelineSegments);
        }
    }

    /**
     * Determine optimal timeline mode based on dataset characteristics
     * @param {Array} timelineSegments - All timeline segments
     * @returns {string} Timeline mode: 'detailed', 'grouped', or 'overview'
     * @private
     */
    _determineTimelineMode(timelineSegments) {
        const totalTrees = timelineSegments.length;
        const fullTrees = timelineSegments.filter(s => !s.hasInterpolation).length;
        const interpolatedTrees = timelineSegments.filter(s => s.hasInterpolation).length;
        const avgInterpolationPerPair = fullTrees > 1 ? interpolatedTrees / (fullTrees - 1) : 0;

        console.log('[SEdgeBarManager] Timeline mode analysis:', {
            totalTrees,
            fullTrees,
            interpolatedTrees,
            avgInterpolationPerPair
        });

        // Thresholds for different modes
        if (totalTrees > 500 || avgInterpolationPerPair > 50) {
            return 'overview';
        } else if (totalTrees > 100 || avgInterpolationPerPair > 15) {
            return 'grouped';
        } else {
            return 'detailed';
        }
    }

    /**
     * Create detailed timeline for small datasets (< 100 trees)
     * @param {HTMLElement} container - Timeline container
     * @param {Array} timelineSegments - All timeline segments
     * @private
     */
    _createDetailedTimeline(container, timelineSegments) {
        console.log('[SEdgeBarManager] _createDetailedTimeline: Creating detailed segments');
        const segmentsHtml = timelineSegments.map((segment, index) => {
            const segmentClass = this._getTimelineSegmentClass(segment);
            const tooltip = this._getSegmentTooltip(segment, index, timelineSegments.length);

            // Check if this is a Full Tree (original tree)
            const isFullTree = !segment.hasInterpolation && (!segment.treePairKey || segment.phase === 'ORIGINAL');

            console.log(`[SEdgeBarManager] Creating segment ${index}:`, {
                treeName: segment.treeName,
                phase: segment.phase,
                sEdgeTracker: segment.sEdgeTracker,
                hasInterpolation: segment.hasInterpolation,
                isFullTree,
                segmentClass,
                tooltip
            });

            return `
                <div class="timeline-segment ${segmentClass} ${isFullTree ? 'full-tree-segment' : ''}"
                     data-tree-index="${segment.index}"
                     data-position="${index}"
                     data-phase="${segment.phase}"
                     data-sedge="${segment.sEdgeTracker || 'none'}"
                     data-is-full-tree="${isFullTree}"
                     title="${tooltip}">
                    <div class="segment-progress"></div>
                </div>
            `;
        }).join('');

        container.innerHTML = segmentsHtml;
        container.className = 'interpolation-timeline-track detailed-mode';

        // Store reference to timeline segments
        this.timelineSegments = timelineSegments;
        this.currentSegmentIndex = 0;

        // Set up standard timeline functionality
        this._setupTimelineInteraction(container, timelineSegments);
    }

    /**
     * Create grouped timeline for medium datasets (100-500 trees)
     * Groups interpolation steps by tree pairs
     * @param {HTMLElement} container - Timeline container
     * @param {Array} timelineSegments - All timeline segments
     * @private
     */
    _createGroupedTimeline(container, timelineSegments) {
        console.log('[SEdgeBarManager] _createGroupedTimeline: Creating grouped segments');

        // Group segments by tree pairs
        const groupedSegments = this._groupSegmentsByTreePairs(timelineSegments);

        const groupsHtml = groupedSegments.map((group, groupIndex) => {
            const isFullTreeGroup = group.type === 'full-tree';
            const segmentCount = group.segments.length;

            if (isFullTreeGroup) {
                // Full tree - single prominent segment
                const segment = group.segments[0];
                const tooltip = this._getSegmentTooltip(segment, segment.originalIndex, timelineSegments.length);

                return `
                    <div class="timeline-group full-tree-group"
                         data-tree-index="${segment.index}"
                         data-group-type="full-tree"
                         title="${tooltip}">
                        <div class="group-content full-tree-segment">
                            <div class="group-label">FT${groupIndex + 1}</div>
                        </div>
                    </div>
                `;
            } else {
                // Interpolation group - condensed representation
                const firstSegment = group.segments[0];
                const lastSegment = group.segments[group.segments.length - 1];
                const treePairKey = group.treePairKey;

                return `
                    <div class="timeline-group interpolation-group"
                         data-tree-pair="${treePairKey}"
                         data-group-type="interpolation"
                         data-segment-count="${segmentCount}"
                         title="Tree pair ${treePairKey}: ${segmentCount} interpolation steps">
                        <div class="group-content interpolation-segment">
                            <div class="group-label">${segmentCount}</div>
                            <div class="group-progress">
                                <div class="progress-bar"></div>
                            </div>
                        </div>
                    </div>
                `;
            }
        }).join('');

        container.innerHTML = groupsHtml;
        container.className = 'interpolation-timeline-track grouped-mode';

        // Store reference to timeline segments and groups
        this.timelineSegments = timelineSegments;
        this.groupedSegments = groupedSegments;
        this.currentSegmentIndex = 0;

        // Set up grouped timeline functionality
        this._setupGroupedTimelineInteraction(container, groupedSegments, timelineSegments);
    }

    /**
     * Create overview timeline for large datasets (> 500 trees)
     * Shows only full trees with interpolation density indicators
     * @param {HTMLElement} container - Timeline container
     * @param {Array} timelineSegments - All timeline segments
     * @private
     */
    _createOverviewTimeline(container, timelineSegments) {
        console.log('[SEdgeBarManager] _createOverviewTimeline: Creating overview segments');

        // Extract only full trees and their interpolation densities
        const overviewSegments = this._createOverviewSegments(timelineSegments);

        const segmentsHtml = overviewSegments.map((segment, index) => {
            const densityClass = this._getDensityClass(segment.interpolationDensity);

            return `
                <div class="timeline-overview-segment ${densityClass}"
                     data-tree-index="${segment.fullTreeIndex}"
                     data-full-tree-number="${index + 1}"
                     data-interpolation-count="${segment.interpolationCount}"
                     title="Full Tree ${index + 1}: ${segment.treeName} (${segment.interpolationCount} interpolation steps)">
                    <div class="overview-content">
                        <div class="full-tree-marker"></div>
                        <div class="density-indicator" style="height: ${Math.min(segment.interpolationDensity * 100, 100)}%"></div>
                        <div class="tree-label">FT${index + 1}</div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = segmentsHtml;
        container.className = 'interpolation-timeline-track overview-mode';

        // Store reference to timeline segments and overview data
        this.timelineSegments = timelineSegments;
        this.overviewSegments = overviewSegments;
        this.currentSegmentIndex = 0;

        // Set up overview timeline functionality
        this._setupOverviewTimelineInteraction(container, overviewSegments, timelineSegments);
    }

    /**
     * Group timeline segments by tree pairs for grouped view
     * @param {Array} timelineSegments - All timeline segments
     * @returns {Array} Grouped segments
     * @private
     */
    _groupSegmentsByTreePairs(timelineSegments) {
        const groups = [];
        let currentGroup = null;

        timelineSegments.forEach((segment, index) => {
            const isFullTree = !segment.hasInterpolation && (!segment.treePairKey || segment.phase === 'ORIGINAL');

            if (isFullTree) {
                // Start new full tree group
                groups.push({
                    type: 'full-tree',
                    segments: [{ ...segment, originalIndex: index }]
                });
            } else {
                // Check if this belongs to current interpolation group
                if (currentGroup && currentGroup.treePairKey === segment.treePairKey) {
                    currentGroup.segments.push({ ...segment, originalIndex: index });
                } else {
                    // Start new interpolation group
                    currentGroup = {
                        type: 'interpolation',
                        treePairKey: segment.treePairKey,
                        segments: [{ ...segment, originalIndex: index }]
                    };
                    groups.push(currentGroup);
                }
            }
        });

        return groups;
    }

    /**
     * Create overview segments showing only full trees with interpolation density
     * @param {Array} timelineSegments - All timeline segments
     * @returns {Array} Overview segments
     * @private
     */
    _createOverviewSegments(timelineSegments) {
        const overviewSegments = [];
        const fullTreeSegments = timelineSegments.filter(s => !s.hasInterpolation && (!s.treePairKey || s.phase === 'ORIGINAL'));

        fullTreeSegments.forEach((fullTree, index) => {
            // Find interpolation segments following this full tree
            const nextFullTreeIndex = fullTreeSegments[index + 1]?.index || timelineSegments.length;
            const interpolationSegments = timelineSegments.filter(s =>
                s.index > fullTree.index && s.index < nextFullTreeIndex && s.hasInterpolation
            );

            const interpolationCount = interpolationSegments.length;
            const maxInterpolationInDataset = Math.max(...fullTreeSegments.map((ft, i) => {
                const nextFt = fullTreeSegments[i + 1]?.index || timelineSegments.length;
                return timelineSegments.filter(s => s.index > ft.index && s.index < nextFt && s.hasInterpolation).length;
            }));

            const interpolationDensity = maxInterpolationInDataset > 0 ? interpolationCount / maxInterpolationInDataset : 0;

            overviewSegments.push({
                fullTreeIndex: fullTree.index,
                treeName: fullTree.treeName,
                interpolationCount,
                interpolationDensity
            });
        });

        return overviewSegments;
    }

    /**
     * Get CSS class for interpolation density
     * @param {number} density - Density value (0-1)
     * @returns {string} CSS class name
     * @private
     */
    _getDensityClass(density) {
        if (density > 0.7) return 'high-density';
        if (density > 0.3) return 'medium-density';
        return 'low-density';
    }

    /**
     * Set up interaction for standard detailed timeline
     * @param {HTMLElement} container - Timeline container
     * @param {Array} timelineSegments - Timeline segments
     * @private
     */
    _setupTimelineInteraction(container, timelineSegments) {
        // Add click handlers for navigation
        this._addTimelineClickHandlers(container, timelineSegments);

        // Add timeline scrubber functionality
        this._addTimelineScrubber(timelineSegments);
    }

    /**
     * Set up interaction for grouped timeline
     * @param {HTMLElement} container - Timeline container
     * @param {Array} groupedSegments - Grouped segments
     * @param {Array} timelineSegments - Original timeline segments
     * @private
     */
    _setupGroupedTimelineInteraction(container, groupedSegments, timelineSegments) {
        // Add click handlers for group navigation
        container.addEventListener('click', async (e) => {
            const group = e.target.closest('.timeline-group');
            if (group && container.contains(group)) {
                e.stopPropagation();
                const groupType = group.dataset.groupType;

                if (groupType === 'full-tree') {
                    const treeIndex = parseInt(group.dataset.treeIndex);
                    await this.gui.goToPosition(treeIndex);
                } else if (groupType === 'interpolation') {
                    const treePair = group.dataset.treePair;
                    const segmentCount = parseInt(group.dataset.segmentCount);
                    // Navigate to first interpolation step in this group
                    const firstInterpolationIndex = timelineSegments.findIndex(s => s.treePairKey === treePair);
                    if (firstInterpolationIndex !== -1) {
                        await this.gui.goToPosition(timelineSegments[firstInterpolationIndex].index);
                    }
                }
            }
        });
    }

    /**
     * Set up interaction for overview timeline
     * @param {HTMLElement} container - Timeline container
     * @param {Array} overviewSegments - Overview segments
     * @param {Array} timelineSegments - Original timeline segments
     * @private
     */
    _setupOverviewTimelineInteraction(container, overviewSegments, timelineSegments) {
        // Add click handlers for overview navigation
        container.addEventListener('click', async (e) => {
            const segment = e.target.closest('.timeline-overview-segment');
            if (segment && container.contains(segment)) {
                e.stopPropagation();
                const treeIndex = parseInt(segment.dataset.treeIndex);
                await this.gui.goToPosition(treeIndex);
            }
        });
    }

    /**
     * Original timeline setup method - kept for backward compatibility
     * @param {HTMLElement} container - Timeline container
     * @param {Array} timelineSegments - Timeline segments
     * @private
     */
    _setupOriginalTimelineInteraction(container, timelineSegments) {
        // Set up GSAP mainTimeline onUpdate callback (centralized progress/UI/tree update)
        this.mainTimeline.eventCallback('onUpdate', () => {
            console.log('[SEdgeBarManager] GSAP onUpdate called');
            const progress = this.mainTimeline.progress();
            this.lastTimelineProgress = progress;
            // Update scrubber handle position
            this._updateGlobalTimelineScrubber(progress);
            // Update animation percentage UI
            this._updateTimelineProgressInfo(progress);
            // Continuous morph: interpolate between current and next segment
            const totalSegments = this.timelineSegments.length;
            const segmentCount = Math.max(1, totalSegments - 1);
            const exactPosition = progress * segmentCount;
            let fromIndex = Math.floor(exactPosition);
            let toIndex = Math.min(fromIndex + 1, totalSegments - 1);
            fromIndex = Math.max(0, Math.min(fromIndex, totalSegments - 1));
            const t = exactPosition - fromIndex;
            const fromSegment = this.timelineSegments[fromIndex];
            const toSegment = this.timelineSegments[toIndex];
            console.log('[SEdgeBarManager] Segment info:', { fromIndex, toIndex, t, fromSegment, toSegment });
            if (this.gui && this.gui.treeController && fromSegment && toSegment) {
                // Try to get a unique identifier for the trees
                const fromTreeId = fromSegment.tree?.name || JSON.stringify(fromSegment.tree).slice(0, 80);
                const toTreeId = toSegment.tree?.name || JSON.stringify(toSegment.tree).slice(0, 80);
                const treesIdentical = fromSegment.tree === toSegment.tree || JSON.stringify(fromSegment.tree) === JSON.stringify(toSegment.tree);
                console.log('[SEdgeBarManager] renderInterpolatedFrame:', {
                    fromIndex,
                    toIndex,
                    t,
                    fromTreeId,
                    toTreeId,
                    treesIdentical
                });
                this.gui.treeController.renderInterpolatedFrame(
                    fromSegment.tree,
                    toSegment.tree,
                    t
                );
            }
            // Optionally update sEdge info for the current segment (use fromSegment)
            if (fromSegment.sEdgeTracker && fromSegment.sEdgeTracker !== "None") {
                this._updateSEdgePositionInfo(fromSegment.sEdgeTracker, fromSegment.step_in_pair || 1, fromSegment.phase);
            }
        });

        // Add click handlers for navigation
        this._addTimelineClickHandlers(container, timelineSegments);

        // Add timeline scrubber functionality
        this._addTimelineScrubber(timelineSegments);
    }

    /**
     * Add click handlers for timeline navigation
     * @param {HTMLElement} container - Timeline container
     * @param {Array} timelineSegments - Timeline segments
     * @private
     */
    _addTimelineClickHandlers(container, timelineSegments) {
        // Use event delegation for robust click handling
        container.addEventListener('click', async (e) => {
            const segment = e.target.closest('.timeline-segment');
            if (segment && container.contains(segment)) {
                e.stopPropagation();
                const treeIndex = parseInt(segment.dataset.treeIndex);
                const segmentPosition = parseInt(segment.dataset.position);
                const totalSegments = timelineSegments.length;
                const segmentCount = Math.max(1, totalSegments - 1);
                // Calculate GSAP progress for this segment
                const progress = segmentPosition / segmentCount;
                console.log('[SEdgeBarManager] (Delegated) Timeline segment clicked:', segment, 'treeIndex:', treeIndex, 'progress:', progress);
                this.lastTimelineProgress = progress;
                await this.gui.goToPosition(treeIndex);
                // After updating the tree, update the scrubber and UI using progress
                this._updateGlobalTimelineScrubber(progress);
            }
        });
    }

    /**
     * Add timeline scrubber functionality
     * @param {Array<object>} timelineSegments - Timeline segments
     * @private
     */
    _addTimelineScrubber(timelineSegments) {
        const scrubberHandle = document.getElementById('timelineScrubberHandle');
        const scrubberTrack = document.getElementById('timelineScrubberTrack');
        if (!scrubberHandle || !scrubberTrack) {
            console.warn('[SEdgeBarManager] Timeline scrubber elements not found');
            return;
        }

        let isDragging = false;
        let startX = 0;
        let startLeft = 0;

        const handleMouseDown = (e) => {
            isDragging = true;
            startX = e.clientX;
            startLeft = parseFloat(scrubberHandle.style.left) || 0;
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            e.preventDefault();
        };

        const handleMouseMove = (e) => {
            if (!isDragging) return;
            const deltaX = e.clientX - startX;
            const trackWidth = scrubberTrack.offsetWidth;
            const handleWidth = scrubberHandle.offsetWidth;
            const newLeft = startLeft + deltaX;
            const maxLeft = trackWidth - handleWidth;
            const constrainedLeft = Math.max(0, Math.min(newLeft, maxLeft));

            const percentage = constrainedLeft / maxLeft;
            this.lastTimelineProgress = percentage;
            scrubberHandle.style.left = constrainedLeft + 'px';
            this.isScrubbing = true;
            this._updateTimelineProgressInfo(percentage);
            const totalSegments = timelineSegments.length;
            const segmentCount = Math.max(1, totalSegments - 1);
            const exactPosition = percentage * segmentCount;
            const segmentIndex = Math.floor(exactPosition);
            const segmentProgress = exactPosition - segmentIndex;
            const segments = scrubberTrack.querySelectorAll('.timeline-segment');
            segments.forEach((segment, index) => {
                segment.classList.remove('active');
                if (index === segmentIndex) {
                    segment.classList.add('active');
                }
            });

            if (this.isScrubbing) {
                const fromSegment = timelineSegments[segmentIndex];
                const toSegment = timelineSegments[Math.min(segmentIndex + 1, totalSegments - 1)];
                if (segmentProgress > 0 && segmentIndex < totalSegments - 1 && this._shouldInterpolateBetweenSegments(fromSegment, toSegment)) {
                    this._renderTimelineInterpolation(fromSegment, toSegment, segmentProgress);
                } else {
                    const targetSegment = (segmentProgress === 0 || segmentIndex === totalSegments - 1) ? fromSegment : (segmentProgress < 0.5 ? fromSegment : toSegment);
                    if (this.gui && this.gui.treeController) {
                        this.gui.treeController.updateParameters({
                            treeData: targetSegment.tree,
                            drawDuration: 0
                        });
                        this.gui.treeController.renderAllElements();
                    }
                    if (targetSegment.sEdgeTracker && targetSegment.sEdgeTracker !== "None") {
                        this._updateSEdgePositionInfo(targetSegment.sEdgeTracker, targetSegment.step_in_pair || 1, targetSegment.phase);
                    }
                }
            }
        };

        const handleMouseUp = () => {
            isDragging = false;
            this.isScrubbing = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);

            // Calculate current position but DON'T snap - preserve interpolated position
            const handleLeft = parseFloat(scrubberHandle.style.left) || 0;
            const maxLeft = Math.max(1, scrubberTrack.offsetWidth - scrubberHandle.offsetWidth);
            const percentage = handleLeft / maxLeft;
            const totalSegments = timelineSegments.length;
            const segmentCount = Math.max(1, totalSegments - 1);

            // Update lastTimelineProgress to current scrubber position (preserves interpolation)
            this.lastTimelineProgress = percentage;

            // Keep the interpolated tree state by NOT calling gui.goToPosition()
            // Just update the position info display to reflect current interpolated state
            const exactPosition = percentage * segmentCount;
            const fromIndex = Math.floor(exactPosition);
            const toIndex = Math.min(fromIndex + 1, totalSegments - 1);
            const segmentProgress = exactPosition - fromIndex;

            const fromSegment = timelineSegments[fromIndex];
            const toSegment = timelineSegments[toIndex];

            // Update position info for the interpolated state
            this._updateTimelineProgressInfo(percentage);

            console.log('[SEdgeBarManager] Scrubbing ended - preserving interpolated position:', {
                percentage,
                fromIndex,
                toIndex,
                segmentProgress,
                fromSegment: fromSegment?.treeName,
                toSegment: toSegment?.treeName
            });

            // Keep the current interpolated tree rendering (don't clear interpolation state)
            // The tree should stay exactly where the user left it during scrubbing
        };

        scrubberHandle.addEventListener('mousedown', handleMouseDown);
        scrubberTrack.addEventListener('click', (e) => {
            if (e.target === scrubberTrack) {
                const rect = scrubberTrack.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const percentage = clickX / scrubberTrack.offsetWidth;
                this.lastTimelineProgress = percentage;
                this._updateTimelineProgressInfo(percentage);
                const segmentCount = Math.max(1, timelineSegments.length - 1);
                const segmentIndex = Math.round(percentage * segmentCount);
                const clampedIndex = Math.max(0, Math.min(segmentIndex, timelineSegments.length - 1));
                const snappedProgress = clampedIndex / segmentCount;
                this.lastTimelineProgress = snappedProgress;
                const targetSegment = timelineSegments[clampedIndex];
                if (targetSegment && this.gui) {
                    this.gui.goToPosition(targetSegment.index);
                }
            }
        });
    }

    /**
     * Get CSS class for timeline segment based on tree type
     * @param {object} segment - Tree segment data
     * @returns {string} CSS class names
     * @private
     */
    _getTimelineSegmentClass(segment) {
        let classes = [];

        // Phase-based coloring
        if (segment.phase) {
            classes.push(this._getPhaseClass(segment.phase));
        }

        // S-edge vs stable tree distinction
        if (segment.sEdgeTracker && segment.sEdgeTracker !== "None") {
            classes.push('interpolated-tree');

            // Subtree size indication
            const leafIndices = this._parseLeafIndices(segment.sEdgeTracker);
            if (leafIndices.length <= 3) {
                classes.push('small-change');
            } else if (leafIndices.length <= 6) {
                classes.push('medium-change');
            } else {
                classes.push('large-change');
            }
        } else {
            classes.push('original-tree');
        }

        return classes.join(' ');
    }

    /**
     * Get tooltip text for timeline segment
     * @param {object} segment - Tree segment data
     * @param {number} index - Position in timeline
     * @param {number} total - Total segments
     * @returns {string} Tooltip text
     * @private
     */
    _getSegmentTooltip(segment, index, total) {
        const position = `Tree ${index + 1} of ${total}`;
        const treeName = segment.treeName;
        const isFullTree = !segment.hasInterpolation && (!segment.treePairKey || segment.phase === 'ORIGINAL');

        if (isFullTree) {
            // Calculate full tree number
            const fullTreeNumber = this.timelineSegments.slice(0, index + 1)
                .filter(s => !s.hasInterpolation && (!s.treePairKey || s.phase === 'ORIGINAL')).length;
            return `FULL TREE ${fullTreeNumber}: ${treeName} - Original reconstructed tree (stable state)`;
        } else if (segment.sEdgeTracker && segment.sEdgeTracker !== "None") {
            const leafIndices = this._parseLeafIndices(segment.sEdgeTracker);
            const phaseDisplay = this._getPhaseDisplayName(segment.phase);
            return `${position}: ${treeName} - ${phaseDisplay} phase (modifying leaves: ${leafIndices.join(', ')})`;
        } else {
            return `${position}: ${treeName} - Interpolation step`;
        }
    }

    /**
     * Get CSS class for different phases
     * @param {string} phase - Phase name
     * @returns {string} CSS class name
     * @private
     */
    _getPhaseClass(phase) {
        switch (phase) {
            case 'DOWN_PHASE': return 'phase-down';
            case 'COLLAPSE_PHASE': return 'phase-collapse';
            case 'REORDER_PHASE': return 'phase-reorder';
            case 'PRE_SNAP_PHASE': return 'phase-pre-snap';
            case 'SNAP_PHASE': return 'phase-snap';
            case 'ORIGINAL': return 'phase-original';
            default: return 'phase-unknown';
        }
    }


    /**
     * Parse leaf indices from s_edge_tracker string
     * @param {string} sEdgeKey - S-edge tracker like "(9,10,11)"
     * @returns {Array<number>} Array of leaf indices
     * @private
     */
    _parseLeafIndices(sEdgeKey) {
        try {
            if (!sEdgeKey || sEdgeKey.trim() === "") return [];

            // Remove parentheses and split by comma
            const cleanKey = sEdgeKey.replace(/[()]/g, '').trim();
            if (cleanKey === '') return [];

            return cleanKey.split(',').map(idx => parseInt(idx.trim())).filter(idx => !isNaN(idx));
        } catch (error) {
            console.warn(`[SEdgeBarManager] Failed to parse leaf indices from "${sEdgeKey}":`, error);
            return [];
        }
    }

    /**
     * Update the current s_edge and step based on GUI state
     * Called by GUI on every tree change to synchronize scrubber position
     */
    updateCurrentPosition() {
        // Only snap to discrete position if not scrubbing or animating
        const { tree_metadata } = this.movieData;
        const currentTreeIndex = this.gui.currentTreeIndex;
        const metadata = tree_metadata?.[currentTreeIndex];
        if (!metadata) {
            return;
        }

        const totalSegments = this.timelineSegments.length;
        const segmentCount = Math.max(1, totalSegments - 1);
        const currentSegmentIndex = this.timelineSegments.findIndex(segment => segment.index === currentTreeIndex);
        const globalProgress = currentSegmentIndex !== -1 ? currentSegmentIndex / segmentCount : 0;

        // If not scrubbing, update lastTimelineProgress to snapped position
        if (!this.isScrubbing) {
            this.lastTimelineProgress = globalProgress;
        }

        // Always update the global timeline scrubber and animation percentage using lastTimelineProgress
        this._updateGlobalTimelineScrubber(this.lastTimelineProgress);
        this._updateTimelineProgressInfo(this.lastTimelineProgress);

        // Handle original trees (no s-edge changes)
        if (!metadata.s_edge_tracker || metadata.s_edge_tracker === "None") {
            this._clearActiveStates();
            this._updateGlobalPositionInfo(currentTreeIndex, metadata);
            return;
        }

        const sEdgeKey = metadata.s_edge_tracker;
        const step = metadata.step_in_pair || 1;
        if (this.currentSEdgeKey !== sEdgeKey) {
            this._setActiveSEdge(sEdgeKey);
        }
        const barData = this.sEdgeBars.get(sEdgeKey);
        let actualStep = step;
        if (barData) {
            const treeIndex = this.gui.currentTreeIndex;
            const treePosition = barData.treeGroup.findIndex(t => t.index === treeIndex);
            if (treePosition !== -1) {
                actualStep = treePosition + 1;
            }
        }
        this._setActiveStep(sEdgeKey, actualStep);
        this._updatePhaseInfo(sEdgeKey, metadata.phase);
        this._updateSEdgePositionInfo(sEdgeKey, actualStep, metadata.phase);
        if (barData && !this.isScrubbing) {
            const totalSteps = barData.totalSteps;
            const progress = totalSteps > 1 ? (actualStep - 1) / (totalSteps - 1) : 0;
            if (!this.isScrubbing) {
                this.lastTimelineProgress = globalProgress;
            }
            this._updateSEdgeScrubberPosition(sEdgeKey, progress);
            if (barData.timeline) {
                barData.timeline.progress(progress);
            }
            this._dispatchScrubberSyncEvent(sEdgeKey, progress, actualStep, totalSteps);
        }
        this._scrollToActiveSEdge(sEdgeKey);
    }

    /**
     * Set the active s_edge
     * @param {string} sEdgeKey - S-edge to activate
     * @private
     */
    _setActiveSEdge(sEdgeKey) {
        // Clear previous active state
        this._clearActiveStates();

        // Set new active s_edge
        const barData = this.sEdgeBars.get(sEdgeKey);
        if (barData) {
            barData.isActive = true;
            barData.element.classList.add('active');
            this.currentSEdgeKey = sEdgeKey;
        }
    }

    /**
     * Set the active step within current s_edge
     * @param {string} sEdgeKey - S-edge key
     * @param {number} step - Step number (1-totalSteps, can be 1-15 for multiple s-edges)
     * @private
     */
    _setActiveStep(sEdgeKey, step) {
        const barData = this.sEdgeBars.get(sEdgeKey);
        if (!barData) return;

        // Clear previous step states
        const segments = barData.element.querySelectorAll('.sedge-step-segment');
        segments.forEach(segment => {
            segment.classList.remove('active', 'completed');
        });

        // Set completed and active states
        segments.forEach((segment, index) => {
            const segmentStep = index + 1;
            if (segmentStep < step) {
                segment.classList.add('completed');
            } else if (segmentStep === step) {
                segment.classList.add('active');
            }
        });

        // Update step indicator with phase information
        const stepIndicator = document.getElementById(`step_${sEdgeKey}`);
        if (stepIndicator) {
            // Get current tree data to show phase
            const currentTreeData = barData.treeGroup.find(tree =>
                tree.metadata.step_in_pair === step
            );
            const currentPhase = currentTreeData ?
                this._getPhaseDisplayName(currentTreeData.metadata.phase) :
                'Unknown';

            stepIndicator.textContent = `Step ${step}/${barData.totalSteps} • ${currentPhase}`;

            // Add phase-specific styling
            stepIndicator.className = `step-indicator ${this._getPhaseClass(currentTreeData?.metadata.phase)}`;
        }

        // Animate progress bar
        this._animateStepProgress(sEdgeKey, step);

        barData.currentStep = step;
        this.currentStep = step;
    }

    /**
     * Animate the progress within current step
     * @param {string} sEdgeKey - S-edge key
     * @param {number} step - Current step
     * @private
     */
    _animateStepProgress(sEdgeKey, step) {
        const barData = this.sEdgeBars.get(sEdgeKey);
        if (!barData) return;

        const segments = barData.element.querySelectorAll('.sedge-step-segment');
        const currentSegment = segments[step - 1];

        if (currentSegment) {
            const progressBar = currentSegment.querySelector('.step-progress');
            if (progressBar) {
                // Animate progress bar fill
                gsap.to(progressBar, {
                    width: '100%',
                    duration: 0.3,
                    ease: 'power2.out'
                });
            }
        }
    }

    /**
     * Update phase information display
     * @param {string} sEdgeKey - S-edge key
     * @param {string} phase - Current phase
     * @private
     */
    _updatePhaseInfo(sEdgeKey, phase) {
        const phaseElement = document.getElementById(`phase_${sEdgeKey}`);
        if (phaseElement) {
            phaseElement.textContent = this._getPhaseDisplayName(phase);
            phaseElement.className = `sedge-bar-phase ${this._getPhaseClass(phase)}`;
        }
    }

    /**
     * Get user-friendly phase name
     * @param {string} phase - Phase name
     * @returns {string} Display name
     * @private
     */
    _getPhaseDisplayName(phase) {
        switch (phase) {
            case 'DOWN_PHASE': return 'Down';
            case 'COLLAPSE_PHASE': return 'Collapse';
            case 'REORDER_PHASE': return 'Reorder';
            case 'PRE_SNAP_PHASE': return 'Pre-Snap';
            case 'SNAP_PHASE': return 'Snap';
            case 'ORIGINAL': return 'Original';
            default: return 'Unknown';
        }
    }

    /**
     * Clear all active states
     * @private
     */
    _clearActiveStates() {
        this.sEdgeBars.forEach(barData => {
            barData.isActive = false;
            barData.element.classList.remove('active');

            const segments = barData.element.querySelectorAll('.sedge-step-segment');
            segments.forEach(segment => {
                segment.classList.remove('active', 'completed');
            });
        });
    }

    /**
     * Scroll to the active s_edge bar
     * @param {string} sEdgeKey - S-edge to scroll to
     * @private
     */
    _scrollToActiveSEdge(sEdgeKey) {
        const barData = this.sEdgeBars.get(sEdgeKey);
        if (!barData) return;

        const container = document.getElementById('sedgeBarsList');
        if (!container) return;

        // Smooth scroll to bring active bar into view
        barData.element.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
        });
    }



    /**
     * Update s-edge scrubber position using GSAP timeline progress
     * @param {string} sEdgeKey - S-edge key
     * @param {number} progress - Progress within s-edge (0-1)
     * @private
     */
    _updateSEdgeScrubberPosition(sEdgeKey, progress) {
        // For global timeline scrubber, always use lastTimelineProgress
        this._updateGlobalTimelineScrubber(this.lastTimelineProgress);
    }


    /**
     * Update the global timeline scrubber position based on GSAP progress (0-1)
     * @param {number} [progress] - Optional progress value (0-1). If not provided, uses current tree index.
     * @private
     */
    _updateGlobalTimelineScrubber(progress) {
        // Find elements
        const scrubberHandle = document.getElementById('timelineScrubberHandle');
        const scrubberTrack = document.getElementById('timelineScrubberTrack');
        if (!scrubberHandle || !scrubberTrack) {
            console.warn('[SEdgeBarManager] Global timeline scrubber elements not found');
            return;
        }
        if (!this.timelineSegments || this.timelineSegments.length === 0) {
            console.warn('[SEdgeBarManager] No timeline segments available');
            return;
        }

        // If progress is not provided, compute from current tree index
        let globalProgress = progress;
        if (typeof globalProgress !== 'number') {
            const currentTreeIndex = this.gui.currentTreeIndex;
            const currentSegmentIndex = this.timelineSegments.findIndex(
                segment => segment.index === currentTreeIndex
            );
            if (currentSegmentIndex === -1) {
                console.warn('[SEdgeBarManager] Current tree not found in timeline segments');
                return;
            }
            const totalSegments = this.timelineSegments.length;
            const segmentCount = Math.max(1, totalSegments - 1);
            globalProgress = currentSegmentIndex / segmentCount;
        }

        // Clamp progress
        globalProgress = Math.max(0, Math.min(globalProgress, 1));

        // Calculate position
        const trackWidth = scrubberTrack.offsetWidth;
        const handleWidth = scrubberHandle.offsetWidth;
        const maxLeft = Math.max(0, trackWidth - handleWidth);
        const leftPosition = Math.min(globalProgress * maxLeft, maxLeft);

        // Use GSAP for smooth positioning
        gsap.to(scrubberHandle, {
            left: leftPosition + 'px',
            duration: 0.2,
            ease: 'power2.out'
        });

        // Update animation percentage in the UI
        this._updateTimelineProgressInfo(globalProgress);
    }

    /**
     * Update the timeline progress info (percentage) in the UI
     * @param {number} progress - Progress value (0-1)
     * @private
     */
    _updateTimelineProgressInfo(progress) {
        const positionInfo = document.getElementById('currentPositionInfo');
        if (!positionInfo) return;
        const percent = Math.round(progress * 100);
        // Show as "Animation: XX%" (can be enhanced with more info)
        positionInfo.textContent = `Animation: ${percent}%`;
    }


    /**
     * Update position information display for s-edge approach
     * @param {string} sEdgeKey - Current s-edge key
     * @param {number} step - Current step within s-edge
     * @param {string} phase - Current phase
     * @private
     */
    _updateSEdgePositionInfo(sEdgeKey, step, phase) {
        const positionInfo = document.getElementById('currentPositionInfo');
        const fullTreePosition = document.getElementById('fullTreePosition');
        const interpolationStatus = document.getElementById('interpolationStatus');

        if (!positionInfo) return;

        const barData = this.sEdgeBars.get(sEdgeKey);
        if (!barData) return;

        const totalSteps = barData.totalSteps;
        const phaseInfo = phase ? this._getPhaseDisplayName(phase) : 'Interpolating';

        // Get current tree info for full tree context
        const currentTreeIndex = this.gui.currentTreeIndex;
        const { fullTreeIndex } = this.getCurrentFullTreeInfo(currentTreeIndex);
        const totalFullTrees = this.movieData.tree_metadata.filter(meta => !meta.tree_pair_key || meta.phase === 'ORIGINAL').length;

        // Update main position info with s-edge step
        positionInfo.textContent = `Step ${step} / ${totalSteps}`;

        // Update full tree position context
        if (fullTreePosition) {
            fullTreePosition.textContent = `Between Trees: ${fullTreeIndex + 1}-${fullTreeIndex + 2}`;
        }

        // Update interpolation status with phase and s-edge info
        if (interpolationStatus) {
            interpolationStatus.textContent = `${phaseInfo} • ${sEdgeKey}`;
        }
    }

    /**
     * Update position info for original trees (no s-edge changes)
     * @param {number} currentTreeIndex - Current tree index
     * @param {object} metadata - Tree metadata
     * @private
     */
    _updateGlobalPositionInfo(currentTreeIndex, metadata) {
        const positionInfo = document.getElementById('currentPositionInfo');
        const fullTreePosition = document.getElementById('fullTreePosition');
        const interpolationStatus = document.getElementById('interpolationStatus');

        if (!positionInfo) return;

        const totalTrees = this.movieData.tree_metadata?.length || 0;
        const { fullTreeIndex, fullTreeName, fullTreeGlobalIndex } = this.getCurrentFullTreeInfo(currentTreeIndex);
        // Count total full trees
        const totalFullTrees = this.movieData.tree_metadata.filter(meta => !meta.tree_pair_key || meta.phase === 'ORIGINAL').length;
        const phaseInfo = metadata.phase ? this._getPhaseDisplayName(metadata.phase) : 'Unknown';

        // Update main position info
        positionInfo.textContent = `${currentTreeIndex + 1} / ${totalTrees}`;

        // Update full tree position
        if (fullTreePosition) {
            fullTreePosition.textContent = `Full Tree: ${fullTreeIndex + 1} / ${totalFullTrees}`;
        }

        // Update interpolation status
        if (interpolationStatus) {
            interpolationStatus.textContent = phaseInfo;
        }
    }

    /**
     * Dispatch synchronization event for other components
     * @param {string} sEdgeKey - Current s-edge key
     * @param {number} progress - Progress within s-edge (0-1)
     * @param {number} step - Current step
     * @param {number} totalSteps - Total steps in s-edge
     * @private
     */
    _dispatchScrubberSyncEvent(sEdgeKey, progress, step, totalSteps) {
        window.dispatchEvent(new CustomEvent('scrubber-position-updated', {
            detail: {
                sEdgeKey,
                progress,
                step,
                totalSteps,
                source: 'playback' // vs 'scrubbing'
            }
        }));
    }

    /**
     * Render over-interpolation between two timeline segments during scrubbing
     * Uses GSAP timeline progress for smooth interpolation
     * @param {object} fromSegment - Source segment with tree data
     * @param {object} toSegment - Target segment with tree data
     * @param {number} segmentProgress - Progress between segments (0-1)
     * @private
     */
    _renderTimelineInterpolation(fromSegment, toSegment, segmentProgress) {
        if (!this.gui?.treeController) {
            console.warn('[SEdgeBarManager] TreeController not available for interpolation');
            return;
        }

        // TRACE: Log every call to timeline interpolation
        console.log('[SEdgeBarManager] _renderTimelineInterpolation TRACE:', {
            fromTree: fromSegment.tree,
            toTree: toSegment.tree,
            segmentProgress,
            fromIndex: fromSegment.index,
            toIndex: toSegment.index,
            highlightEdges: this._getCurrentHighlightEdges(),
            stack: (new Error()).stack
        });

        // Use TreeAnimationController's renderInterpolatedFrame method
        this.gui.treeController.renderInterpolatedFrame(
            fromSegment.tree,
            toSegment.tree,
            segmentProgress,
            {
                highlightEdges: this._getCurrentHighlightEdges(),
                showExtensions: true,
                showLabels: true
            }
        );

        // Update position info for interpolated state using GSAP timeline utilities
        this._updateInterpolationPositionInfo(fromSegment, toSegment, segmentProgress);
    }

    /**
     * Get current highlight edges for interpolation
     * @returns {Array} Array of highlighted edges
     * @private
     */
    _getCurrentHighlightEdges() {
        const currentTreeIndex = this.gui.currentTreeIndex;
        const highlightIndex = this.gui.transitionResolver?.getHighlightingIndex(currentTreeIndex);
        return this.gui.highlightData?.[highlightIndex] || [];
    }

    /**
     * Update position info for interpolated state
     * @param {object} fromSegment - Source segment
     * @param {object} toSegment - Target segment
     * @param {number} segmentProgress - Progress between segments (0-1)
     * @private
     */
    _updateInterpolationPositionInfo(fromSegment, toSegment, segmentProgress) {
        const positionInfo = document.getElementById('currentPositionInfo');
        if (!positionInfo) return;

        const fromPhase = this._getPhaseDisplayName(fromSegment.phase);
        const toPhase = this._getPhaseDisplayName(toSegment.phase);
        const progressPercent = Math.round(segmentProgress * 100);

        positionInfo.textContent = `Over-interpolating ${fromPhase}→${toPhase} (${progressPercent}%)`;
    }

    /**
     * Clear interpolation state after scrubbing
     * @private
     */
    _clearInterpolationState() {
        // Reset any interpolation-specific UI elements
        const positionInfo = document.getElementById('currentPositionInfo');
        if (positionInfo) {
            // Will be updated by regular position update
            positionInfo.textContent = '';
        }

        // Reset GSAP timeline states if needed
        this.sEdgeBars.forEach(barData => {
            if (barData.timeline) {
                // Ensure timeline is at a discrete position, not interpolated
                const currentProgress = barData.timeline.progress();
                barData.timeline.progress(Math.round(currentProgress));
            }
        });
    }

    /**
     * Setup zoom and mode control event handlers
     * @private
     */
    _setupZoomControls() {
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        const detailedModeBtn = document.getElementById('detailedModeBtn');
        const groupedModeBtn = document.getElementById('groupedModeBtn');
        const overviewModeBtn = document.getElementById('overviewModeBtn');
        const autoModeBtn = document.getElementById('autoModeBtn');

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => this._zoomIn());
        }
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => this._zoomOut());
        }

        if (detailedModeBtn) {
            detailedModeBtn.addEventListener('click', () => this._setMode('detailed'));
        }
        if (groupedModeBtn) {
            groupedModeBtn.addEventListener('click', () => this._setMode('grouped'));
        }
        if (overviewModeBtn) {
            overviewModeBtn.addEventListener('click', () => this._setMode('overview'));
        }
        if (autoModeBtn) {
            autoModeBtn.addEventListener('click', () => this._setMode('auto'));
        }

        // Initialize zoom level display
        this._updateZoomLevelDisplay();
    }

    /**
     * Zoom in timeline (show more detail)
     * @private
     */
    _zoomIn() {
        if (this.currentZoomLevel < this.maxZoomLevel) {
            this.currentZoomLevel = Math.min(this.maxZoomLevel, this.currentZoomLevel + 0.5);
            this._applyZoom();
        }
    }

    /**
     * Zoom out timeline (show less detail)
     * @private
     */
    _zoomOut() {
        if (this.currentZoomLevel > this.minZoomLevel) {
            this.currentZoomLevel = Math.max(this.minZoomLevel, this.currentZoomLevel - 0.5);
            this._applyZoom();
        }
    }

    /**
     * Set timeline mode
     * @param {string} mode - Timeline mode: 'auto', 'detailed', 'grouped', 'overview'
     * @private
     */
    _setMode(mode) {
        if (this.currentMode !== mode) {
            this.currentMode = mode;
            console.log('[SEdgeBarManager] Mode changed to:', mode);

            // Recreate timeline with new mode
            if (this.timelineSegments) {
                this._createSingleTimelineBar(this.timelineSegments);
            }
        }
    }

    /**
     * Apply zoom level to timeline
     * @private
     */
    _applyZoom() {
        const container = document.getElementById('interpolationTimeline');
        if (!container) return;

        // Apply zoom transformation
        container.style.transform = `scaleX(${this.currentZoomLevel})`;
        container.style.transformOrigin = '0 center';

        // Update zoom level display
        this._updateZoomLevelDisplay();

        // Update zoom button states
        this._updateZoomButtonStates();

        console.log('[SEdgeBarManager] Zoom applied:', this.currentZoomLevel + '×');
    }

    /**
     * Update zoom level display
     * @private
     */
    _updateZoomLevelDisplay() {
        const zoomLevelElement = document.getElementById('zoomLevel');
        if (zoomLevelElement) {
            zoomLevelElement.textContent = `${this.currentZoomLevel}×`;
        }
    }

    /**
     * Update zoom button disabled states
     * @private
     */
    _updateZoomButtonStates() {
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');

        if (zoomInBtn) {
            zoomInBtn.classList.toggle('disabled', this.currentZoomLevel >= this.maxZoomLevel);
        }
        if (zoomOutBtn) {
            zoomOutBtn.classList.toggle('disabled', this.currentZoomLevel <= this.minZoomLevel);
        }
    }

    /**
     * Update mode selector button states
     * @param {string} activeMode - Currently active mode
     * @private
     */
    _updateModeSelector(activeMode) {
        const buttons = ['detailedModeBtn', 'groupedModeBtn', 'overviewModeBtn', 'autoModeBtn'];
        const modes = ['detailed', 'grouped', 'overview', 'auto'];

        buttons.forEach((buttonId, index) => {
            const button = document.getElementById(buttonId);
            if (button) {
                const isActive = (this.currentMode === 'auto' && buttonId === 'autoModeBtn') ||
                                (this.currentMode !== 'auto' && modes[index] === activeMode);
                button.classList.toggle('active', isActive);
            }
        });
    }

    /**
     * Clean up and destroy the SEdgeBarManager instance
     * Removes DOM elements, event listeners, and clears references
     */
    destroy() {
        // Clear GSAP timelines
        if (this.mainTimeline) {
            this.mainTimeline.kill();
            this.mainTimeline = null;
        }

        // Clear individual s-edge timelines
        this.sEdgeBars.forEach(barData => {
            if (barData.timeline) {
                barData.timeline.kill();
            }
        });
        this.sEdgeBars.clear();

        // Remove timeline container from DOM
        const interpolationContainer = document.querySelector('.interpolation-timeline-container');
        if (interpolationContainer) {
            interpolationContainer.remove();
        }

        // Clear references
        this.movieData = null;
        this.gui = null;
        this.timelineSegments = null;
        this.currentSEdgeKey = null;
        this.currentStep = 0;
        this.isTimelinePlaying = false;
        this.isScrubbing = false;
        this.lastTimelineProgress = 0;
    }
}
