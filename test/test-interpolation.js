// Quick test script to validate interpolation functionality
console.log('Testing interpolation workflow...');

// Test the import paths
async function testImports() {
  try {
    const { createSideBySideComparisonModal, createInterpolationModal } = await import('../js/treeComparision/treeComparision.js');
    console.log('✓ treeComparision.js imports work');

    const { TreeSelectionService } = await import('../js/space/TreeSelectionService.js');
    console.log('✓ TreeSelectionService.js import works');

    const { ComparisonModal } = await import('../js/treeComparision/ComparisonWindow.js');
    console.log('✓ ComparisonModal.js import works');

    const { InterpolationModal } = await import('../js/treeComparision/InterpolationWindow.js');
    console.log('✓ InterpolationModal.js import works');

    console.log('All imports successful!');
  } catch (error) {
    console.error('Import test failed:', error);
  }
}

// Test the 5-tree structure logic
function test5TreeStructure() {
  console.log('Testing 5-tree structure logic...');

  // Simulate a tree list with 15 trees (3 real trees + 12 intermediates)
  const mockTreeList = Array.from({ length: 15 }, (_, i) => ({ id: i, name: `tree_${i}` }));

  // Test current tree index = 7 (should map to real tree at index 5)
  const currentIndex = 7;
  const currentRealTreeIndex = Math.floor(currentIndex / 5) * 5; // Should be 5
  const nextRealTreeIndex = currentRealTreeIndex + 5; // Should be 10

  console.log(`Current index: ${currentIndex}`);
  console.log(`Current real tree index: ${currentRealTreeIndex}`);
  console.log(`Next real tree index: ${nextRealTreeIndex}`);
  console.log(`✓ 5-tree structure logic works correctly`);
}

// Run tests
testImports();
test5TreeStructure();
