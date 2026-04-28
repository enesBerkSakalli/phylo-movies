
// Mock handling logic
const toSubtreeSets = (input) => {
  if (!Array.isArray(input)) return [];
  return input.map((s) => (s instanceof Set ? s : Array.isArray(s) ? new Set(s) : new Set()));
};

// Mock Backend Data (List of Lists)
const mockBackendData = [[12, 13, 14, 15]]; // Single subtree with 4 leaves
const state = {
  subtreeTracking: [
    mockBackendData // Index 0
  ]
};

// Old Logic (Simulated)
const getSubtreeAtIndex_OLD = (state, index) => {
  const subtree = state.subtreeTracking?.[index];
  return Array.isArray(subtree) && subtree.length > 0 ? [subtree] : [];
};

// New Logic (Simulated)
const getSubtreeAtIndex_NEW = (state, index) => {
  const subtree = state.subtreeTracking?.[index];
  return Array.isArray(subtree) ? subtree : [];
};

console.log("--- TEST SUMMARY ---");
console.log("Backend Data (at idx 0):", JSON.stringify(mockBackendData));

// TEST OLD
const oldResult = getSubtreeAtIndex_OLD(state, 0);
console.log("\n[OLD] getSubtreeAtIndex returns:", JSON.stringify(oldResult));
const oldSets = toSubtreeSets(oldResult);
console.log("[OLD] toSubtreeSets result size:", oldSets.length);
oldSets.forEach((s, i) => {
  console.log(`  Set ${i} content:`, [...s]);
  console.log(`  Set ${i} has number 12?`, s.has(12));
  console.log(`  Set ${i} has array [12,13...]?`, [...s].some(item => Array.isArray(item)));
});

// TEST NEW
const newResult = getSubtreeAtIndex_NEW(state, 0);
console.log("\n[NEW] getSubtreeAtIndex returns:", JSON.stringify(newResult));
const newSets = toSubtreeSets(newResult);
console.log("[NEW] toSubtreeSets result size:", newSets.length);
newSets.forEach((s, i) => {
  console.log(`  Set ${i} content:`, [...s]);
  console.log(`  Set ${i} has number 12?`, s.has(12));
});

if (newSets.length === 1 && newSets[0].has(12)) {
  console.log("\nSUCCESS: New logic correctly parses leaf indices.");
} else {
  console.log("\nFAILURE: New logic failed.");
}

// --- HISTORY TEST ---
console.log("\n--- HISTORY TEST ---");

// Real data structure from ostrich_bug_response.json:
// subtree_tracking[i] is [[leaf_indices...], ...] or null
const mockSubtreeTracking = [
  null,           // Index 0 (full tree)
  [[8, 9]],       // Index 1: one subtree
  [[8, 9]],       // Index 2
  [[8, 9]],       // Index 3
  [[17, 18]],     // Index 4: different subtree
  [[17, 18]],     // Index 5
  null            // Index 6 (full tree)
];

const toSubtreeKey = (subtree) => subtree.slice().sort((a, b) => a - b).join(',');

// OLD (buggy): treats tracking[i] as a single subtree
const collectUniqueSubtrees_OLD = (tracking, start, end, excludeKey) => {
  const map = new Map();
  for (let i = start; i < end; i++) {
    const subtree = tracking[i];
    if (Array.isArray(subtree) && subtree.length > 0) {
      const key = toSubtreeKey(subtree);
      if (key !== excludeKey && !map.has(key)) map.set(key, subtree);
    }
  }
  return Array.from(map.values());
};

// NEW (fixed): iterates subtrees at each index
const collectUniqueSubtrees_NEW = (tracking, start, end, excludeKey) => {
  const map = new Map();
  for (let i = start; i < end; i++) {
    const subtreesAtIndex = tracking[i];
    if (!Array.isArray(subtreesAtIndex)) continue;
    
    for (const subtree of subtreesAtIndex) {
      if (Array.isArray(subtree) && subtree.length > 0) {
        const key = toSubtreeKey(subtree);
        if (key !== excludeKey && !map.has(key)) map.set(key, subtree);
      }
    }
  }
  return Array.from(map.values());
};

console.log("Tracking data:", JSON.stringify(mockSubtreeTracking));

// Test collecting history from index 1 to 5
const historyOldResult = collectUniqueSubtrees_OLD(mockSubtreeTracking, 1, 5, null);
const historyNewResult = collectUniqueSubtrees_NEW(mockSubtreeTracking, 1, 5, null);

console.log("\n[OLD - buggy] collectUniqueSubtrees(1, 5):");
console.log("  Result:", JSON.stringify(historyOldResult));
console.log("  Converts to Sets:", historyOldResult.map(s => toSubtreeSets([s])[0] ? [...toSubtreeSets([s])[0]] : 'invalid'));

console.log("\n[NEW - fixed] collectUniqueSubtrees(1, 5):");
console.log("  Result:", JSON.stringify(historyNewResult));
const historySets = toSubtreeSets(historyNewResult);
console.log("  Converts to Sets:", historySets.map(s => [...s]));
console.log("  Set 0 has number 8?", historySets[0]?.has(8));
console.log("  Set 1 has number 17?", historySets[1]?.has(17));

if (historyNewResult.length === 2 && 
    historySets[0]?.has(8) && historySets[0]?.has(9) &&
    historySets[1]?.has(17) && historySets[1]?.has(18)) {
  console.log("\nSUCCESS: Fixed collectUniqueSubtrees correctly extracts individual subtrees!");
} else {
  console.log("\nFAILURE: Fix not working correctly.");
}

