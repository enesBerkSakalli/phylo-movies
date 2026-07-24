# Phylo-Movies Discoverability Plan

Last reviewed: 2026-07-24

## Positioning

Phylo-Movies is free, open-source research software for explaining topology changes across ordered phylogenetic tree series. Its distinctive value is showing which taxa or subtrees move between neighboring trees and where they attach, with timeline, tree-distance, branch-support, moved-subtree, and optional MSA context.

The public site should lead with scientific tasks rather than generic “tree viewer” language:

1. animated phylogenetic tree comparison;
2. sliding-window phylogenetic visualization;
3. recombination-focused local-tree exploration;
4. rogue-taxon movement across bootstrap trees;
5. MSA-linked tree-series analysis.

## Content pillars

| Pillar                           | Search intent                                                        | Primary destination                                 |
| -------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------- |
| Animated tree comparison         | “compare phylogenetic trees visually”, “phylogenetic tree animation” | Project landing page and browser demo               |
| Sliding-window phylogenetics     | “sliding-window phylogenetic visualization”                          | Manual use-case guide                               |
| Recombination exploration        | “visualize phylogenetic changes across genome windows”               | Manual recombination guide and norovirus demo       |
| Bootstrap instability            | “rogue taxa bootstrap trees”, “recurrent subtree movement”           | Manual rogue-taxa guide and bootstrap demos         |
| Reproducible scientific software | “Phylo-Movies citation”, “Phylo-Movies source”                       | Publication, Zenodo archive, repository, and manual |

## Implemented foundation

- Search-focused landing, demo, and usage titles and descriptions
- Static HTML for landing, demo, and `/usage/` so core content is available without JavaScript
- `SoftwareApplication`, `SoftwareSourceCode`, `ScholarlyArticle`, `FAQPage`, and `HowTo` JSON-LD
- Root and manual sitemaps advertised through `robots.txt`
- `llms.txt` with product scope, use cases, canonical links, license, and citation identifiers
- Public manual with dedicated sliding-window, recombination, and rogue-taxa guides
- GitHub description, homepage, topics, DOI badges, `CITATION.cff`, releases, and Zenodo archive
- Live [bio.tools registry record](https://bio.tools/phylo-movies), with repository metadata retained in `docs/promotion/biotools-entry.json`

## Scientific directory priorities

New public submissions require a maintainer account and should be reviewed immediately before publishing.

### Priority 1: bio.tools

The [Phylo-Movies bio.tools record](https://bio.tools/phylo-movies) is live. Keep its version, links, EDAM operations, inputs, and outputs synchronized with releases and `docs/promotion/biotools-entry.json`. Add the registry URL to other public metadata where it materially helps users verify the software.

### Priority 2: Research Software Directory

Create a software page in the [Research Software Directory](https://research-software-directory.org/). Use the concept DOI, repository, license, contributors, publication DOI, demo videos, and manual. The RSD can import contributor and release metadata from DOI records.

### Priority 3: Software Heritage

Confirm that the GitHub repository is archived by [Software Heritage](https://archive.softwareheritage.org/save/). Record the persistent Software Heritage identifier when available and add it to archival documentation.

### Priority 4: OpenEBench

Evaluate [OpenEBench](https://openebench.bsc.es/) only if its technical monitoring or benchmarking model fits the application and reproducible benchmarks are ready. Do not register merely for a backlink.

### Priority 5: RRID/SciCrunch and Wikidata

Evaluate an RRID when the software is ready for stable resource citation. Consider a Wikidata item after third-party publication and registry records establish sufficient independent references.

## Surfaces to skip for now

- G2, Capterra, and commercial SaaS directories: poor fit for open research software.
- AI-tool directories and MCP registries: Phylo-Movies is not an AI product or MCP server.
- Generic bulk-submission services: low relevance and a potential source of spam links.
- Competitor-alternative landing pages: use technically neutral workflow comparisons instead.

## Measurement

Review monthly:

1. Search Console impressions, clicks, indexed pages, and queries for the five content pillars.
2. Bing Webmaster Tools index coverage.
3. Direct access status for `/`, `/demo/`, `/usage/`, `/manual/`, both sitemaps, `robots.txt`, and `llms.txt`.
4. Referrals from scientific software registries.
5. Browser-demo opens, manual visits, release-page visits, and DOI link clicks.
6. Whether ChatGPT, Perplexity, and other search-enabled assistants cite the landing page, manual, publication, or registry records for the priority queries.

Do not infer scientific adoption from page traffic alone. Track software citations and archived-release citations separately.
