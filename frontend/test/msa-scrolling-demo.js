#!/usr/bin/env node

/**
 * MSA Scrolling Demo Script
 * Demonstrates the MSA automated scrolling calculations
 * Run this to see how the window positions change as you navigate through trees
 */

console.log("🧬 MSA Automated Scrolling Demo\n");

// Mock the core MSA calculation functions from GUI class
function createMSACalculator(windowSize, stepSize, treeNames) {
  const fullTreeIndices = [];
  treeNames.forEach((name, index) => {
    if (name && !name.startsWith('I') && !name.startsWith('C')) {
      fullTreeIndices.push(index);
    }
  });

  function getCurrentFullTreeDataIndex(currentTreeIndex, firstFull) {
    let N = fullTreeIndices.length;
    if (N === 0) return 0;

    let transitionIndex = 0;
    for (let i = 0; i < N - 1; i++) {
      const currentFullTreeIndex = fullTreeIndices[i];
      const nextFullTreeIndex = fullTreeIndices[i + 1];
      if (currentTreeIndex >= currentFullTreeIndex && currentTreeIndex < nextFullTreeIndex) {
        transitionIndex = i;
        break;
      }
    }

    if (currentTreeIndex >= fullTreeIndices[N - 1]) {
      transitionIndex = Math.max(0, N - 2);
    }

    const isCurrentTreeFull = fullTreeIndices.includes(currentTreeIndex);
    if (isCurrentTreeFull && firstFull === 0) {
      if (transitionIndex > 0) {
        return transitionIndex - 1;
      } else {
        return 0;
      }
    }
    return transitionIndex;
  }

  function calculateWindow(currentTreeIndex, firstFull) {
    const currentFullTreeDataIdx = getCurrentFullTreeDataIndex(currentTreeIndex, firstFull);
    let startPosition = currentFullTreeDataIdx * stepSize + 1;
    let endPosition = startPosition + windowSize - 1;

    startPosition = Math.max(1, startPosition);
    endPosition = Math.max(startPosition, endPosition);

    return {
      startPosition,
      endPosition,
      dataIndex: currentFullTreeDataIdx
    };
  }

  return {
    calculateWindow,
    getCurrentFullTreeDataIndex,
    fullTreeIndices
  };
}

// Demo configuration
const windowSize = 100;
const stepSize = 50;
const treeNames = ["T0", "I0-1", "I0-2", "T1", "I1-1", "I1-2", "T2", "I2-1", "T3"];

console.log(`Configuration:`);
console.log(`  MSA Window Size: ${windowSize}`);
console.log(`  MSA Step Size: ${stepSize}`);
console.log(`  Tree Sequence: ${treeNames.join(" → ")}`);
console.log(`\n${"=".repeat(70)}\n`);

const calculator = createMSACalculator(windowSize, stepSize, treeNames);

console.log("Full Trees Found:", calculator.fullTreeIndices.map(i => `${treeNames[i]} (index ${i})`));
console.log("\n" + "=".repeat(70) + "\n");

// Demonstrate navigation through different tree positions
const testCases = [
  { treeIndex: 0, firstFull: 1, description: "T0 (Start of T0→T1 transition)" },
  { treeIndex: 0, firstFull: 0, description: "T0 (End of previous transition - edge case)" },
  { treeIndex: 1, firstFull: 0, description: "I0-1 (Interpolated between T0 and T1)" },
  { treeIndex: 3, firstFull: 1, description: "T1 (Start of T1→T2 transition)" },
  { treeIndex: 3, firstFull: 0, description: "T1 (End of T0→T1 transition)" },
  { treeIndex: 4, firstFull: 0, description: "I1-1 (Interpolated between T1 and T2)" },
  { treeIndex: 6, firstFull: 1, description: "T2 (Start of T2→T3 transition)" },
  { treeIndex: 6, firstFull: 0, description: "T2 (End of T1→T2 transition)" },
  { treeIndex: 8, firstFull: 1, description: "T3 (Final tree)" }
];

console.log("MSA Window Positions During Navigation:\n");

testCases.forEach((testCase, index) => {
  const window = calculator.calculateWindow(testCase.treeIndex, testCase.firstFull);
  const dataIndex = calculator.getCurrentFullTreeDataIndex(testCase.treeIndex, testCase.firstFull);

  console.log(`${index + 1}. ${testCase.description}`);
  console.log(`   Tree Index: ${testCase.treeIndex}, firstFull: ${testCase.firstFull}`);
  console.log(`   → Transition Data Index: ${dataIndex}`);
  console.log(`   → MSA Window: positions ${window.startPosition}-${window.endPosition}`);
  console.log(`   → Window Range: ${window.endPosition - window.startPosition + 1} positions`);
  console.log("");
});

console.log("=".repeat(70));
console.log("🎯 Key Insights:");
console.log("• Each full tree can be shown in two states: start and end of transitions");
console.log("• MSA window positions advance by stepSize (50) for each transition");
console.log("• Interpolated trees inherit their transition's MSA window");
console.log("• Window size (100) determines how many alignment positions are visible");
console.log("• This enables synchronized scrolling between tree and MSA viewers");

console.log("\n🧪 Run the full test suite with: npm run test:msa-scrolling");
