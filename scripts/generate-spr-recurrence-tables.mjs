#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const DATASETS = [
  {
    dataset: '24',
    fixture: 'demo-bootstrap-24',
    sourceTree:
      'publication_data/bootstrap_rogue_taxa/current_results/dataset_24_source-24_taxa24_sites14190/ranked/all_trees_24_source-24_taxa24_sites14190.nwk',
    payload:
      'publication_data/precomputed/all_trees_24_source-24_taxa24_sites14190.movie.json',
    output:
      'publication_data/bootstrap_rogue_taxa/current_results/dataset_24_source-24_taxa24_sites14190/analysis/moved_subtree_recurrence_24_source-24_taxa24_sites14190.csv',
    targets: ['Ostrich'],
  },
  {
    dataset: '125',
    fixture: 'demo-bootstrap-125',
    sourceTree:
      'publication_data/bootstrap_rogue_taxa/current_results/dataset_125_source-125_taxa125_sites29149/ranked/all_trees_125_source-125_taxa125_sites29149.nwk',
    payload:
      'publication_data/precomputed/all_trees_125_source-125_taxa125_sites29149.movie.json',
    output:
      'publication_data/bootstrap_rogue_taxa/current_results/dataset_125_source-125_taxa125_sites29149/analysis/moved_subtree_recurrence_125_source-125_taxa125_sites29149.csv',
    targets: ['Seq112'],
  },
];

const SUMMARY_OUTPUT =
  'publication_data/bootstrap_rogue_taxa/current_results/SPR_RECURRENCE_SUMMARY.json';

const checkMode = process.argv.includes('--check');

function main() {
  ensurePayloads();
  const summaries = DATASETS.map((dataset) => generateDataset(dataset));
  const summary = {
    schema_version: '1.0',
    description:
      'SPR moved-subtree recurrence tables generated from Phylo-Movies temporal spr_move events in the static bootstrap demo payloads.',
    generation_command: 'npm run publication:spr-recurrence',
    check_command: 'npm run publication:spr-recurrence:check',
    datasets: summaries,
  };

  writeOrCheck(SUMMARY_OUTPUT, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`${checkMode ? 'checked' : 'wrote'} ${DATASETS.length} SPR recurrence dataset(s)`);
}

function ensurePayloads() {
  const missing = DATASETS.filter((dataset) => !fs.existsSync(resolveRoot(dataset.payload)));
  if (missing.length === 0) return;

  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const args = [
    'run',
    'fixtures:generate:ci',
    '--',
    ...missing.flatMap((dataset) => ['--fixture', dataset.fixture]),
  ];
  const result = spawnSync(npm, args, { cwd: ROOT, stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`failed to generate missing fixture payloads for ${missing.map((d) => d.dataset).join(', ')}`);
  }
}

function generateDataset(dataset) {
  const payload = JSON.parse(fs.readFileSync(resolveRoot(dataset.payload), 'utf8'));
  const rows = aggregateRecurrences(payload);
  const csv = createCsv(rows);
  writeOrCheck(dataset.output, csv);

  const target_summaries = dataset.targets.map((target) => {
    const matches = rows
      .filter((row) => row.taxa.includes(target))
      .map((row) => ({
        rank: row.rank,
        moved_subtree: row.moved_subtree,
        taxa_count: row.taxa_count,
        spr_move_count: row.spr_move_count,
        percent_of_spr_moves: Number(row.percent_of_spr_moves.toFixed(6)),
        tree_pair_count: row.tree_pair_count,
        higher_than_percent_of_recurrent_rows: Number(
          row.higher_than_percent_of_recurrent_rows.toFixed(6)
        ),
        split_indices: row.split_indices,
      }));
    return {
      taxon: target,
      top_match: matches[0] ?? null,
      matches,
    };
  });

  return {
    dataset: dataset.dataset,
    source_tree_file: dataset.sourceTree,
    generated_payload_file: dataset.payload,
    recurrence_table: dataset.output,
    recurrence_table_sha256: sha256(csv),
    input_trees: countObservedInputTrees(payload),
    tree_pairs: Array.isArray(payload.pairs) ? payload.pairs.length : 0,
    total_spr_moves: rows.reduce((sum, row) => sum + row.spr_move_count, 0),
    recurrent_moved_subtrees: rows.length,
    target_summaries,
  };
}

function aggregateRecurrences(payload) {
  const taxonNameByIndex = buildTaxonNameByIndex(payload);
  const events = Array.isArray(payload.temporal_events)
    ? payload.temporal_events.filter((event) => event?.event_type === 'spr_move')
    : [];
  const bySignature = new Map();

  for (const event of events) {
    const split = normalizeSplit(event.driver_subtree);
    if (split.length === 0) continue;
    const signature = split.join(',');
    if (!bySignature.has(signature)) {
      bySignature.set(signature, {
        signature,
        split_indices: split,
        taxa: split
          .map((index) => taxonNameByIndex.get(index) ?? `TaxonIndex:${index}`)
          .filter(Boolean),
        spr_move_count: 0,
        total_path_hops: 0,
        total_path_length: 0,
        pair_ids: new Set(),
      });
    }
    const row = bySignature.get(signature);
    row.spr_move_count += 1;
    row.total_path_hops += Number(event.total_hops) || 0;
    row.total_path_length += Number(event.total_branch_length) || 0;
    if (event.pair_id) row.pair_ids.add(event.pair_id);
  }

  const rows = Array.from(bySignature.values()).sort((left, right) => {
    if (right.spr_move_count !== left.spr_move_count) {
      return right.spr_move_count - left.spr_move_count;
    }
    return left.signature.localeCompare(right.signature, 'en', { numeric: true });
  });
  const total = rows.reduce((sum, row) => sum + row.spr_move_count, 0);
  const nRows = rows.length;

  return rows.map((row, index) => {
    const rank = index + 1;
    return {
      rank,
      moved_subtree: row.taxa.length > 0 ? row.taxa.join(', ') : `Nodes: ${row.signature}`,
      taxa: row.taxa,
      taxa_count: row.split_indices.length,
      spr_move_count: row.spr_move_count,
      percent_of_spr_moves: total > 0 ? (row.spr_move_count / total) * 100 : 0,
      tree_pair_count: row.pair_ids.size,
      total_path_hops: row.total_path_hops,
      avg_path_hops: row.spr_move_count > 0 ? row.total_path_hops / row.spr_move_count : 0,
      total_path_length: row.total_path_length,
      avg_path_length: row.spr_move_count > 0 ? row.total_path_length / row.spr_move_count : 0,
      higher_than_percent_of_recurrent_rows:
        nRows > 0 ? ((nRows - rank) / nRows) * 100 : 0,
      split_indices: row.split_indices,
      signature: row.signature,
    };
  });
}

function buildTaxonNameByIndex(payload) {
  const map = new Map();
  const treeNameDefinitions = Array.isArray(payload.tree_name_definitions)
    ? payload.tree_name_definitions
    : [];
  const splitDefinitions = Array.isArray(payload.split_definitions)
    ? payload.split_definitions
    : [];

  const visit = (node) => {
    const normalized = normalizeTreeNode(node, treeNameDefinitions, splitDefinitions);
    if (!normalized) return;

    if (normalized.children.length === 0 && normalized.split.length === 1) {
      const [taxonIndex] = normalized.split;
      const existing = map.get(taxonIndex);
      if (existing !== undefined && existing !== normalized.name) {
        throw new Error(
          `conflicting taxon index mapping for ${taxonIndex}: ${existing} vs ${normalized.name}`
        );
      }
      map.set(taxonIndex, normalized.name);
      return;
    }

    normalized.children.forEach(visit);
  };

  (payload.interpolated_trees ?? []).forEach(visit);

  return map;
}

function normalizeTreeNode(node, treeNameDefinitions, splitDefinitions) {
  if (Array.isArray(node)) {
    return {
      name: treeNameDefinitions[node[1]] ?? '',
      split: splitDefinitions[node[2]] ?? [],
      children: Array.isArray(node[4]) ? node[4] : [],
    };
  }

  if (node && typeof node === 'object') {
    return {
      name: node.name ?? treeNameDefinitions[node.name_ref] ?? '',
      split: node.split_indices ?? splitDefinitions[node.split_ref] ?? [],
      children: Array.isArray(node.children) ? node.children : [],
    };
  }

  return null;
}

function createCsv(rows) {
  const header = [
    'Rank',
    'Moved Subtree',
    'Taxa Count',
    'SPR Move Count',
    '% of SPR Moves',
    'Tree Pair Count',
    'Total Path Hops',
    'Avg Path Hops',
    'Total Path Length',
    'Avg Path Length',
    'Higher Than % of Recurrent Moved Subtrees',
    'Split Indices',
    'Signature',
  ];
  const lines = rows.map((row) => [
    row.rank,
    row.moved_subtree,
    row.taxa_count,
    row.spr_move_count,
    formatFixed(row.percent_of_spr_moves),
    row.tree_pair_count,
    row.total_path_hops,
    formatFixed(row.avg_path_hops),
    formatFixed(row.total_path_length),
    formatFixed(row.avg_path_length),
    formatFixed(row.higher_than_percent_of_recurrent_rows),
    row.split_indices.join(' '),
    row.signature,
  ]);
  return [header, ...lines].map((line) => line.map(escapeCsv).join(',')).join('\n') + '\n';
}

function countObservedInputTrees(payload) {
  if (!Array.isArray(payload.frames)) return 0;
  return payload.frames.filter((frame) => frame?.is_observed_input).length;
}

function normalizeSplit(value) {
  return Array.isArray(value)
    ? Array.from(new Set(value.filter(Number.isFinite))).sort((a, b) => a - b)
    : [];
}

function writeOrCheck(relativePath, content) {
  const filePath = resolveRoot(relativePath);
  if (checkMode) {
    const actual = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
    if (actual !== content) {
      throw new Error(`${relativePath} is not current; run npm run publication:spr-recurrence`);
    }
    return;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function escapeCsv(value) {
  const str = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function formatFixed(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(6) : '0.000000';
}

function resolveRoot(relativePath) {
  return path.join(ROOT, relativePath);
}

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

main();
