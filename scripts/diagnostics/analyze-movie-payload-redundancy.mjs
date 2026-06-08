#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const DEFAULT_GLOB_DIR = path.resolve(process.cwd(), 'publication_data/precomputed');

const files = parseFileArgs(process.argv.slice(2));
if (files.length === 0) {
  console.error(
    'No movie JSON files found. Pass files explicitly or run from the repository root.'
  );
  process.exit(1);
}

for (const filePath of files) {
  analyzeFile(filePath);
}

function parseFileArgs(args) {
  const explicitFiles = args.filter((arg) => !arg.startsWith('-'));
  if (explicitFiles.length > 0) {
    return explicitFiles.map((arg) => path.resolve(process.cwd(), arg));
  }

  if (!fs.existsSync(DEFAULT_GLOB_DIR)) return [];
  return fs
    .readdirSync(DEFAULT_GLOB_DIR)
    .filter((fileName) => fileName.endsWith('.movie.json'))
    .sort()
    .map((fileName) => path.join(DEFAULT_GLOB_DIR, fileName));
}

function analyzeFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  const payload = JSON.parse(buffer.toString('utf8'));
  const topFields = summarizeTopFields(payload);
  const treeStats = summarizeTrees(payload);

  console.log(`\n${path.relative(process.cwd(), filePath)}`);
  console.log(
    [
      `raw=${formatBytes(buffer.length)}`,
      `gzip=${formatBytes(gzipSize(buffer))}`,
      `brotli=${formatBytes(brotliSize(buffer))}`,
      `trees=${treeStats.treeCount}`,
      `nodes=${treeStats.nodeCount}`,
    ].join('\t')
  );

  console.log('top_fields');
  for (const field of topFields.slice(0, 10)) {
    console.log(`  ${field.name}\t${formatBytes(field.bytes)}`);
  }

  console.log('tree_redundancy');
  console.log(`  unique_tree_shapes\t${treeStats.uniqueTreeShapes}`);
  console.log(`  repeated_shape_frames\t${treeStats.repeatedShapeFrames}`);
  console.log(`  max_shape_repeat\t${treeStats.maxShapeRepeat}`);

  console.log('annotation_redundancy');
  console.log(`  annotation_instances\t${treeStats.annotationInstances}`);
  console.log(`  unique_annotation_sets\t${treeStats.uniqueAnnotationSets}`);
  console.log(`  repeated_annotation_instances\t${treeStats.repeatedAnnotationInstances}`);
  console.log(`  max_annotation_repeat\t${treeStats.maxAnnotationRepeat}`);

  console.log('split_redundancy');
  console.log(`  split_definitions\t${treeStats.splitDefinitionCount}`);
  console.log(`  split_definition_indices\t${treeStats.splitDefinitionIndexCount}`);
  console.log(`  split_ref_nodes\t${treeStats.splitRefNodes}`);
  console.log(`  inline_split_nodes\t${treeStats.inlineSplitNodes}`);
  console.log(`  max_split_ref_repeat\t${treeStats.maxSplitRefRepeat}`);
}

function summarizeTopFields(payload) {
  return Object.keys(payload)
    .map((name) => ({
      name,
      bytes: Buffer.byteLength(JSON.stringify(payload[name])),
    }))
    .sort((left, right) => right.bytes - left.bytes);
}

function summarizeTrees(payload) {
  const trees = Array.isArray(payload.interpolated_trees) ? payload.interpolated_trees : [];
  const splitDefinitions = Array.isArray(payload.split_definitions)
    ? payload.split_definitions
    : [];
  const shapeCounts = new Map();
  const annotationCounts = new Map();
  const splitRefCounts = new Map();

  let nodeCount = 0;
  let annotationInstances = 0;
  let splitRefNodes = 0;
  let inlineSplitNodes = 0;

  for (const tree of trees) {
    const hash = crypto.createHash('sha256');
    walkTree(tree, {
      visitNode(node) {
        nodeCount += 1;
        const splitRef = getSplitRef(node);
        const splitIndices = getInlineSplitIndices(node);
        const annotation = getAnnotationValues(node);

        if (Number.isInteger(splitRef)) {
          splitRefNodes += 1;
          increment(splitRefCounts, splitRef);
        } else if (Array.isArray(splitIndices)) {
          inlineSplitNodes += 1;
        }

        if (annotation !== null) {
          annotationInstances += 1;
          increment(annotationCounts, stableJson(annotation));
        }
      },
      updateShape(node) {
        updateShapeHash(hash, node);
      },
    });
    increment(shapeCounts, hash.digest('hex'));
  }

  return {
    treeCount: trees.length,
    nodeCount,
    uniqueTreeShapes: shapeCounts.size,
    repeatedShapeFrames: countRepeatedInstances(shapeCounts),
    maxShapeRepeat: maxCount(shapeCounts),
    annotationInstances,
    uniqueAnnotationSets: annotationCounts.size,
    repeatedAnnotationInstances: countRepeatedInstances(annotationCounts),
    maxAnnotationRepeat: maxCount(annotationCounts),
    splitDefinitionCount: splitDefinitions.length,
    splitDefinitionIndexCount: splitDefinitions.reduce(
      (total, split) => total + (Array.isArray(split) ? split.length : 0),
      0
    ),
    splitRefNodes,
    inlineSplitNodes,
    maxSplitRefRepeat: maxCount(splitRefCounts),
  };
}

function walkTree(root, visitors) {
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;

    visitors.visitNode(node);
    visitors.updateShape(node);

    const children = getChildren(node);
    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push(children[index]);
    }
  }
}

function updateShapeHash(hash, node) {
  const children = getChildren(node);
  hash.update('n:');
  hash.update(String(getNameRef(node)));
  hash.update('|s:');
  hash.update(String(getSplitRef(node)));
  hash.update('|i:');
  hash.update(stableJson(getInlineSplitIndices(node)));
  hash.update('|a:');
  hash.update(stableJson(getAnnotationValues(node)));
  hash.update('|c:');
  hash.update(String(children.length));
  hash.update(';');
}

function getChildren(node) {
  if (Array.isArray(node)) return Array.isArray(node[4]) ? node[4] : [];
  return Array.isArray(node?.children) ? node.children : [];
}

function getNameRef(node) {
  if (Array.isArray(node)) return node[1];
  return node?.name_ref ?? node?.name ?? null;
}

function getSplitRef(node) {
  if (Array.isArray(node)) return node[2];
  return node?.split_ref ?? null;
}

function getInlineSplitIndices(node) {
  if (Array.isArray(node)) return null;
  return Array.isArray(node?.split_indices) ? node.split_indices : null;
}

function getAnnotationValues(node) {
  if (Array.isArray(node)) return node[3] === null ? null : node[3];
  if (node?.annotation_values !== undefined) return node.annotation_values;
  if (node?.annotations?.fields) {
    return Object.entries(node.annotations.fields).map(([key, value]) => [key, value]);
  }
  return null;
}

function stableJson(value) {
  if (value === null || value === undefined) return 'null';
  return JSON.stringify(value);
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function countRepeatedInstances(map) {
  let total = 0;
  for (const count of map.values()) {
    if (count > 1) total += count;
  }
  return total;
}

function maxCount(map) {
  let max = 0;
  for (const count of map.values()) {
    if (count > max) max = count;
  }
  return max;
}

function gzipSize(buffer) {
  return zlib.gzipSync(buffer, { level: 9 }).length;
}

function brotliSize(buffer) {
  return zlib.brotliCompressSync(buffer, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
    },
  }).length;
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}
