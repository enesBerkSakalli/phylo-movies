/**
 * Debug script to trace subtree highlighting data flow
 */
const fs = require('fs');

// Load actual backend response
const data = JSON.parse(fs.readFileSync('./data/ostrich_bug_response.json', 'utf8'));

console.log("=== SUBTREE FLOW DEBUG ===\n");

// 1. Check raw subtree_tracking data
console.log("1. RAW subtree_tracking (first 5 entries):");
data.subtree_tracking.slice(0, 5).forEach((entry, i) => {
  console.log(`   [${i}]:`, JSON.stringify(entry));
});

// 2. Simulate getSubtreeAtIndex
const getSubtreeAtIndex = (subtreeTracking, index) => {
  const subtree = subtreeTracking?.[index];
  return Array.isArray(subtree) ? subtree : [];
};

console.log("\n2. getSubtreeAtIndex results:");
[1, 2, 9, 10].forEach(idx => {
  const result = getSubtreeAtIndex(data.subtree_tracking, idx);
  console.log(`   Index ${idx}:`, JSON.stringify(result));
});

// 3. Simulate toSubtreeSets
const toSubtreeSets = (input) => {
  if (!Array.isArray(input)) return [];
  return input.map((s) => (s instanceof Set ? s : Array.isArray(s) ? new Set(s) : new Set()));
};

console.log("\n3. After toSubtreeSets:");
const subtreeAtIdx1 = getSubtreeAtIndex(data.subtree_tracking, 1);
const setsAtIdx1 = toSubtreeSets(subtreeAtIdx1);
console.log(`   Input: ${JSON.stringify(subtreeAtIdx1)}`);
console.log(`   Sets count: ${setsAtIdx1.length}`);
setsAtIdx1.forEach((s, i) => {
  console.log(`   Set ${i}: [${[...s].join(', ')}]`);
});

// 4. Test isSubset logic
const isSubset = (smaller, larger) => {
  if (!Array.isArray(smaller) || smaller.length === 0) return false;
  const largerSet = larger instanceof Set ? larger : new Set(larger);
  return smaller.length <= largerSet.size && smaller.every(x => largerSet.has(x));
};

console.log("\n4. isSubset matching tests:");
// A link with split_indices [8] should be subset of subtree [8, 9]
const subtreeSet = new Set([8, 9]);
console.log(`   [8] ⊆ {8,9}? ${isSubset([8], subtreeSet)}`);       // Should be true
console.log(`   [9] ⊆ {8,9}? ${isSubset([9], subtreeSet)}`);       // Should be true
console.log(`   [8,9] ⊆ {8,9}? ${isSubset([8, 9], subtreeSet)}`);  // Should be true
console.log(`   [10] ⊆ {8,9}? ${isSubset([10], subtreeSet)}`);     // Should be false

// 5. Simulate full flow: check if a link would be highlighted
const getSplitIndices = (element) => {
  return element?.data?.split_indices || element?.split_indices || null;
};

const isSubsetOfAny = (element, targetSets) => {
  const splits = getSplitIndices(element);
  if (!splits || !targetSets?.length) return false;
  for (const target of targetSets) {
    if (isSubset(splits, target)) return true;
  }
  return false;
};

const isLinkInSubtree = (linkData, subtreeSets) => {
  return isSubsetOfAny(linkData?.target, subtreeSets);
};

console.log("\n5. Full flow simulation:");

// Mock link data (as it would come from D3)
const mockLink = {
  target: {
    data: {
      split_indices: [8]  // Leaf with index 8
    }
  }
};

// Get subtrees and convert to sets (as updateMarkedSubtrees does)
const rawSubtrees = getSubtreeAtIndex(data.subtree_tracking, 1);
const markedSets = toSubtreeSets(rawSubtrees);

console.log(`   Raw subtrees at index 1: ${JSON.stringify(rawSubtrees)}`);
console.log(`   Converted to ${markedSets.length} Set(s): [${markedSets.map(s => `{${[...s].join(',')}}`).join(', ')}]`);
console.log(`   Link target split_indices: [${mockLink.target.data.split_indices.join(', ')}]`);
console.log(`   isLinkInSubtree result: ${isLinkInSubtree(mockLink, markedSets)}`);

// 6. Check if the problem is with how the tree's leaves are structured
console.log("\n6. Check tree structure for leaves 8, 9:");
const findLeaves = (node, leafIndices = []) => {
  if (!node.children || node.children.length === 0) {
    leafIndices.push({ name: node.name, splits: node.split_indices });
  } else {
    node.children.forEach(c => findLeaves(c, leafIndices));
  }
  return leafIndices;
};

const leaves = findLeaves(data.interpolated_trees[0]);
const relevantLeaves = leaves.filter(l => l.splits && (l.splits.includes(8) || l.splits.includes(9)));
console.log("   Leaves with index 8 or 9:", relevantLeaves);

// 7. Sorted leaves mapping
console.log("\n7. Sorted leaves (indices 8,9,17,18):");
[8, 9, 17, 18].forEach(idx => {
  console.log(`   Index ${idx}: ${data.sorted_leaves[idx]}`);
});

console.log("\n=== END DEBUG ===");

// 8. Test the full slice function flow
console.log("\n=== SLICE FUNCTION TESTS ===");

// Simulate the store state
const mockState = {
  subtreeTracking: data.subtree_tracking,
  currentTreeIndex: 1,
  transitionResolver: { isFullTree: (idx) => idx === 0 || idx === data.subtree_tracking.length - 1 },
  markedSubtreeMode: 'current'
};

// Test getMarkedSubtreeData logic
const getSubtreeAtIndex_slice = (state, index) => {
  const subtree = state.subtreeTracking?.[index];
  return Array.isArray(subtree) ? subtree : [];
};

const getMarkedSubtreeData_test = (state, indexOverride = null) => {
  const index = indexOverride ?? state.currentTreeIndex;
  if (state.transitionResolver?.isFullTree?.(index)) return [];
  return state.markedSubtreeMode === 'current'
    ? getSubtreeAtIndex_slice(state, index)
    : [];
};

console.log("\n8. getMarkedSubtreeData simulation:");
const markedData = getMarkedSubtreeData_test(mockState);
console.log(`   At index 1: ${JSON.stringify(markedData)}`);
console.log(`   Expected: [[8,9]]`);
console.log(`   Match: ${JSON.stringify(markedData) === JSON.stringify([[8, 9]])}`);

// Test updateColorManagerMarkedSubtrees logic
const toSubtreeSets_slice = (input) => {
  if (!Array.isArray(input)) return [];
  return input.map((s) => (s instanceof Set ? s : Array.isArray(s) ? new Set(s) : new Set()));
};

console.log("\n9. toSubtreeSets simulation:");
const sets = toSubtreeSets_slice(markedData);
console.log(`   Input: ${JSON.stringify(markedData)}`);
console.log(`   Output Sets: ${sets.length}`);
sets.forEach((s, i) => console.log(`   Set ${i}: [${[...s].join(', ')}]`));

// Mock ColorManager
class MockColorManager {
  constructor() {
    this.sharedMarkedJumpingSubtrees = [];
  }

  updateMarkedSubtrees(markedSubtrees) {
    let subtrees = [];
    if (Array.isArray(markedSubtrees)) {
      subtrees = markedSubtrees;
    } else if (markedSubtrees instanceof Set) {
      subtrees = [markedSubtrees];
    }
    this.sharedMarkedJumpingSubtrees = subtrees.map(s =>
      s instanceof Set ? s : new Set(s)
    );
    console.log(`   ColorManager updated with ${this.sharedMarkedJumpingSubtrees.length} set(s)`);
    this.sharedMarkedJumpingSubtrees.forEach((s, i) => {
      console.log(`   -> Set ${i}: [${[...s].join(', ')}]`);
    });
  }
}

console.log("\n10. ColorManager.updateMarkedSubtrees simulation:");
const cm = new MockColorManager();
cm.updateMarkedSubtrees(toSubtreeSets_slice(markedData));

// Test link matching
console.log("\n11. Link matching against ColorManager data:");
const testLinks = [
  { name: "Caiman", target: { data: { split_indices: [8] } } },
  { name: "Alligator", target: { data: { split_indices: [9] } } },
  { name: "Both", target: { data: { split_indices: [8, 9] } } },
  { name: "Ostrich", target: { data: { split_indices: [10] } } },
];

testLinks.forEach(link => {
  const result = isLinkInSubtree(link, cm.sharedMarkedJumpingSubtrees);
  console.log(`   Link "${link.name}" [${link.target.data.split_indices}]: ${result ? "✓ HIGHLIGHTED" : "✗ not highlighted"}`);
});

console.log("\n=== END SLICE TESTS ===");

// 12. Test visibility logic - is outline layer visible?
console.log("\n=== VISIBILITY CHECK ===");
console.log("12. Test if link outline layer would be visible:");
const colorManagerForVisibility = {
  hasActiveChangeEdges: () => false,  // Assuming no active change edges for subtree test
  sharedMarkedJumpingSubtrees: cm.sharedMarkedJumpingSubtrees  // from test 10
};

const hasHighlights = !!(
  colorManagerForVisibility.hasActiveChangeEdges?.() ||
  (colorManagerForVisibility.sharedMarkedJumpingSubtrees?.length > 0)
);
console.log(`   hasActiveChangeEdges: ${colorManagerForVisibility.hasActiveChangeEdges()}`);
console.log(`   sharedMarkedJumpingSubtrees.length: ${colorManagerForVisibility.sharedMarkedJumpingSubtrees?.length}`);
console.log(`   hasHighlights (outline visible): ${hasHighlights}`);

if (!hasHighlights) {
  console.log("   ⚠️ WARNING: Link outline layer would NOT be visible!");
} else {
  console.log("   ✓ Link outline layer would be visible");
}

console.log("\n=== ALL TESTS COMPLETE ===");
