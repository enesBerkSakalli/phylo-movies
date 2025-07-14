import { gsap } from 'gsap';
import { Timeline, DataSet } from 'vis-timeline/standalone';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import '../../css/movie-timeline.css'; // Import the movie timeline CSS file
import { useAppStore } from '../store.js'; // <--- 1. IMPORT THE STORE
/**
 * Movie Timeline Manager - Creates visual timeline for phylogenetic movie transformations
 * Provides interactive scrubbing and navigation through tree interpolations
 */
export class MovieTimelineManager {
    /**
     * Track the last known GSAP timeline progress (fractional, 0-1)
     * This is the single source of truth for scrubber and UI updates during animation/scrubbing
     */
    lastTimelineProgress = 0;
    /**
     * @param {MovieData} movieData
     * @param {TransitionIndexResolver} transitionIndexResolver
     */
    constructor(movieData, transitionIndexResolver) {

        this.movieData = movieData;
        this.transitionIndexResolver = transitionIndexResolver;
        this.isTimelinePlaying = false;
        this.isScrubbing = false; // Track scrubbing state
        this.lastTimelineProgress = 0;

        this.timelineSegments = null;
        console.log('[MovieTimelineManager] Constructor called.');

        // Zoom and scroll state
        this.currentZoomLevel = 1;
        this.maxZoomLevel = 10;
        this.minZoomLevel = 0.1;

        // Initialize GSAP main timeline (single source of truth for progress)
        this.mainTimeline = gsap.timeline({
            paused: true,
            ease: "none" // Linear interpolation for smooth scrubbing
        });
        // We'll set the onUpdate after segments are created, since we need segment data

        this._initializeMovieTimeline();
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
    _initializeMovieTimeline() {
        const { tree_metadata } = this.movieData;
        if (!tree_metadata) {
            console.warn('[MovieTimelineManager] No tree metadata available');
            return;
        }

        // Create all timeline segments in chronological order
        const timelineSegments = this._createTimelineSegments();

        console.log('[MovieTimelineManager] Timeline segments created. Count:', timelineSegments.length);

        // Store timeline segments for testing access
        this.timelineSegments = timelineSegments;

        // Create the timeline container
        this._createTimelineContainer();

        // Old DOM-based timeline creation removed - now using vis-timeline only

        // Update the enhanced timeline metrics in the header
        this._updateTimelineMetrics(timelineSegments);

        // Initialize current position after the DOM has been updated
        requestAnimationFrame(() => {
            this.updateCurrentPosition();
            // Initialize vis-timeline visual layer
            this._initializeVisualTimeline(timelineSegments);
            // Setup GSAP timeline for smooth interpolation
            this._setupMainTimeline(timelineSegments);
        });
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
        const movieTimelineCountElement = document.getElementById('movieTimelineCount');
        const fullTreeCountElement = document.getElementById('fullTreeCount');
        const interpolationDensityElement = document.getElementById('interpolationDensity');
        const treePairCountElement = document.getElementById('treePairCount');

        if (movieTimelineCountElement) {
            movieTimelineCountElement.textContent = totalTrees.toString();
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
        const { tree_metadata, interpolated_trees, lattice_edge_tracking } = this.movieData;
        const allSegments = [];

        // Combine both branches into one statement
        allSegments.push(...tree_metadata
            .map((metadata, index) => {
                return {
                    index,
                    metadata,
                    tree: interpolated_trees[index],
                    latticeEdge: lattice_edge_tracking?.[index] || null,
                    phase: metadata.phase,
                    sEdgeTracker: metadata.s_edge_tracker,
                    treePairKey: metadata.tree_pair_key,
                    stepInPair: metadata.step_in_pair,
                    treeName: metadata.tree_name || `Tree ${index}`,
                    hasInterpolation: true
                };
            })
            .filter(Boolean)
        );

        console.log('[MovieTimelineManager] _createTimelineSegments: Created', allSegments.length, 'segments.');

        // Analyze segments by tree pair
        const pairGroups = {};
        allSegments.forEach(segment => {
            const pairKey = segment.treePairKey || 'original';
            if (!pairGroups[pairKey]) pairGroups[pairKey] = [];
            pairGroups[pairKey].push(segment);
        });

        return allSegments;
    }


    /**
     * Initialize the timeline container that already exists in the HTML template
     * @private
     */
    _createTimelineContainer() {
        // Find the interpolation timeline container that should already exist in the HTML template
        const interpolationContainer = document.querySelector('.interpolation-timeline-container');
        if (!interpolationContainer) {
            console.error('[MovieTimelineManager] Interpolation timeline container not found in HTML template');
            return;
        }

        // Verify that all required elements exist in the template
        const requiredElements = [
            'movieTimelineCount', 'fullTreeCount', 'interpolationDensity', 'treePairCount',
            'currentPositionInfo', 'fullTreePosition', 'interpolationStatus',
            'zoomInBtn', 'zoomOutBtn', 'fitToWindowBtn', 'scrollToStartBtn', 'scrollToEndBtn'
        ];

        for (const elementId of requiredElements) {
            const element = document.getElementById(elementId);
            if (!element) {
                console.warn(`[MovieTimelineManager] Required element '${elementId}' not found in timeline template`);
            }
        }

    }


    /**
     * Determine if a timeline segment represents a "Full Tree"
     * @param {object} segment - The timeline segment to check
     * @returns {boolean} True if the segment is a full tree
     * @private
     */
    _isFullTree(segment) {
        // Delegate the logic to the resolver
        return this.transitionIndexResolver.isFullTree(segment.index);
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
        const isFullTree = this._isFullTree(segment);

        if (isFullTree) {
            // FIXED: Calculate full tree number using consistent logic
            const fullTreeNumber = this.timelineSegments.slice(0, index + 1)
                .filter(s => this._isFullTree(s)).length;
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
            console.warn(`[MovieTimelineManager] Failed to parse leaf indices from "${sEdgeKey}":`, error);
            return [];
        }
    }

    /**
     * Update the current s_edge and step based on GUI state
     * Called by GUI on every tree change to synchronize scrubber position
     */
    updateCurrentPosition() {
        // Only snap to discrete position if not scrubbing or animating
        const { movieData, currentTreeIndex } = useAppStore.getState();
        const tree_metadata = movieData.tree_metadata;
        const metadata = tree_metadata?.[currentTreeIndex];
        if (!metadata || !this.timelineSegments) {
            console.warn('[MovieTimelineManager] updateCurrentPosition: metadata or timelineSegments not available.', {
                metadataExists: !!metadata,
                timelineSegmentsExists: !!this.timelineSegments,
                currentTreeIndex,
                tree_metadataLength: tree_metadata?.length
            });
            return;
        }

        const totalSegments = this.timelineSegments.length;
        const segmentCount = Math.max(1, totalSegments - 1);
        const currentSegmentIndex = this.timelineSegments.findIndex(segment => segment.index === currentTreeIndex);

        // If the current tree isn't found in the segments, we can't proceed.
        if (currentSegmentIndex === -1) {
            console.warn('[MovieTimelineManager] updateCurrentPosition: Current tree index not found in timelineSegments.', {
                currentTreeIndex,
                totalSegments
            });
            return;
        }

        const globalProgress = currentSegmentIndex / segmentCount;

        // If not scrubbing, update lastTimelineProgress to the snapped position
        if (!this.isScrubbing) {
            this.lastTimelineProgress = globalProgress;
        }

        // Always update the global timeline scrubber and UI info
        this._updateGlobalTimelineScrubber(this.lastTimelineProgress);
        this._updateTimelineProgressInfo(this.lastTimelineProgress);
        this._updateGlobalPositionInfo(currentTreeIndex, metadata);

        // Update vis-timeline scrubber position
        if (this.visTimeline && this.visTimelineDuration) {
            const currentTime = this.lastTimelineProgress * this.visTimelineDuration;
            this.visTimeline.setCustomTime(currentTime, 'scrubber');
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
     * Update the vis-timeline scrubber position based on progress (0-1)
     * @param {number} [progress] - Optional progress value (0-1). If not provided, uses current tree index.
     * @private
     */
    _updateGlobalTimelineScrubber(progress) {
        if (!this.visTimeline || !this.timelineSegments || this.timelineSegments.length === 0) {
            console.warn('[MovieTimelineManager] Vis-timeline or timeline segments not available');
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
                console.warn('[MovieTimelineManager] Current tree not found in timeline segments');
                return;
            }
            const totalSegments = this.timelineSegments.length;
            const segmentCount = Math.max(1, totalSegments - 1);
            globalProgress = currentSegmentIndex / segmentCount;
        }

        // Clamp progress
        globalProgress = Math.max(0, Math.min(globalProgress, 1));

        // Update vis-timeline scrubber position
        const currentTime = globalProgress * this.visTimelineDuration;
        this.visTimeline.setCustomTime(currentTime, 'scrubber');

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
        const { fullTreeIndex } = this.getCurrentFullTreeInfo(currentTreeIndex);
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
     * Render over-interpolation between two timeline segments during scrubbing
     * Uses GSAP timeline progress for smooth interpolation
     * @param {object} fromSegment - Source segment with tree data
     * @param {object} toSegment - Target segment with tree data
     * @param {number} segmentProgress - Progress between segments (0-1)
     * @private
     */
    _renderTimelineInterpolation(fromSegment, toSegment, segmentProgress) {
        const { treeController, getActualHighlightData, movieData } = useAppStore.getState(); // Get from store
        if (!treeController) {
            console.warn('[MovieTimelineManager] TreeController not available for interpolation');
            return;
        }


        // CRITICAL FIX: Separate monophyletic highlighting from s-edge highlighting
        // 1. Get monophyletic groups (marked elements) for ColorManager
        const monophyleticHighlightData = getActualHighlightData(); // Use action from store

        // 2. Get s-edges (lattice_edges) for highlightEdges parameter
        // Use interpolated position to get appropriate lattice edge
        const interpolatedIndex = Math.round(fromSegment.index + (toSegment.index - fromSegment.index) * segmentProgress);
        const latticeEdge = movieData.lattice_edge_tracking[interpolatedIndex]; // Use movieData from store

        // DEBUG: Log what we're getting
        console.log('[MovieTimelineManager] Monophyletic highlight data:', monophyleticHighlightData);
        console.log('[MovieTimelineManager] Lattice edge for position', interpolatedIndex, ':', latticeEdge);
        console.log('[MovieTimelineManager] From segment index:', fromSegment.index, 'To segment index:', toSegment.index);

        // Update ColorManager's marked components (monophyletic groups)
        if (treeController.colorManager) { // Use treeController from store
            // Transform highlight data to match ColorManager's expected format (array of Sets)
            let transformedData = [];
            if (Array.isArray(monophyleticHighlightData) && monophyleticHighlightData.length > 0) {
                const isArrayOfArrays = monophyleticHighlightData.every(item => Array.isArray(item));

                if (isArrayOfArrays) {
                    transformedData = monophyleticHighlightData.map(innerArray => new Set(innerArray));
                } else {
                    transformedData = [new Set(monophyleticHighlightData)];
                }
            }

            console.log('[MovieTimelineManager] Transformed monophyletic data for ColorManager:', transformedData);
            treeController.colorManager.updateMarkedComponents(transformedData); // Use treeController from store
        }

        // Use TreeAnimationController's renderInterpolatedFrame method
        treeController.renderInterpolatedFrame( // Use treeController from store
            fromSegment.tree,
            toSegment.tree,
            segmentProgress,
            {
                highlightEdges: [latticeEdge], // S-edges for lattice highlighting
                showExtensions: true,
                showLabels: true
            }
        );

        // Update position info for interpolated state using GSAP timeline utilities
        this._updateInterpolationPositionInfo(fromSegment, toSegment, segmentProgress);
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
     * Setup GSAP main timeline for smooth over-interpolation
     * @param {Array} timelineSegments - Timeline segments data
     * @private
     */
    _setupMainTimeline(timelineSegments) {
        // Clear any existing timeline
        this.mainTimeline.clear();

        // Add a single tween that spans the entire timeline duration
        // This allows for smooth scrubbing across all segments
        const totalDuration = Math.max(1, timelineSegments.length - 1);

        this.mainTimeline.to({}, {
            duration: totalDuration,
            ease: "none",
            onUpdate: () => {
                // This will be called during playback and scrubbing
                const progress = this.mainTimeline.progress();
                this.lastTimelineProgress = progress;

                // Always update vis-timeline scrubber
                if (this.visTimeline && this.visTimelineDuration) {
                    const currentTime = progress * this.visTimelineDuration;
                    this.visTimeline.setCustomTime(currentTime, 'scrubber');
                }
            }
        });

        console.log('[MovieTimelineManager] GSAP timeline setup complete for over-interpolation');
    }

    /**
     * Initialize vis-timeline as a visual-only layer
     * Creates bubbles for tree states and lines for transitions
     * @param {Array} timelineSegments - Timeline segments data
     * @private
     */
    _initializeVisualTimeline(timelineSegments) {
        // Find or create container for vis-timeline
        let container = document.getElementById('visTimelineContainer');
        if (!container) {
            // Create container if it doesn't exist
            const timelineContainer = document.querySelector('.interpolation-timeline-container');
            if (!timelineContainer) {
                console.warn('[MovieTimelineManager] Timeline container not found for vis-timeline');
                return;
            }

            container = document.createElement('div');
            container.id = 'visTimelineContainer';
            container.className = 'vis-timeline-visual-layer';
            timelineContainer.appendChild(container);
        }

        // Convert timeline segments to vis-timeline items - create individual segments in one line
        const items = new DataSet();
        const UNIT = 1000; // 1 second per tree - allows smooth interpolation
        const totalDuration = timelineSegments.length * UNIT;

        let itemId = 1;

        // Create individual segments as range items
        timelineSegments.forEach((segment, index) => {
            const isFullTree = this._isFullTree(segment);
            const segmentClass = isFullTree ? 'full-tree-segment' : 'interpolation-segment';

            items.add({
                id: itemId++,
                content: '',
                start: index * UNIT,
                end: (index + 1) * UNIT, // Full width segments with no gaps
                type: 'range',
                className: segmentClass,
                group: 1, // All items in same group to ensure single line
                title: this._getSegmentTooltip(segment, index, timelineSegments.length)
            });
        });

        // Configure vis-timeline options for interactive scrubbing
        const options = {
            height: '60px',
            min: 0,
            max: totalDuration,
            start: 0,
            end: totalDuration,
            showCurrentTime: false,
            showMajorLabels: false,
            showMinorLabels: false,
            timeAxis: { scale: 'millisecond', step: UNIT / 10 }, // 100ms grid
            editable: {
                updateTime: true,    // Enable dragging of custom time markers
                updateGroup: false,  // Disable group dragging
                add: false,         // Disable adding items
                remove: false       // Disable removing items
            },
            moveable: true,         // Enable window dragging/panning
            zoomable: true,         // Enable zooming
            zoomMin: UNIT / 10,     // Minimum zoom: 100ms (0.1 tree)
            zoomMax: totalDuration * 2,  // Maximum zoom: 2x total duration
            zoomKey: 'ctrlKey',     // Require Ctrl key for zooming
            selectable: false,      // Disable item selection
            stack: false,
            margin: {
                item: { horizontal: 0, vertical: 0 },
                axis: 0
            },
            orientation: 'top',
            snap: null,             // Explicitly disable snapping
            // snap: null,             // Explicitly disable snapping
            autoResize: true,
            verticalScroll: false,
            horizontalScroll: true
        };

        // Create groups to ensure single line layout
        const groups = new DataSet([
            { id: 1, content: '' }
        ]);

        // Create vis-timeline instance
        this.visTimeline = new Timeline(container, items, groups, options);

        // Add custom time bar for scrubbing indicator
        this.visTimeline.addCustomTime(0, 'scrubber');

        // Store total duration for later use
        this.visTimelineDuration = totalDuration;

        // Add vis-timeline event handlers for scrubbing functionality

        this._wireContinuousScrub();

        // Handle end of scrubbing
        this.visTimeline.on('timechanged', (properties) => {
            if (properties.id === 'scrubber') {
                this.isScrubbing = false;
                console.log('[MovieTimelineManager] Vis-timeline scrubbing ended');
            }
        });

        // Handle timeline range changes (panning/zooming)
        this.visTimeline.on('rangechange', (properties) => {
            // Optional: Handle viewport changes
            console.log('[MovieTimelineManager] Timeline range changed:', properties);
        });

        // Add click handlers for navigation to tree positions
        this.visTimeline.on('click', (properties) => {
            if (properties.item) {
                // Get the segment index from the item ID (1-based, so subtract 1)
                const segmentIndex = properties.item - 1;
                if (segmentIndex >= 0 && segmentIndex < timelineSegments.length) {
                    const segment = timelineSegments[segmentIndex];
                    const treeIndex = segment.index;

                    // Calculate progress for this segment
                    const totalSegments = timelineSegments.length;
                    const segmentCount = Math.max(1, totalSegments - 1);
                    const progress = segmentIndex / segmentCount;
                    this.lastTimelineProgress = progress;

                    // Navigate to the tree position
                    useAppStore.getState().goToPosition(treeIndex);

                    console.log(`[MovieTimelineManager] Clicked segment ${segmentIndex}, navigating to tree ${treeIndex}`);
                }
            }
        });

        // Setup zoom and scroll controls
        this._setupZoomAndScrollControls();

        // Setup UI button handlers
        this._setupUIControls();

        console.log('[MovieTimelineManager] Visual timeline initialized with vis-timeline');
    }

    _wireContinuousScrub() {
        let draggingBg = false;
        this.visTimeline.on('timechange', p => this._scrubTo(p.time));
        this.visTimeline.on('mouseDown', p => { if (!p.item) { draggingBg = true; this._scrubTo(p.time);} });
        this.visTimeline.on('mouseMove', p => { if (draggingBg) this._scrubTo(p.time); });
        this.visTimeline.on('mouseUp',   () =>  draggingBg = false);
    }

    _scrubTo(timeMs) {                      // 0 … (duration-1)
        const t = Math.max(0, Math.min(timeMs, this.visTimelineDuration));
        this.visTimeline.setCustomTime(t, 'scrubber', { animation:false });
        this.mainTimeline.progress(t / this.visTimelineDuration);   // keep GSAP in sync
        this._performVisTimelineInterpolation(t, this.timelineSegments);
        this._updateGlobalTimelineScrubber(t / this.visTimelineDuration); // DOM mirror
    }

    /**
     * Perform over-interpolation during vis-timeline scrubbing
     * @param {number} currentTime - Current time position in vis-timeline (in ms)
     * @param {Array} timelineSegments - Timeline segments data
     * @private
     */
    _performVisTimelineInterpolation(currentTime, timelineSegments) {
        const UNIT = 1000; // 1 second per tree
        const segmentIndex = Math.floor(currentTime / UNIT);
        const segmentProgress = (currentTime - segmentIndex * UNIT) / UNIT; // 0-1

        if (segmentIndex >= 0 && segmentIndex < timelineSegments.length) {
            const fromSegment = timelineSegments[segmentIndex];
            const toSegment = timelineSegments[Math.min(segmentIndex + 1, timelineSegments.length - 1)];

            // Always attempt to render an interpolated frame, even if segmentProgress is 0.
            // The _renderTimelineInterpolation function should handle rendering the 'fromSegment'
            // when segmentProgress is 0, and 'toSegment' when segmentProgress is 1.
            this._renderTimelineInterpolation(fromSegment, toSegment, segmentProgress);
            console.log(`[MovieTimelineManager] Continuous interpolation: ${segmentIndex} -> ${segmentIndex + 1}, progress: ${segmentProgress.toFixed(3)}`);
        }
    }

    /**
     * Setup zoom and scroll controls for vis-timeline
     * @private
     */
    _setupZoomAndScrollControls() {
        if (!this.visTimeline) {
            console.warn('[MovieTimelineManager] Cannot setup zoom controls - vis-timeline not initialized');
            return;
        }

        // Add keyboard shortcuts for zooming
        this._addKeyboardZoomControls();

        // Add programmatic zoom methods
        this._addProgrammaticZoomMethods();

        console.log('[MovieTimelineManager] Zoom and scroll controls initialized');
    }

    /**
     * Add keyboard shortcuts for timeline zoom and navigation
     * @private
     */
    _addKeyboardZoomControls() {
        // Add keyboard event listener to the timeline container
        const container = document.getElementById('visTimelineContainer');
        if (!container) return;

        container.addEventListener('keydown', (event) => {
            // Only handle keyboard events when the timeline container is focused
            if (document.activeElement !== container && !container.contains(document.activeElement)) {
                return;
            }

            switch (event.key) {
                case '+':
                case '=':
                    event.preventDefault();
                    this.zoomIn(0.2);
                    break;
                case '-':
                case '_':
                    event.preventDefault();
                    this.zoomOut(0.2);
                    break;
                case '0':
                    event.preventDefault();
                    this.fitToWindow();
                    break;
                case 'Home':
                    event.preventDefault();
                    this.scrollToStart();
                    break;
                case 'End':
                    event.preventDefault();
                    this.scrollToEnd();
                    break;
                case 'ArrowLeft':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        this.scrollBy(-this.visTimelineDuration * 0.1);
                    }
                    break;
                case 'ArrowRight':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        this.scrollBy(this.visTimelineDuration * 0.1);
                    }
                    break;
            }
        });

        // Make the container focusable
        container.setAttribute('tabindex', '0');
        container.style.outline = 'none';
    }

    /**
     * Add programmatic zoom methods to the timeline
     * @private
     */
    _addProgrammaticZoomMethods() {
        // Track zoom level changes
        this.visTimeline.on('rangechange', (properties) => {
            const range = properties.end - properties.start;
            const totalRange = this.visTimelineDuration;
            this.currentZoomLevel = totalRange / range;

            // Update zoom level display if it exists
            this._updateZoomLevelDisplay();
        });
    }

    /**
     * Zoom into the timeline by a given percentage
     * @param {number} percentage - Zoom percentage (0-1)
     * @param {Object} options - Optional animation options
     */
    zoomIn(percentage = 0.2, options = { animation: { duration: 300, easingFunction: 'easeInOutQuad' } }) {
        if (!this.visTimeline) {
            console.warn('[MovieTimelineManager] Cannot zoom in - vis-timeline not initialized');
            return;
        }

        this.visTimeline.zoomIn(percentage, options);
        console.log(`[MovieTimelineManager] Zoomed in by ${percentage * 100}%`);
    }

    /**
     * Zoom out of the timeline by a given percentage
     * @param {number} percentage - Zoom percentage (0-1)
     * @param {Object} options - Optional animation options
     */
    zoomOut(percentage = 0.2, options = { animation: { duration: 300, easingFunction: 'easeInOutQuad' } }) {
        if (!this.visTimeline) {
            console.warn('[MovieTimelineManager] Cannot zoom out - vis-timeline not initialized');
            return;
        }

        this.visTimeline.zoomOut(percentage, options);
        console.log(`[MovieTimelineManager] Zoomed out by ${percentage * 100}%`);
    }

    /**
     * Fit the entire timeline to the visible window
     * @param {Object} options - Optional animation options
     */
    fitToWindow(options = { animation: { duration: 500, easingFunction: 'easeInOutQuad' } }) {
        if (!this.visTimeline) {
            console.warn('[MovieTimelineManager] Cannot fit to window - vis-timeline not initialized');
            return;
        }

        this.visTimeline.fit(options);
        console.log('[MovieTimelineManager] Fitted timeline to window');
    }

    /**
     * Set the visible window to a specific time range
     * @param {number} start - Start time in milliseconds
     * @param {number} end - End time in milliseconds
     * @param {Object} options - Optional animation options
     */
    setTimeWindow(start, end, options = { animation: { duration: 300, easingFunction: 'easeInOutQuad' } }) {
        if (!this.visTimeline) {
            console.warn('[MovieTimelineManager] Cannot set time window - vis-timeline not initialized');
            return;
        }

        this.visTimeline.setWindow(start, end, options);
        console.log(`[MovieTimelineManager] Set time window: ${start} - ${end}`);
    }

    /**
     * Scroll to the beginning of the timeline
     * @param {Object} options - Optional animation options
     */
    scrollToStart(options = { animation: { duration: 300, easingFunction: 'easeInOutQuad' } }) {
        if (!this.visTimeline) {
            console.warn('[MovieTimelineManager] Cannot scroll to start - vis-timeline not initialized');
            return;
        }

        const window = this.visTimeline.getWindow();
        const windowSize = window.end - window.start;
        this.visTimeline.setWindow(0, windowSize, options);
        console.log('[MovieTimelineManager] Scrolled to start');
    }

    /**
     * Scroll to the end of the timeline
     * @param {Object} options - Optional animation options
     */
    scrollToEnd(options = { animation: { duration: 300, easingFunction: 'easeInOutQuad' } }) {
        if (!this.visTimeline) {
            console.warn('[MovieTimelineManager] Cannot scroll to end - vis-timeline not initialized');
            return;
        }

        const window = this.visTimeline.getWindow();
        const windowSize = window.end - window.start;
        this.visTimeline.setWindow(this.visTimelineDuration - windowSize, this.visTimelineDuration, options);
        console.log('[MovieTimelineManager] Scrolled to end');
    }

    /**
     * Scroll the timeline by a relative amount
     * @param {number} deltaTime - Time delta in milliseconds (positive = right, negative = left)
     * @param {Object} options - Optional animation options
     */
    scrollBy(deltaTime, options = { animation: { duration: 200, easingFunction: 'easeInOutQuad' } }) {
        if (!this.visTimeline) {
            console.warn('[MovieTimelineManager] Cannot scroll - vis-timeline not initialized');
            return;
        }

        const window = this.visTimeline.getWindow();
        const newStart = Math.max(0, window.start + deltaTime);
        const newEnd = Math.min(this.visTimelineDuration, window.end + deltaTime);

        this.visTimeline.setWindow(newStart, newEnd, options);
        console.log(`[MovieTimelineManager] Scrolled by ${deltaTime}ms`);
    }

    /**
     * Focus on a specific tree segment
     * @param {number} segmentIndex - Index of the segment to focus on
     * @param {Object} options - Optional zoom and animation options
     */
    focusOnSegment(segmentIndex, options = {
        zoom: true,
        animation: { duration: 500, easingFunction: 'easeInOutQuad' }
    }) {
        if (!this.visTimeline || !this.timelineSegments) {
            console.warn('[MovieTimelineManager] Cannot focus on segment - timeline not initialized');
            return;
        }

        if (segmentIndex < 0 || segmentIndex >= this.timelineSegments.length) {
            console.warn('[MovieTimelineManager] Invalid segment index:', segmentIndex);
            return;
        }

        // Focus on the item (itemId is 1-based)
        const itemId = segmentIndex + 1;
        this.visTimeline.focus(itemId, options);
        console.log(`[MovieTimelineManager] Focused on segment ${segmentIndex}`);
    }

    /**
     * Update zoom level display in UI
     * @private
     */
    _updateZoomLevelDisplay() {
        // This could be connected to a UI element if needed
        console.log(`[MovieTimelineManager] Current zoom level: ${this.currentZoomLevel.toFixed(2)}x`);
    }

    /**
     * Get current timeline window information
     * @returns {Object} Current window state
     */
    getTimelineWindow() {
        if (!this.visTimeline) {
            return { start: 0, end: 0, duration: 0 };
        }

        const window = this.visTimeline.getWindow();
        return {
            start: window.start,
            end: window.end,
            duration: window.end - window.start,
            zoomLevel: this.currentZoomLevel
        };
    }

    /**
     * Setup UI button controls for zoom and scroll
     * @private
     */
    _setupUIControls() {
        // Zoom In button
        const zoomInBtn = document.getElementById('zoomInBtn');
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                this.zoomIn(0.3);
            });
        }

        // Zoom Out button
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                this.zoomOut(0.3);
            });
        }

        // Fit to Window button
        const fitToWindowBtn = document.getElementById('fitToWindowBtn');
        if (fitToWindowBtn) {
            fitToWindowBtn.addEventListener('click', () => {
                this.fitToWindow();
            });
        }

        // Scroll to Start button
        const scrollToStartBtn = document.getElementById('scrollToStartBtn');
        if (scrollToStartBtn) {
            scrollToStartBtn.addEventListener('click', () => {
                this.scrollToStart();
            });
        }

        // Scroll to End button
        const scrollToEndBtn = document.getElementById('scrollToEndBtn');
        if (scrollToEndBtn) {
            scrollToEndBtn.addEventListener('click', () => {
                this.scrollToEnd();
            });
        }

        console.log('[MovieTimelineManager] UI controls setup complete');
    }

    /**
     * Clean up and destroy the MovieTimelineManager instance
     * Removes DOM elements, event listeners, and clears references
     */
    destroy() {
        // Clear GSAP timelines
        if (this.mainTimeline) {
            this.mainTimeline.kill();
            this.mainTimeline = null;
        }

        // Destroy vis-timeline instance
        if (this.visTimeline) {
            this.visTimeline.destroy();
            this.visTimeline = null;
        }

        // Reset timeline container content (but don't remove it from DOM since it's part of the static template)
        const interpolationTimeline = document.getElementById('interpolationTimeline');
        if (interpolationTimeline) {
            interpolationTimeline.innerHTML = '';
        }

        // Reset timeline metrics to initial state
        const resetElements = [
            { id: 'movieTimelineCount' },
            { id: 'fullTreeCount' },
            { id: 'interpolationDensity' },
            { id: 'treePairCount' },
            { id: 'currentPositionInfo' },
            { id: 'fullTreePosition' },
            { id: 'interpolationStatus' }
        ];

        resetElements.forEach(({ id }) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = ''; // Clear the content
            }
        });

        // Clear references
        this.movieData = null;
        this.gui = null;
        this.timelineSegments = null;
        this.isTimelinePlaying = false;
        this.isScrubbing = false;
        this.lastTimelineProgress = 0;
        this.currentZoomLevel = 1;
    }
}
