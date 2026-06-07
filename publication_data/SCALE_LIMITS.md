# Scale Limits and Large Test Data

Committed publication data now covers these app-facing taxa tiers:

| Tier | Taxa | Data source | Purpose |
| --- | ---: | --- | --- |
| `committed-small` | 24 | Aberer/RogueNaRok bootstrap result | Fast rogue-taxon regression checks. |
| `committed-medium` | 125 | Aberer/RogueNaRok bootstrap result | Larger bootstrap tree-series checks. |
| `committed-msa` | 334 | Norovirus publication MSA | Largest retained publication MSA path. |
| `committed-tree-search` | 500 | IQ-TREE topology-search trajectory example | Largest retained app-facing tree series. |

Synthetic scale fixtures are not part of the retained publication archive. Keep
large local stress data outside git unless it is promoted with a documented
publication-data reason and accompanying hygiene checks.
