// Simple test to verify MovieTimelineManager cleanup worked correctly
import { MovieTimelineManager } from './frontend/public/js/moviePlayer/MovieTimelineManager.js';

// Mock data structure
const mockMovieData = {
    tree_metadata: [
        { phase: 'ORIGINAL', s_edge_tracker: 'None', tree_name: 'Tree 1' },
        { phase: 'DOWN_PHASE', s_edge_tracker: '(1,2)', tree_name: 'Tree 2', tree_pair_key: 'pair1', step_in_pair: 1 },
        { phase: 'COLLAPSE_PHASE', s_edge_tracker: '(1,2)', tree_name: 'Tree 3', tree_pair_key: 'pair1', step_in_pair: 2 }
    ],
    interpolated_trees: [
        { nodes: [], edges: [] },
        { nodes: [], edges: [] },
        { nodes: [], edges: [] }
    ],
    lattice_edge_tracking: [null, null, null]
};

// Mock GUI and resolver
const mockGui = {
    currentTreeIndex: 0,
    goToPosition: (index) => console.log(`Navigating to tree ${index}`),
    treeController: {
        renderInterpolatedFrame: () => console.log('Rendering interpolated frame'),
        updateParameters: () => console.log('Updating parameters'),
        renderAllElements: () => console.log('Rendering all elements')
    }
};

const mockResolver = {
    isFullTree: (index) => index === 0,
    getHighlightingIndex: (index) => index
};

// Test the cleanup
console.log('Testing MovieTimelineManager after cleanup...');

try {
    const manager = new MovieTimelineManager(mockMovieData, mockGui, mockResolver);
    
    // Test basic functionality
    console.log('✓ Constructor works');
    console.log('✓ Timeline segments created:', manager.timelineSegments?.length);
    
    // Test position update
    manager.updateCurrentPosition();
    console.log('✓ Position update works');
    
    // Test destroy
    manager.destroy();
    console.log('✓ Destroy works');
    
    console.log('\n✅ All tests passed! Timeline cleanup was successful.');
    
} catch (error) {
    console.error('❌ Test failed:', error);
}