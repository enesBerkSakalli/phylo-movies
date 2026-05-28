# msprime Performance Fixtures

This directory contains deterministic, app-facing tree-only fixtures generated
with msprime for Phylo-Movies visualization performance checks.

| File | Taxa | Trees | Seed | Purpose |
| --- | ---: | ---: | ---: | --- |
| `msprime_250taxa_50trees_seed25050.nwk` | 250 | 50 | 25050 | Baseline large-tree visualization. |
| `msprime_500taxa_25trees_seed50025.nwk` | 500 | 25 | 50025 | Large-tree visualization limits. |
| `msprime_1000taxa_10trees_seed100010.nwk` | 1000 | 10 | 100010 | Stress-testing maximum visible taxa. |

These fixtures are synthetic visualization inputs, not biological case studies.
They use independent single-tree msprime replicates to keep committed examples
small and reproducible. For recombining-sequence marginal-tree stress tests,
use the ignored generator output under `publication_data/scale_fixtures/generated/`.

Regenerate the committed fixtures with:

```bash
.venv-publication/bin/python scripts/generate-msprime-scale-dataset.py --independent-trees --taxa 250 --trees 50 --seed 25050 --output-dir publication_data/scale_fixtures/msprime_performance
.venv-publication/bin/python scripts/generate-msprime-scale-dataset.py --independent-trees --taxa 500 --trees 25 --seed 50025 --output-dir publication_data/scale_fixtures/msprime_performance
.venv-publication/bin/python scripts/generate-msprime-scale-dataset.py --independent-trees --taxa 1000 --trees 10 --seed 100010 --output-dir publication_data/scale_fixtures/msprime_performance
```

Each `.metadata.tsv` file records the simulator, mode, effective simulation
parameters, seed, and Newick file name. `MANIFEST.tsv` records the expected
tree counts, taxa counts, seeds, modes, and SHA-256 checksums used by
`npm run publication:data:check`.
