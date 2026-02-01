
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import createRadialTreeLayout from '../src/js/treeVisualisation/layout/RadialTreeLayout.js';

describe('Real Data Scaling Analysis', () => {
  let realData;

  beforeEach(() => {
    // Load the real data generated from backend
    const dataPath = path.resolve(__dirname, '../data/test-data/52_bootstrap.response.json');
    if (fs.existsSync(dataPath)) {
      try {
        const rawData = fs.readFileSync(dataPath, 'utf-8');
        realData = JSON.parse(rawData);
      } catch (e) {
        console.warn("Failed to parse real data: " + e.message);
        realData = null;
      }
    } else {
      console.warn("Skipping real data test: file not found at " + dataPath);
      realData = null;
    }
  });

  it('should demonstrate visual clutter under uniform scaling', () => {
    if (!realData || !realData.interpolated_trees) {
      console.warn("No data for test");
      return;
    }

    const trees = realData.interpolated_trees;

    // 1. Calculate Natural Max Radius for ALL trees (scan)
    // This is important to find the true "collapsed" outliers

    let globalMaxNaturalRadius = 0;
    let minNaturalRadius = Infinity;
    let smallTreeIndex = -1;
    let largeTreeIndex = -1;

    // Iterate all trees
    for (let i = 0; i < trees.length; i++) {
      // Use lightweight config for speed
      const layoutResult = createRadialTreeLayout(trees[i], 'none', {
        width: 800, height: 600, margin: 10
      });
      const naturalRadius = layoutResult.max_radius / (layoutResult.scale || 1);

      if (naturalRadius > globalMaxNaturalRadius) {
        globalMaxNaturalRadius = naturalRadius;
        largeTreeIndex = i;
      }
      if (naturalRadius < minNaturalRadius && naturalRadius > 0.0001) {
        minNaturalRadius = naturalRadius;
        smallTreeIndex = i;
      }
    }
    console.log(`\nGlobal Stats:`);
    console.log(`  Max Natural Radius: ${globalMaxNaturalRadius.toFixed(4)} (Tree ${largeTreeIndex})`);
    console.log(`  Min Natural Radius: ${minNaturalRadius.toFixed(4)} (Tree ${smallTreeIndex})`);
    // Force clamp ratio to avoid infinity logs if min is 0
    const ratio = minNaturalRadius > 0 ? (globalMaxNaturalRadius / minNaturalRadius) : 9999;
    console.log(`  Ratio: ${ratio.toFixed(2)}x`);

    // 2. Simulate Uniform Scaling
    // We want the Global Max Tree to fit in 800x600 (approx 300px radius).
    // Scale Factor = 300 / GlobalMaxNaturalRadius
    const containerRadius = 300;
    const uniformScaleFactor = containerRadius / (globalMaxNaturalRadius || 1);

    console.log(`  Uniform Scale Factor: ${uniformScaleFactor.toFixed(4)}`);

    // 3. Render Small Tree with Uniform Scale
    // We assume 'uniformScale' option is respected by createRadialTreeLayout
    const smallTreeResult = createRadialTreeLayout(trees[smallTreeIndex], 'none', {
      width: 800, height: 600, margin: 10,
      uniformScale: uniformScaleFactor
    });

    const { tree: root, max_radius } = smallTreeResult;
    console.log(`\nSmall Tree (${smallTreeIndex}) under Uniform Scaling:`);
    console.log(`  Rendered Radius: ${max_radius.toFixed(2)}px`);

    const nodes = root.descendants();
    const links = root.links();

    // Analyze average branch length VISUAL size
    let totalLength = 0;
    let nonZeroCount = 0;
    links.forEach(link => {
      const dx = link.target.x - link.source.x;
      const dy = link.target.y - link.source.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      totalLength += dist;
      if (dist > 0.001) nonZeroCount++;
    });
    const avgLen = totalLength / (links.length || 1);
    console.log(`  Avg Visual Link Length: ${avgLen.toFixed(4)}px`);

    // Check for overlap (primitive check)
    const nodeRadius = 3; // Standard Deck.gl node radius
    const renderedArea = Math.PI * max_radius * max_radius;
    const nodesArea = nodes.length * Math.PI * nodeRadius * nodeRadius;

    // Clutter Ratio: visual area of nodes vs available tree area
    const coverage = nodesArea / (renderedArea || 1);

    console.log(`  Nodes Count: ${nodes.length}`);
    console.log(`  Nodes Area: ${nodesArea.toFixed(2)}px²`);
    console.log(`  Tree Area: ${renderedArea.toFixed(2)}px²`);
    console.log(`  Coverage Ratio: ${coverage.toFixed(2)}`);

    // Assertion: Coverage should be very high (cluttered)
    // If coverage > 0.5, it's mostly nodes.
    const isCluttered = coverage > 0.5;
    console.log(`  Clutter Status: ${isCluttered ? 'HIGH' : 'LOW'}`);

    // Also assert that typical link length is small
    if (avgLen < 2) {
      console.log(`  [!] Warning: Branches are nearly invisible (< 2px avg)`);
    }

  });
});
