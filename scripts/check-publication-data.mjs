#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLICATION_ROOT = path.join(ROOT, 'publication_data');
export const TAXA_SCALE_TIERS = [
  {
    label: 'committed-small',
    taxa: 24,
    source: 'RogueNaRok/Aberer publication bootstrap result',
  },
  {
    label: 'committed-medium',
    taxa: 125,
    source: 'RogueNaRok/Aberer publication bootstrap result',
  },
  {
    label: 'committed-msa',
    taxa: 334,
    source: 'Norovirus publication MSA',
  },
  {
    label: 'committed-tree-search',
    taxa: 500,
    source: 'IQ-TREE topology-search trajectory example',
  },
];

export function auditPublicationData(root = ROOT) {
  const errors = [];
  const publicationRoot = path.join(root, 'publication_data');
  const manuscriptFacts = readManuscriptFacts(root, errors);
  const bootstrap = auditBootstrapRogueTaxa(
    publicationRoot,
    errors,
    manuscriptFacts.bootstrap_rogue_taxa
  );
  const norovirus = auditNorovirus(
    publicationRoot,
    errors,
    manuscriptFacts.norovirus_publication_demo
  );
  const topologySearch = auditTopologySearch(publicationRoot, errors);
  const manuscriptFactsReport = auditManuscriptFacts(root, manuscriptFacts, errors);
  const maxPublicationTaxa = Math.max(
    ...bootstrap.currentResults.map((entry) => entry.taxa),
    topologySearch.currentResult.taxa,
    ...norovirus.alignments
      .filter((entry) => entry.format === 'fasta_msa')
      .map((entry) => entry.sequences)
  );

  return {
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    errors,
    maxPublicationTaxa,
    scaleTiers: TAXA_SCALE_TIERS,
    manuscriptFacts: manuscriptFactsReport,
    bootstrap,
    norovirus,
    topologySearch,
  };
}

function readManuscriptFacts(root, errors) {
  const factsPath = path.join(root, 'publication_data', 'manuscript_facts.yml');
  requireFile(factsPath, errors);
  if (!fs.existsSync(factsPath)) {
    return {};
  }

  const facts = yaml.load(fs.readFileSync(factsPath, 'utf8'));
  if (facts?.schema_version !== 1) {
    errors.push(`${relative(factsPath)} has unsupported schema_version ${facts?.schema_version}`);
  }
  return facts || {};
}

function auditManuscriptFacts(root, facts, errors) {
  const factsPath = path.join(root, 'publication_data', 'manuscript_facts.yml');
  for (const section of ['norovirus_publication_demo', 'bootstrap_rogue_taxa']) {
    if (!facts?.[section]) {
      errors.push(`${relative(factsPath)} is missing ${section}`);
    }
  }

  return {
    status: fs.existsSync(factsPath) ? 'checked' : 'missing',
    file: relative(factsPath),
  };
}

function auditBootstrapRogueTaxa(publicationRoot, errors, manuscriptFacts = {}) {
  const sourceRoot = path.join(publicationRoot, 'bootstrap_rogue_taxa', 'source_alignments');
  const sourceManifest = readTsv(path.join(sourceRoot, 'MANIFEST.tsv'));
  const sourceAlignments = sourceManifest.map((entry) => {
    const filePath = path.join(sourceRoot, entry.filename);
    requireFile(filePath, errors);
    checkSha(filePath, entry.local_sha256, errors);
    const observed = readRelaxedPhylipCounts(filePath);
    expectNumber(observed.taxa, Number(entry.taxa), `${entry.filename} taxa`, errors);
    expectNumber(observed.sites, Number(entry.sites), `${entry.filename} sites`, errors);
    return {
      filename: entry.filename,
      taxa: Number(entry.taxa),
      sites: Number(entry.sites),
      sha256: entry.local_sha256,
    };
  });

  const currentRoot = path.join(publicationRoot, 'bootstrap_rogue_taxa', 'current_results');
  const currentManifestPath = path.join(currentRoot, 'CURRENT_RESULTS_MANIFEST.json');
  const currentManifest = JSON.parse(fs.readFileSync(currentManifestPath, 'utf8'));
  const sprRecurrence = auditSprRecurrenceTables(currentRoot, errors, manuscriptFacts);
  const currentResults = currentManifest.datasets.map((dataset) => {
    const treePath = path.join(currentRoot, dataset.ranked_trees_file);
    const orderPath = path.join(currentRoot, dataset.ranked_order_file);
    const supportPath = path.join(currentRoot, dataset.split_support_file);
    for (const filePath of [treePath, orderPath, supportPath]) {
      requireFile(filePath, errors);
    }
    checkSha(treePath, dataset.ranked_trees_sha256, errors);
    checkSha(orderPath, dataset.ranked_order_sha256, errors);
    checkSha(supportPath, dataset.split_support_sha256, errors);

    const trees = readNonEmptyLines(treePath);
    const firstTreeTaxa = countNewickLeafLabels(trees[0] || '');
    expectNumber(
      trees.length,
      dataset.all_trees_lines,
      `${dataset.dataset} ranked tree count`,
      errors
    );
    expectNumber(
      firstTreeTaxa,
      dataset.expected_taxa,
      `${dataset.dataset} first-tree taxa`,
      errors
    );
    if (!trees[0]?.includes('support_kind=bootstrap_replicate_split_frequency')) {
      errors.push(`${relative(treePath)} is missing bootstrap support annotations`);
    }

    return {
      dataset: dataset.dataset,
      taxa: dataset.expected_taxa,
      sites: dataset.expected_sites,
      treeCount: trees.length,
      rankedTreesFile: dataset.ranked_trees_file,
    };
  });

  return {
    sourceAlignments,
    currentResults,
    sprRecurrence,
  };
}

function auditSprRecurrenceTables(currentRoot, errors, manuscriptFacts = {}) {
  const expectedByDataset = Object.fromEntries(
    Object.entries(manuscriptFacts.datasets || {}).map(([dataset, expected]) => [
      dataset,
      {
        totalSprMoves: Number(expected.total_spr_moves),
        recurrentMovedSubtrees: Number(expected.recurrent_moved_subtrees),
        targetTaxon: expected.roguenarok_target_taxon,
        targetTopRank: Number(expected.target_rank),
        targetTopSprMoves: Number(expected.target_spr_moves),
      },
    ])
  );
  const summaryPath = path.join(currentRoot, 'SPR_RECURRENCE_SUMMARY.json');
  requireFile(summaryPath, errors);
  if (!fs.existsSync(summaryPath)) {
    return [];
  }

  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  return summary.datasets.map((dataset) => {
    const expected = expectedByDataset[dataset.dataset];
    if (!expected) {
      errors.push(`unexpected SPR recurrence dataset ${dataset.dataset}`);
      return dataset;
    }

    const tablePath = path.join(ROOT, dataset.recurrence_table);
    requireFile(tablePath, errors);
    if (!fs.existsSync(tablePath)) {
      return dataset;
    }
    checkSha(tablePath, dataset.recurrence_table_sha256, errors);

    const rows = readCsv(tablePath);
    const totalSprMoves = rows.reduce((sum, row) => sum + Number(row['SPR Move Count']), 0);
    expectNumber(
      rows.length,
      expected.recurrentMovedSubtrees,
      `dataset ${dataset.dataset} moved-subtree recurrence row count`,
      errors
    );
    expectNumber(
      totalSprMoves,
      expected.totalSprMoves,
      `dataset ${dataset.dataset} moved-subtree SPR move total`,
      errors
    );
    expectNumber(
      dataset.total_spr_moves,
      expected.totalSprMoves,
      `dataset ${dataset.dataset} SPR recurrence summary total`,
      errors
    );
    expectNumber(
      dataset.recurrent_moved_subtrees,
      expected.recurrentMovedSubtrees,
      `dataset ${dataset.dataset} SPR recurrence summary row count`,
      errors
    );

    const target = dataset.target_summaries?.find((entry) => entry.taxon === expected.targetTaxon);
    if (!target?.top_match) {
      errors.push(
        `dataset ${dataset.dataset} is missing ${expected.targetTaxon} target recurrence summary`
      );
    } else {
      expectNumber(
        target.top_match.rank,
        expected.targetTopRank,
        `dataset ${dataset.dataset} ${expected.targetTaxon} target recurrence rank`,
        errors
      );
      expectNumber(
        target.top_match.spr_move_count,
        expected.targetTopSprMoves,
        `dataset ${dataset.dataset} ${expected.targetTaxon} target recurrence SPR moves`,
        errors
      );
    }

    return {
      dataset: dataset.dataset,
      totalSprMoves,
      recurrentMovedSubtrees: rows.length,
      recurrenceTable: dataset.recurrence_table,
    };
  });
}

function auditTopologySearch(publicationRoot, errors) {
  const topologyRoot = path.join(publicationRoot, 'topology_search_iqtree');
  const sourcePath = path.join(
    topologyRoot,
    'source_alignments',
    'aberer_roguenarok_dataset_500_taxa500_sites1398.phy'
  );
  const trajectoryPath = path.join(
    topologyRoot,
    'current_results',
    'iqtree500_fast_search_trajectory.nwk'
  );
  const summaryPath = path.join(topologyRoot, 'current_results', 'trajectory_summary.tsv');

  for (const filePath of [sourcePath, trajectoryPath, summaryPath]) {
    requireFile(filePath, errors);
  }
  if (!fs.existsSync(sourcePath) || !fs.existsSync(trajectoryPath) || !fs.existsSync(summaryPath)) {
    return {
      sourceAlignment: { taxa: 0, sites: 0 },
      currentResult: { taxa: 0, treeCount: 0 },
    };
  }

  const summary = Object.fromEntries(
    readTsv(summaryPath).map((entry) => [entry.field, entry.value])
  );
  checkSha(sourcePath, summary.source_alignment_sha256, errors);
  checkSha(trajectoryPath, summary.promoted_trajectory_sha256, errors);

  const observedAlignment = readRelaxedPhylipCounts(sourcePath);
  expectNumber(
    observedAlignment.taxa,
    Number(summary.source_alignment_taxa),
    'topology-search source alignment taxa',
    errors
  );
  expectNumber(
    observedAlignment.sites,
    Number(summary.source_alignment_sites),
    'topology-search source alignment sites',
    errors
  );

  const trees = readNonEmptyLines(trajectoryPath);
  const firstTreeTaxa = countNewickLeafLabels(trees[0] || '');
  expectNumber(
    trees.length,
    Number(summary.promoted_trajectory_trees),
    'topology-search promoted trajectory tree count',
    errors
  );
  expectNumber(firstTreeTaxa, 500, 'topology-search first-tree taxa', errors);
  expectNumber(
    Number(summary.tree_search_iterations),
    2,
    'topology-search fast tree-search iteration count',
    errors
  );
  if (summary.iqtree_search_mode !== 'fast') {
    errors.push(
      `topology-search IQ-TREE mode mismatch: expected fast, got ${
        summary.iqtree_search_mode || 'missing'
      }`
    );
  }
  if (summary.source_alignment !== path.basename(sourcePath)) {
    errors.push(
      `topology-search source alignment summary mismatch: expected ${path.basename(
        sourcePath
      )}, got ${summary.source_alignment || 'missing'}`
    );
  }

  return {
    sourceAlignment: {
      filename: path.basename(sourcePath),
      taxa: observedAlignment.taxa,
      sites: observedAlignment.sites,
    },
    currentResult: {
      filename: path.basename(trajectoryPath),
      taxa: firstTreeTaxa,
      treeCount: trees.length,
    },
  };
}

function auditNorovirus(publicationRoot, errors, manuscriptFacts = {}) {
  const norovirusRoot = path.join(publicationRoot, 'recombination_norovirus');
  const preparationRoot = path.join(norovirusRoot, 'source_preparation', 'augur_subsampling');
  const sourceRoot = path.join(publicationRoot, 'recombination_norovirus', 'source_alignments');
  const manifest = readTsv(path.join(sourceRoot, 'MANIFEST.tsv'));
  const alignments = manifest.map((entry) => {
    const filePath = path.join(sourceRoot, entry.filename);
    requireFile(filePath, errors);
    checkSha(filePath, entry.local_sha256, errors);
    const sequences = Number(entry.sequences);
    const sites = entry.sites === 'NA' ? null : Number(entry.sites);
    const observed = summarizeFasta(filePath);
    expectNumber(observed.sequences, sequences, `${entry.filename} sequences`, errors);
    if (sites !== null) {
      expectNumber(observed.sites, sites, `${entry.filename} sites`, errors);
      if (!observed.sequenceLengths.every((length) => length === sites)) {
        errors.push(`${entry.filename} has non-uniform sequence lengths`);
      }
    }
    return {
      filename: entry.filename,
      format: entry.format,
      sequences,
      sites,
      sha256: entry.local_sha256,
    };
  });

  const rawFastaPath = path.join(preparationRoot, '01_raw', 'full_genome_sequences.fasta');
  const rawAccessionsPath = path.join(preparationRoot, '01_raw', 'full_genome_accessions.txt');
  const rawAccessionVersionsPath = path.join(
    preparationRoot,
    '01_raw',
    'full_genome_accession_versions.txt'
  );
  const fullMetadataPath = path.join(preparationRoot, 'metadata', 'full_genome_metadata.tsv');
  const finalMetadataPath = path.join(preparationRoot, 'metadata', 'subsampled_350_metadata.csv');
  const alignedPath = path.join(preparationRoot, '02_aligned', 'subsampled_350_aligned.fasta');
  const finalFastaPath = path.join(
    preparationRoot,
    '03_trimmed',
    'subsampled_350_gappyout_final.fasta'
  );

  const rawRecords = readFastaRecords(rawFastaPath);
  const rawAccessions = readNonEmptyLines(rawAccessionsPath);
  const rawAccessionVersions = readNonEmptyLines(rawAccessionVersionsPath);
  const accessionVersionAccessions = rawAccessionVersions.map((accessionVersion) =>
    accessionVersion.replace(/\.\d+$/, '')
  );
  const fullMetadata = readTsv(fullMetadataPath);
  const finalMetadata = readCsv(finalMetadataPath);
  const finalRecords = readFastaRecords(finalFastaPath);
  const finalTaxa = finalMetadata.map((entry) => entry.taxon);
  const finalRecordIds = finalRecords.map((record) => record.id);
  const finalRecordIdSet = new Set(finalRecordIds);

  expectNumber(rawRecords.length, 4565, 'norovirus raw FASTA records', errors);
  expectNumber(
    rawAccessions.length,
    rawAccessionVersions.length,
    'norovirus raw accession lock count',
    errors
  );
  expectArrayEqual(
    accessionVersionAccessions,
    rawAccessions,
    'norovirus accession-version lock matches unversioned accessions',
    errors
  );
  expectArrayEqual(
    rawRecords.map((record) => record.id),
    rawAccessions,
    'norovirus raw FASTA IDs match locked accessions',
    errors
  );
  expectArrayEqual(
    fullMetadata.map((entry) => entry.accession_version),
    rawAccessionVersions,
    'norovirus full metadata accession_version order matches lock file',
    errors
  );

  const malformedAccessionVersions = rawAccessionVersions.filter(
    (accessionVersion) => !/^[A-Z]{1,3}_?\d+\.\d+$/.test(accessionVersion)
  );
  if (malformedAccessionVersions.length > 0) {
    errors.push(
      `norovirus accession-version lock has malformed entries: ${malformedAccessionVersions
        .slice(0, 5)
        .join(', ')}`
    );
  }

  expectNumber(
    finalRecords.length,
    factNumber(manuscriptFacts, 'taxa', 334),
    'norovirus final FASTA records',
    errors
  );
  expectNumber(
    finalMetadata.length,
    factNumber(manuscriptFacts, 'taxa', 334),
    'norovirus final metadata rows',
    errors
  );
  expectArrayEqual(
    finalRecordIds,
    finalTaxa,
    'norovirus final FASTA order matches metadata taxon order',
    errors
  );
  const finalLengths = finalRecords.map((record) => record.sequence.length);
  const expectedAlignmentBp = factNumber(manuscriptFacts, 'alignment_bp', 8058);
  if (!finalLengths.every((length) => length === expectedAlignmentBp)) {
    errors.push(
      `norovirus final FASTA contains sequences outside the ${expectedAlignmentBp} bp retained length`
    );
  }
  const metadataSummary = summarizeNorovirusMetadata(finalMetadata);
  expectNumber(
    metadataSummary.countries,
    factNumber(manuscriptFacts, 'countries', 32),
    'norovirus final metadata country count',
    errors
  );
  expectNumber(
    metadataSummary.yearMin,
    factNumber(manuscriptFacts, 'first_year', 1968),
    'norovirus final metadata first sampling year',
    errors
  );
  expectNumber(
    metadataSummary.yearMax,
    factNumber(manuscriptFacts, 'last_year', 2025),
    'norovirus final metadata last sampling year',
    errors
  );
  expectNumber(
    metadataSummary.yearCount,
    47,
    'norovirus final metadata distinct sampling years',
    errors
  );
  expectNumber(
    metadataSummary.capsidGenotypes,
    factNumber(manuscriptFacts, 'capsid_genotypes', 30),
    'norovirus capsid genotype count',
    errors
  );
  expectNumber(
    metadataSummary.polymeraseGenotypes,
    factNumber(manuscriptFacts, 'polymerase_genotypes', 28),
    'norovirus polymerase genotype count',
    errors
  );
  expectNumber(
    metadataSummary.comparableGenotypes,
    factNumber(manuscriptFacts, 'comparable_dual_genotype_rows', 302),
    'norovirus comparable dual-genotype rows',
    errors
  );
  expectNumber(
    metadataSummary.recombinantGenotypes,
    factNumber(manuscriptFacts, 'recombinant_genotypes', 167),
    'norovirus recombinant genotype rows',
    errors
  );
  expectNumber(
    metadataSummary.nonRecombinantGenotypes,
    factNumber(manuscriptFacts, 'non_recombinant_genotypes', 135),
    'norovirus non-recombinant genotype rows',
    errors
  );

  const fullGenotypeTaxonPattern =
    /^[A-Z]{1,3}_?\d+_P(?:\d+|NA\d+)_G(?:I|II|III|IV|V|VI|VII|VIII|IX|X)-\d+$/;
  const polymeraseOnlyTaxonPattern = /^[A-Z]{1,3}_?\d+_P(?:\d+|NA\d+)$/;
  const fullGenotypeTaxa = finalRecordIds.filter((id) => fullGenotypeTaxonPattern.test(id));
  const polymeraseOnlyTaxa = finalRecordIds.filter((id) => polymeraseOnlyTaxonPattern.test(id));
  const malformedTaxa = finalRecordIds.filter(
    (id) => !fullGenotypeTaxonPattern.test(id) && !polymeraseOnlyTaxonPattern.test(id)
  );
  if (malformedTaxa.length > 0) {
    errors.push(
      `norovirus final taxon IDs outside naming convention: ${malformedTaxa.slice(0, 5).join(', ')}`
    );
  }

  compareSameFileContent(
    rawFastaPath,
    path.join(
      sourceRoot,
      'nextstrain_genbank_norovirus_full_genome_source_sequences_4565seq.fasta'
    ),
    'norovirus retained raw source snapshot',
    errors
  );
  compareSameFileContent(
    alignedPath,
    path.join(sourceRoot, 'norovirus_subsampled_mafft_alignment_334taxa.fasta'),
    'norovirus retained MAFFT alignment',
    errors
  );
  compareSameFileContent(
    finalFastaPath,
    path.join(sourceRoot, 'norovirus_trimmed_publication_alignment_334taxa_8058bp.fasta'),
    'norovirus retained final alignment',
    errors
  );

  const subsets = manifest
    .filter((entry) => entry.filename.startsWith('recan_'))
    .map((entry) => {
      const records = readFastaRecords(path.join(sourceRoot, entry.filename));
      const missing = records.map((record) => record.id).filter((id) => !finalRecordIdSet.has(id));
      if (missing.length > 0) {
        errors.push(
          `${entry.filename} contains taxa absent from final norovirus alignment: ${missing.join(', ')}`
        );
      }
      return {
        filename: entry.filename,
        sequences: records.length,
        missingFromFinal: missing.length,
      };
    });

  const demoPayload = auditNorovirusDemoPayload(publicationRoot, manuscriptFacts, errors);

  return {
    alignments,
    rawSnapshot: {
      sequences: rawRecords.length,
      accessionVersions: rawAccessionVersions.length,
    },
    finalAlignment: {
      sequences: finalRecords.length,
      sites: finalLengths.length ? finalLengths[0] : 0,
      metadataRows: finalMetadata.length,
      fullGenotypeTaxa: fullGenotypeTaxa.length,
      polymeraseOnlyTaxa: polymeraseOnlyTaxa.length,
      metadataSummary,
    },
    subsets,
    demoPayload,
  };
}

function auditNorovirusDemoPayload(publicationRoot, manuscriptFacts, errors) {
  const payloadPath = path.join(
    publicationRoot,
    'precomputed',
    'norovirus_334_iqtree_fast_sh_alrt_window1000_step500.movie.json'
  );
  if (!fs.existsSync(payloadPath)) {
    return { status: 'skipped', reason: 'generated browser demo payload is not present' };
  }

  const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
  const frameCounts = countFramesByType(payload.frames || []);
  const sprMoves = (payload.temporal_events || []).filter(
    (event) => event.event_type === 'spr_move'
  );
  const rootingSetting = (payload.dataset_provenance?.settings || []).find(
    (setting) => setting.label === 'Rooting'
  );
  const expectedRooting = manuscriptFacts?.rooting || 'Midpoint rooting';
  if (rootingSetting?.value !== expectedRooting) {
    errors.push(
      `norovirus static payload rooting mismatch: expected ${expectedRooting}, got ${
        rootingSetting?.value || 'missing'
      }`
    );
  }
  expectNumber(
    payload.msa?.window_size,
    factNumber(manuscriptFacts, 'window_size_bp', 1000),
    'norovirus static payload window size',
    errors
  );
  expectNumber(
    payload.msa?.step_size,
    factNumber(manuscriptFacts, 'step_size_bp', 500),
    'norovirus static payload step size',
    errors
  );
  expectNumber(
    frameCounts.input_tree || 0,
    factNumber(manuscriptFacts, 'input_trees', 17),
    'norovirus static payload input tree count',
    errors
  );
  expectNumber(
    frameCounts.interpolation_frame || 0,
    factNumber(manuscriptFacts, 'interpolation_frames', 6391),
    'norovirus static payload interpolation frame count',
    errors
  );
  expectNumber(
    payload.frames?.length || 0,
    factNumber(manuscriptFacts, 'frames', 6408),
    'norovirus static payload frame count',
    errors
  );
  expectNumber(
    sprMoves.length,
    factNumber(manuscriptFacts, 'spr_moves', 1616),
    'norovirus static payload SPR move count',
    errors
  );

  return {
    status: 'checked',
    payloadFile: relative(payloadPath),
    frames: payload.frames?.length || 0,
    sprMoves: sprMoves.length,
  };
}

function countFramesByType(frames) {
  return frames.reduce((counts, frame) => {
    counts[frame.frame_type] = (counts[frame.frame_type] || 0) + 1;
    return counts;
  }, {});
}

function summarizeNorovirusMetadata(rows) {
  const countries = new Set();
  const years = new Set();
  const capsidGenotypes = new Set();
  const polymeraseGenotypes = new Set();
  let comparableGenotypes = 0;
  let recombinantGenotypes = 0;
  let nonRecombinantGenotypes = 0;

  for (const row of rows) {
    if (row.country) countries.add(row.country);
    const yearMatch = (row.date || row.year || '').match(/^(\d{4})/);
    if (yearMatch) years.add(Number(yearMatch[1]));

    const capsid = row.VP1_nextclade || row.ORF2_type;
    const polymeraseFull = row.RdRp_type || row.ORF1_type;
    const polymeraseMatch = polymeraseFull?.match(/P(\d+)/);
    const polymerase = polymeraseMatch ? `P${polymeraseMatch[1]}` : '';
    if (capsid) capsidGenotypes.add(capsid);
    if (polymerase) polymeraseGenotypes.add(polymerase);

    const capsidMatch = capsid?.match(/\d+/);
    if (polymeraseMatch && capsidMatch) {
      comparableGenotypes += 1;
      if (polymeraseMatch[1] === capsidMatch[0]) {
        nonRecombinantGenotypes += 1;
      } else {
        recombinantGenotypes += 1;
      }
    }
  }

  return {
    countries: countries.size,
    yearMin: Math.min(...years),
    yearMax: Math.max(...years),
    yearCount: years.size,
    capsidGenotypes: capsidGenotypes.size,
    polymeraseGenotypes: polymeraseGenotypes.size,
    comparableGenotypes,
    recombinantGenotypes,
    nonRecombinantGenotypes,
  };
}

function factNumber(facts, key, fallback) {
  return Number(facts?.[key] ?? fallback);
}

function readTsv(filePath) {
  const [headerLine, ...lines] = fs.readFileSync(filePath, 'utf8').trim().split(/\r?\n/);
  const headers = headerLine.split('\t');
  return lines.filter(Boolean).map((line) => {
    const values = line.split('\t');
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function requireFile(filePath, errors) {
  if (!fs.existsSync(filePath)) {
    errors.push(`${relative(filePath)} is missing`);
  }
}

function checkSha(filePath, expected, errors) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  if (!expected) {
    errors.push(`${relative(filePath)} sha256 expectation is missing`);
    return;
  }
  const actual = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  if (actual !== expected) {
    errors.push(`${relative(filePath)} sha256 mismatch: expected ${expected}, got ${actual}`);
  }
}

function readRelaxedPhylipCounts(filePath) {
  const [firstLine] = fs.readFileSync(filePath, 'utf8').split(/\r?\n/, 1);
  const [taxa, sites] = firstLine.trim().split(/\s+/).map(Number);
  return { taxa, sites };
}

function summarizeFasta(filePath) {
  const records = readFastaRecords(filePath);
  const sequenceLengths = records.map((record) => record.sequence.length);
  return {
    sequences: records.length,
    sites: sequenceLengths.length ? Math.max(...sequenceLengths) : 0,
    sequenceLengths,
  };
}

function readFastaRecords(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  return text
    .split(/^>/m)
    .filter(Boolean)
    .map((record) => {
      const [headerLine, ...sequenceLines] = record.split(/\r?\n/);
      return {
        id: headerLine.trim().split(/\s+/, 1)[0],
        sequence: sequenceLines.join('').replace(/\s/g, ''),
      };
    });
}

function readNonEmptyLines(filePath) {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim());
}

function countNewickLeafLabels(newick) {
  return new Set(
    Array.from(newick.matchAll(/(?<=[(,])([^(),:;[\]]+):/g), (match) => match[1].trim())
  ).size;
}

function expectNumber(actual, expected, label, errors) {
  if (actual !== expected) {
    errors.push(`${label} mismatch: expected ${expected}, got ${actual}`);
  }
}

function expectArrayEqual(actual, expected, label, errors) {
  if (actual.length !== expected.length) {
    errors.push(`${label} length mismatch: expected ${expected.length}, got ${actual.length}`);
    return;
  }
  const mismatchIndex = actual.findIndex((value, index) => value !== expected[index]);
  if (mismatchIndex !== -1) {
    errors.push(
      `${label} mismatch at row ${mismatchIndex + 1}: expected ${expected[mismatchIndex]}, got ${actual[mismatchIndex]}`
    );
  }
}

function compareSameFileContent(leftPath, rightPath, label, errors) {
  for (const filePath of [leftPath, rightPath]) {
    requireFile(filePath, errors);
  }
  if (!fs.existsSync(leftPath) || !fs.existsSync(rightPath)) {
    return;
  }
  const left = crypto.createHash('sha256').update(fs.readFileSync(leftPath)).digest('hex');
  const right = crypto.createHash('sha256').update(fs.readFileSync(rightPath)).digest('hex');
  if (left !== right) {
    errors.push(`${label} copy mismatch: ${relative(leftPath)} != ${relative(rightPath)}`);
  }
}

function readCsv(filePath) {
  const [headerLine, ...lines] = fs.readFileSync(filePath, 'utf8').trim().split(/\r?\n/);
  const headers = parseDelimitedLine(headerLine, ',');
  return lines.filter(Boolean).map((line) => {
    const values = parseDelimitedLine(line, ',');
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function parseDelimitedLine(line, delimiter) {
  const values = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      values.push(value);
      value = '';
    } else {
      value += char;
    }
  }

  values.push(value);
  return values;
}

function relative(filePath) {
  return path.relative(ROOT, filePath);
}

function main() {
  const report = auditPublicationData(ROOT);
  const json = process.argv.includes('--json');
  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(`publication data hygiene: ${report.status}\n`);
    process.stdout.write(`max committed app-facing taxa: ${report.maxPublicationTaxa}\n`);
    for (const tier of report.scaleTiers) {
      process.stdout.write(`${tier.label}: ${tier.taxa} taxa (${tier.source})\n`);
    }
    for (const error of report.errors) {
      process.stderr.write(`ERROR: ${error}\n`);
    }
  }
  return report.status === 'PASS' ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}

export { PUBLICATION_ROOT };
