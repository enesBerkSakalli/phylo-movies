#!/usr/bin/env node

import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const destination = path.resolve(projectRoot, process.argv[2] || 'dist');
const source = path.join(projectRoot, 'publication_data');

console.log(`Copying example datasets to ${path.relative(projectRoot, destination) || '.'}...`);

async function ensureDir(relativePath) {
  await mkdir(path.join(destination, relativePath), { recursive: true });
}

async function copyFileFromPublication(relativeSource, relativeDestination = relativeSource) {
  const destinationPath = path.join(destination, 'examples', relativeDestination);
  await mkdir(path.dirname(destinationPath), { recursive: true });
  await cp(path.join(source, relativeSource), destinationPath);
}

async function copyTreeFromPublication(relativeSource, relativeDestination = relativeSource) {
  const destinationPath = path.join(destination, 'examples', relativeDestination);
  await rm(destinationPath, { recursive: true, force: true });
  await mkdir(path.dirname(destinationPath), { recursive: true });
  await cp(path.join(source, relativeSource), destinationPath, { recursive: true });
}

async function copyMatchingFiles(relativeSourceDir, relativeDestinationDir, predicate) {
  const sourceDir = path.join(source, relativeSourceDir);
  const destinationDir = path.join(destination, 'examples', relativeDestinationDir);
  await mkdir(destinationDir, { recursive: true });
  const entries = await (await import('node:fs/promises')).readdir(sourceDir);
  for (const entry of entries.filter(predicate)) {
    await cp(path.join(sourceDir, entry), path.join(destinationDir, entry));
  }
}

await ensureDir('examples/recombination_norovirus/source_preparation/augur_subsampling/03_trimmed');
await copyFileFromPublication(
  'recombination_norovirus/source_preparation/augur_subsampling/03_trimmed/subsampled_350_gappyout_final.fasta'
);
await copyFileFromPublication(
  'recombination_norovirus/source_preparation/augur_subsampling/01_raw/full_genome_accession_versions.txt'
);
for (const file of ['full_genome_metadata.tsv', 'subsampled_350_metadata.csv', 'rename_map.tsv']) {
  await copyFileFromPublication(
    `recombination_norovirus/source_preparation/augur_subsampling/metadata/${file}`
  );
}
await copyFileFromPublication('recombination_norovirus/REGENERATE.md');
await rm(path.join(destination, 'examples/recombination_norovirus/current_results/phylo_movies'), {
  recursive: true,
  force: true,
});
await copyFileFromPublication(
  'recombination_norovirus/current_results/phylo_movies/norovirus_334_iqtree_fast_sh_alrt_window1000_step500.nwk'
);
await copyMatchingFiles(
  'recombination_norovirus/current_results/window_tables',
  'recombination_norovirus/current_results/window_tables',
  (entry) => entry.endsWith('.tsv')
);

for (const file of ['quick_msa_demo_30taxa_10trees.nwk', 'quick_msa_demo_30taxa_10windows.fasta']) {
  await copyFileFromPublication(`quick_msa_demo/${file}`);
}

await copyFileFromPublication('figure_example/paper_example.tree');

await copyMatchingFiles('precomputed', 'precomputed', (entry) => entry.endsWith('.movie.json'));

await copyTreeFromPublication(
  'bootstrap_rogue_taxa/current_results',
  'bootstrap_rogue_taxa/current_results'
);
for (const file of [
  'MANIFEST.tsv',
  'aberer_roguenarok_dataset_24_taxa24_sites14190.phy',
  'aberer_roguenarok_dataset_125_taxa125_sites29149.phy',
]) {
  await copyFileFromPublication(`bootstrap_rogue_taxa/source_alignments/${file}`);
}
await copyFileFromPublication('bootstrap_rogue_taxa/REGENERATE.md');

await copyMatchingFiles(
  'topology_search_iqtree/current_results',
  'topology_search_iqtree/current_results',
  (entry) => entry.endsWith('.nwk') || entry.endsWith('.tsv')
);
await copyFileFromPublication(
  'topology_search_iqtree/source_alignments/aberer_roguenarok_dataset_500_taxa500_sites1398.phy'
);
await copyFileFromPublication('topology_search_iqtree/README.md');

console.log('Done. Copied example datasets and generated precomputed demo payloads.');
