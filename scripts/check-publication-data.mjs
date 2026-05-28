#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLICATION_ROOT = path.join(ROOT, 'publication_data');
const MSPRIME_PERFORMANCE_FIXTURES = [
  {
    dataset: 'msprime-performance-250',
    fileName: 'msprime_250taxa_50trees_seed25050.nwk',
    metadataName: 'msprime_250taxa_50trees_seed25050.metadata.tsv',
    taxa: 250,
    trees: 50,
    seed: 25050,
  },
  {
    dataset: 'msprime-performance-500',
    fileName: 'msprime_500taxa_25trees_seed50025.nwk',
    metadataName: 'msprime_500taxa_25trees_seed50025.metadata.tsv',
    taxa: 500,
    trees: 25,
    seed: 50025,
  },
  {
    dataset: 'msprime-performance-500-short',
    fileName: 'msprime_500taxa_5trees_seed50005.nwk',
    metadataName: 'msprime_500taxa_5trees_seed50005.metadata.tsv',
    taxa: 500,
    trees: 5,
    seed: 50005,
  },
  {
    dataset: 'msprime-performance-1000',
    fileName: 'msprime_1000taxa_10trees_seed100010.nwk',
    metadataName: 'msprime_1000taxa_10trees_seed100010.metadata.tsv',
    taxa: 1000,
    trees: 10,
    seed: 100010,
  },
  {
    dataset: 'msprime-performance-1000-short',
    fileName: 'msprime_1000taxa_5trees_seed100005.nwk',
    metadataName: 'msprime_1000taxa_5trees_seed100005.metadata.tsv',
    taxa: 1000,
    trees: 5,
    seed: 100005,
  },
];

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
    label: 'synthetic-performance-baseline',
    taxa: 250,
    source: 'msprime committed performance fixture',
  },
  {
    label: 'committed-msa',
    taxa: 334,
    source: 'Norovirus publication MSA',
  },
  {
    label: 'synthetic-performance-large',
    taxa: 500,
    source: 'msprime committed performance fixture',
  },
  {
    label: 'synthetic-performance-stress',
    taxa: 1000,
    source: 'msprime committed performance fixture',
  },
];

export function auditPublicationData(root = ROOT) {
  const errors = [];
  const publicationRoot = path.join(root, 'publication_data');
  const bootstrap = auditBootstrapRogueTaxa(publicationRoot, errors);
  const norovirus = auditNorovirus(publicationRoot, errors);
  const msprimePerformance = auditMsprimePerformanceFixtures(publicationRoot, errors);
  const maxPublicationTaxa = Math.max(
    ...bootstrap.currentResults.map((entry) => entry.taxa),
    ...norovirus.alignments
      .filter((entry) => entry.format === 'fasta_msa')
      .map((entry) => entry.sequences),
    ...msprimePerformance.map((entry) => entry.taxa)
  );

  return {
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    errors,
    maxPublicationTaxa,
    scaleTiers: TAXA_SCALE_TIERS,
    bootstrap,
    norovirus,
    msprimePerformance,
  };
}

function auditBootstrapRogueTaxa(publicationRoot, errors) {
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
    expectNumber(trees.length, dataset.all_trees_lines, `${dataset.dataset} ranked tree count`, errors);
    expectNumber(firstTreeTaxa, dataset.expected_taxa, `${dataset.dataset} first-tree taxa`, errors);
    if (!trees[0]?.includes('support_kind=bootstrap_replicate_subtree_frequency')) {
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
  };
}

function auditNorovirus(publicationRoot, errors) {
  const norovirusRoot = path.join(publicationRoot, 'recombination_norovirus');
  const preparationRoot = path.join(
    norovirusRoot,
    'source_preparation',
    'augur_subsampling'
  );
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
  const finalFastaPath = path.join(preparationRoot, '03_trimmed', 'subsampled_350_gappyout_final.fasta');

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
  expectNumber(rawAccessions.length, rawAccessionVersions.length, 'norovirus raw accession lock count', errors);
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

  expectNumber(finalRecords.length, 334, 'norovirus final FASTA records', errors);
  expectNumber(finalMetadata.length, 334, 'norovirus final metadata rows', errors);
  expectArrayEqual(finalRecordIds, finalTaxa, 'norovirus final FASTA order matches metadata taxon order', errors);
  const finalLengths = finalRecords.map((record) => record.sequence.length);
  if (!finalLengths.every((length) => length === 8058)) {
    errors.push('norovirus final FASTA contains sequences outside the 8058 bp retained length');
  }

  const fullGenotypeTaxonPattern =
    /^[A-Z]{1,3}_?\d+_P(?:\d+|NA\d+)_G(?:I|II|III|IV|V|VI|VII|VIII|IX|X)-\d+$/;
  const polymeraseOnlyTaxonPattern = /^[A-Z]{1,3}_?\d+_P(?:\d+|NA\d+)$/;
  const fullGenotypeTaxa = finalRecordIds.filter((id) => fullGenotypeTaxonPattern.test(id));
  const polymeraseOnlyTaxa = finalRecordIds.filter((id) => polymeraseOnlyTaxonPattern.test(id));
  const malformedTaxa = finalRecordIds.filter(
    (id) => !fullGenotypeTaxonPattern.test(id) && !polymeraseOnlyTaxonPattern.test(id)
  );
  if (malformedTaxa.length > 0) {
    errors.push(`norovirus final taxon IDs outside naming convention: ${malformedTaxa.slice(0, 5).join(', ')}`);
  }

  compareSameFileContent(
    rawFastaPath,
    path.join(sourceRoot, 'nextstrain_genbank_norovirus_full_genome_source_sequences_4565seq.fasta'),
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
        errors.push(`${entry.filename} contains taxa absent from final norovirus alignment: ${missing.join(', ')}`);
      }
      return { filename: entry.filename, sequences: records.length, missingFromFinal: missing.length };
    });

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
    },
    subsets,
  };
}

function auditMsprimePerformanceFixtures(publicationRoot, errors) {
  const fixtureRoot = path.join(publicationRoot, 'scale_fixtures', 'msprime_performance');
  const manifestPath = path.join(fixtureRoot, 'MANIFEST.tsv');
  requireFile(manifestPath, errors);
  const manifest = fs.existsSync(manifestPath) ? readTsv(manifestPath) : [];
  expectNumber(
    manifest.length,
    MSPRIME_PERFORMANCE_FIXTURES.length,
    'msprime performance manifest row count',
    errors
  );

  return MSPRIME_PERFORMANCE_FIXTURES.map((fixture) => {
    const treePath = path.join(fixtureRoot, fixture.fileName);
    const metadataPath = path.join(fixtureRoot, fixture.metadataName);
    for (const filePath of [treePath, metadataPath]) {
      requireFile(filePath, errors);
    }

    const manifestRow = manifest.find((entry) => entry.dataset === fixture.dataset);
    if (!manifestRow) {
      errors.push(`msprime performance manifest is missing ${fixture.dataset}`);
    } else {
      expectMetadataValue(manifestRow, 'tree_file', fixture.fileName, 'MANIFEST.tsv', errors);
      expectMetadataValue(manifestRow, 'metadata_file', fixture.metadataName, 'MANIFEST.tsv', errors);
      expectMetadataValue(manifestRow, 'taxa', String(fixture.taxa), 'MANIFEST.tsv', errors);
      expectMetadataValue(manifestRow, 'trees', String(fixture.trees), 'MANIFEST.tsv', errors);
      expectMetadataValue(manifestRow, 'seed', String(fixture.seed), 'MANIFEST.tsv', errors);
      expectMetadataValue(
        manifestRow,
        'mode',
        'independent_single_tree_replicates',
        'MANIFEST.tsv',
        errors
      );
      checkSha(treePath, manifestRow.tree_sha256, errors);
      checkSha(metadataPath, manifestRow.metadata_sha256, errors);
    }

    const trees = fs.existsSync(treePath) ? readNonEmptyLines(treePath) : [];
    expectNumber(trees.length, fixture.trees, `${fixture.fileName} tree count`, errors);
    for (const [index, tree] of trees.entries()) {
      expectNumber(
        countNewickLeafLabels(tree),
        fixture.taxa,
        `${fixture.fileName} tree ${index + 1} taxa`,
        errors
      );
    }

    const metadata = fs.existsSync(metadataPath)
      ? Object.fromEntries(readTsv(metadataPath).map((entry) => [entry.key, entry.value]))
      : {};
    expectMetadataValue(metadata, 'generator', 'msprime', fixture.metadataName, errors);
    expectMetadataValue(
      metadata,
      'mode',
      'independent_single_tree_replicates',
      fixture.metadataName,
      errors
    );
    expectMetadataValue(metadata, 'taxa', String(fixture.taxa), fixture.metadataName, errors);
    expectMetadataValue(metadata, 'trees', String(fixture.trees), fixture.metadataName, errors);
    expectMetadataValue(metadata, 'seed', String(fixture.seed), fixture.metadataName, errors);
    expectMetadataValue(metadata, 'independent_trees', 'True', fixture.metadataName, errors);
    expectMetadataValue(metadata, 'tree_file', fixture.fileName, fixture.metadataName, errors);

    return {
      filename: fixture.fileName,
      taxa: fixture.taxa,
      treeCount: trees.length,
      seed: fixture.seed,
    };
  });
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
  return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter((line) => line.trim());
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

function expectMetadataValue(metadata, key, expected, fileName, errors) {
  if (metadata[key] !== expected) {
    errors.push(`${fileName} metadata ${key} mismatch: expected ${expected}, got ${metadata[key]}`);
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
