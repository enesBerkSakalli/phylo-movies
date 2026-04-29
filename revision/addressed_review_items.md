# Addressed Reviewer Items

This checklist summarizes reviewer and editor concerns that have already been addressed in the repository or in the current revision response draft. Items marked as software/documentation are already reflected in code, README, metadata, or revision notes; manuscript-only items are captured in `revision/MBE_revision_response_draft.md` and still need to be mirrored in the final manuscript text where applicable.

## Software And Distribution

- [x] Clarified that the GitHub Pages deployment is documentation-only and does not run the BranchArchitect backend.
  - Evidence: `README.md` now states that example loading, interpolation, and MSA-derived tree construction require the desktop app, Docker image, or local full-stack setup.

- [x] Clarified why the GitHub-hosted site can produce backend-related failures such as failed example loading.
  - Evidence: `README.md` and the revision response explain that full processing workflows require the backend.

- [x] Documented alternative ways to run the full application.
  - Evidence: `README.md` describes desktop builds, Docker/local backend workflows, and the `start.sh` one-command startup.

- [x] Clarified that Newick tree viewing can work without the backend, while interpolation and MSA workflows require BranchArchitect.
  - Evidence: `README.md` installation notes.

- [x] Added reviewer-facing response text for macOS unsigned-app/Gatekeeper problems.
  - Evidence: `revision/MBE_revision_response_draft.md` explains the planned release-page and macOS instructions, including `xattr -cr`.

- [x] Added a release/testing action for current macOS desktop artifacts before resubmission.
  - Evidence: `revision/MBE_revision_response_draft.md`.

## Scientific Scope And Impact

- [x] Reframed rogue-taxon visualization as complementary to quantitative instability measures, not a replacement.
  - Evidence: `README.md`, `CITATION.cff`, and `revision/MBE_revision_response_draft.md` now use "complements summary statistics" language.

- [x] Clarified what the visual rogue-taxon workflow contributes scientifically.
  - Evidence: The revised wording emphasizes showing which lineages move, where they move from, and which new groupings they form.

- [x] Added caveats that animated differences can reflect uncertainty, model choice, or sampling noise.
  - Evidence: `revision/MBE_revision_response_draft.md`.

- [x] Added educational/workshop use as a planned manuscript use case.
  - Evidence: `revision/MBE_revision_response_draft.md`.

- [x] Clarified that substitution-model comparisons do not naturally define a linear sequence.
  - Evidence: `revision/MBE_revision_response_draft.md` proposes removing or rephrasing this example as user-ordered sensitivity analysis.

## Methodological Clarifications

- [x] Clarified the role of FastTree as a rapid exploratory default rather than a publication-grade recommendation.
  - Evidence: `README.md` current limitations and `revision/MBE_revision_response_draft.md`.

- [x] Stated that users can generate trees externally with IQ-TREE, IQ-TREE `-fast`, RAxML-NG, or other tools.
  - Evidence: `README.md` and `revision/MBE_revision_response_draft.md`.

- [x] Added practical scalability guidance.
  - Evidence: `README.md` notes that hundreds of taxa are interactive on typical laptops, while thousands depend on labels, effects, hardware, and transition-frame count.

- [x] Clarified sliding-window terminology.
  - Evidence: `docs/terminology.md` standardizes "sliding window", "anchor tree", "transition frame", and related terms; the response draft notes "small sliding-window step sizes".

- [x] Reduced ambiguous terminology in repository documentation.
  - Evidence: `README.md` points to standardized terminology and distinguishes anchor trees from transition frames.

## Usability And Visualization

- [x] Documented zoom and pan controls.
  - Evidence: `README.md` feature list includes standard mouse and trackpad zoom/pan gestures.

- [x] Added or tracked HUD dismissal improvements.
  - Evidence: `revision/MBE_revision_response_draft.md` states that a HUD hide button and restore control were added.

- [x] Added or tracked the missing Coordinate tooltip explanation.
  - Evidence: `revision/MBE_revision_response_draft.md` states that the coordinate tooltip was expanded to explain the timeline coordinate and full-precision value.

- [x] Clarified MSA synchronization behavior.
  - Evidence: `revision/MBE_revision_response_draft.md` explains initialization and update behavior, and clarifies that interpolated frames retain the source-window alignment interval until the next full-tree window is reached.

- [x] Added reviewer-facing acknowledgement that rectangular layouts are useful and that the current release focuses on radial animated layouts.
  - Evidence: `revision/MBE_revision_response_draft.md`.

- [x] Improved large-tree rendering robustness in code.
  - Evidence: current code changes include tree layout, viewport, label-radius, and render-contract test updates.

- [x] Added subtree/SPR mover analytics work to support quantitative inspection alongside animation.
  - Evidence: current code changes include `src/components/TreeStatsPanel/SubtreeAnalytics/` files and `src/domain/tree/sprAnalyticsUtils.js`.

## Manuscript Presentation

- [x] Drafted response to shorten redundant Figure 1 method text.
  - Evidence: `revision/MBE_revision_response_draft.md`.

- [x] Drafted response to remove or consolidate redundant introduction text.
  - Evidence: `revision/MBE_revision_response_draft.md`.

- [x] Drafted response to remove repeated alignment-viewer wording.
  - Evidence: `revision/MBE_revision_response_draft.md`.

- [x] Drafted response to remove or shorten the repeated Pivot Edge definition.
  - Evidence: `revision/MBE_revision_response_draft.md`.

- [x] Drafted response to standardize "preceding tree" and avoid unnecessary synonyms.
  - Evidence: `revision/MBE_revision_response_draft.md`.

- [x] Drafted correction of "that" to "which" on page 3.
  - Evidence: `revision/MBE_revision_response_draft.md`.

- [x] Drafted response to improve reviewability of the PDF format.
  - Evidence: `revision/MBE_revision_response_draft.md`.

- [x] Drafted response to add narrated or captioned demo videos.
  - Evidence: `revision/MBE_revision_response_draft.md` and `docs/Paper_Submission_TODO.md`.

## Still Needs Final Confirmation Before Resubmission

- [ ] Final desktop release artifacts need to be built and tested on current macOS.
- [ ] The final manuscript text must be checked to ensure all drafted text edits are actually applied.
- [ ] Narrated/captioned demo videos still need to be produced or linked.
- [ ] Zenodo/software DOI archival remains open.
- [ ] Final release page should explicitly separate documentation-only GitHub Pages from full-stack execution options.
