#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createTreeScalingDiagnostics } from '../src/treeVisualisation/diagnostics/treeScalingDiagnostics.js';

const args = parseArgs(process.argv.slice(2));
const filePath = resolve(args.file ?? 'test/data/small_example/small_example.response.json');
const movieData = JSON.parse(readFileSync(filePath, 'utf8'));
const report = createTreeScalingDiagnostics(movieData, {
  fileName: filePath,
  width: args.width,
  height: args.height,
  fontSize: args.fontSize,
  branchTransformation: args.branchTransformation,
  treeIndices: args.trees,
});

printReport(report);

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--file') parsed.file = argv[++i];
    else if (arg === '--width') parsed.width = Number(argv[++i]);
    else if (arg === '--height') parsed.height = Number(argv[++i]);
    else if (arg === '--font-size') parsed.fontSize = argv[++i];
    else if (arg === '--branch-transformation') parsed.branchTransformation = argv[++i];
    else if (arg === '--trees')
      parsed.trees = argv[++i].split(',').map((value) => Number(value.trim()));
    else if (!parsed.file) parsed.file = arg;
  }
  return parsed;
}

function printReport(report) {
  console.log('\nTree scaling diagnostics');
  console.log(
    JSON.stringify(
      {
        dataset: report.dataset,
        global: roundObject(report.global),
      },
      null,
      2
    )
  );

  console.table(
    report.trees.map((tree) => ({
      tree: tree.treeIndex,
      input: tree.isInputFrame,
      leaves: tree.labelRing.leafCount,
      originalRootTip: round(tree.branchGeometry.originalRootToTipMax),
      activeRootTip: round(tree.branchGeometry.activeRootToTipMax),
      activeVsOriginal: round(tree.branchGeometry.activeToOriginalRootTipRatio),
      rawRootTip: round(tree.branchGeometry.rawRootToTipMax),
      flooredRootTip: round(tree.branchGeometry.flooredRootToTipMax),
      originalGlobalRatio: round(tree.branchGeometry.originalToGlobalRatio),
      activeGlobalRatio: round(tree.branchGeometry.rawToGlobalRatio),
      maxRadius: round(tree.branchGeometry.maxRadius),
      uniformScale: round(tree.branchGeometry.uniformScale),
      readableScale: round(tree.branchGeometry.readableScale),
      compactLabelRadius: round(tree.labelRing.compactLabelRadius),
      labelRadius: round(tree.labelRing.labelRadius),
      labelInflation: round(tree.labelRing.labelInflation),
      branchBounds: round(tree.viewport.branchOnlyBounds.radius),
      extBounds: round(tree.viewport.branchWithExtensionsBounds.radius),
      autoBounds: round(tree.viewport.autoVisibleBounds.radius),
      branchZoom: round(tree.viewport.branchOnlyZoom),
      branchExtZoom: round(tree.viewport.branchWithExtensionsZoom),
      autoZoom: round(tree.viewport.autoVisibleZoom),
      extDelta: round(tree.viewport.extensionZoomDelta),
      autoDelta: round(tree.viewport.autoVisibleZoomDelta),
    }))
  );

  console.log(
    '\nInterpretation: negative extDelta means extension rings shrink branch-focused fit; negative autoDelta means labels plus extensions shrink auto-visible fit.'
  );
}

function round(value) {
  return Number.isFinite(value) ? Number(value.toFixed(4)) : value;
}

function roundObject(object) {
  return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, round(value)]));
}
