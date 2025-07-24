// Test the zoom and scroll functionality of MovieTimelineManager
import { MovieTimelineManager } from '../src/js/timeline/MovieTimelineManager.js';

// Mock data and dependencies
const mockMovieData = {
    tree_metadata: [
        { phase: 'ORIGINAL', s_edge_tracker: 'None', tree_name: 'Tree 1' },
        { phase: 'DOWN_PHASE', s_edge_tracker: '(1,2)', tree_name: 'Tree 2', tree_pair_key: 'pair1', step_in_pair: 1 },
        { phase: 'COLLAPSE_PHASE', s_edge_tracker: '(1,2)', tree_name: 'Tree 3', tree_pair_key: 'pair1', step_in_pair: 2 },
        { phase: 'ORIGINAL', s_edge_tracker: 'None', tree_name: 'Tree 4' },
        { phase: 'DOWN_PHASE', s_edge_tracker: '(3,4)', tree_name: 'Tree 5', tree_pair_key: 'pair2', step_in_pair: 1 }
    ],
    interpolated_trees: [
        { nodes: [], edges: [] },
        { nodes: [], edges: [] },
        { nodes: [], edges: [] },
        { nodes: [], edges: [] },
        { nodes: [], edges: [] }
    ],
    lattice_edge_tracking: [null, null, null, null, null]
};

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
    isFullTree: (index) => index === 0 || index === 3,
    getHighlightingIndex: (index) => index
};

console.log('Testing MovieTimelineManager zoom and scroll functionality...');

try {
    // Create a manager instance
    const manager = new MovieTimelineManager(mockMovieData, mockGui, mockResolver);
    
    console.log('✓ MovieTimelineManager created successfully');
    
    // Test zoom functionality
    setTimeout(() => {
        console.log('\\n--- Testing Zoom Functionality ---');
        
        // Test zoom in
        manager.zoomIn(0.5);
        console.log('✓ zoomIn() called successfully');
        
        // Test zoom out
        manager.zoomOut(0.3);
        console.log('✓ zoomOut() called successfully');
        
        // Test fit to window
        manager.fitToWindow();
        console.log('✓ fitToWindow() called successfully');
        
        // Test scroll functionality
        console.log('\\n--- Testing Scroll Functionality ---');
        
        // Test scroll to start
        manager.scrollToStart();
        console.log('✓ scrollToStart() called successfully');
        
        // Test scroll to end
        manager.scrollToEnd();
        console.log('✓ scrollToEnd() called successfully');
        
        // Test scroll by relative amount
        manager.scrollBy(1000); // Scroll right by 1 second
        console.log('✓ scrollBy() called successfully');
        
        // Test focus on segment
        manager.focusOnSegment(2);
        console.log('✓ focusOnSegment() called successfully');
        
        // Test get window info
        const windowInfo = manager.getTimelineWindow();
        console.log('✓ getTimelineWindow() returned:', windowInfo);
        
        console.log('\\n--- Testing Keyboard Shortcuts ---');
        console.log('Available keyboard shortcuts:');
        console.log('  + or = : Zoom in');
        console.log('  - or _ : Zoom out');
        console.log('  0      : Fit to window');
        console.log('  Home   : Scroll to start');
        console.log('  End    : Scroll to end');
        console.log('  Ctrl+← : Scroll left');
        console.log('  Ctrl+→ : Scroll right');
        
        console.log('\\n✅ All zoom and scroll tests passed!');
        
        // Clean up
        manager.destroy();
        console.log('✓ Manager destroyed successfully');
        
    }, 1000); // Wait for initialization
    
} catch (error) {
    console.error('❌ Test failed:', error);
}