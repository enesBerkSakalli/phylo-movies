# Reviewer Response Evidence Matrix

Status date: 2026-05-19

This matrix links reviewer/editor concerns to concrete repository evidence. It
is a working closure checklist for the MBE revision, not manuscript prose.

## Evidence Status Legend

| Status | Meaning |
| --- | --- |
| Closed | Repository artifact and verification evidence exist. |
| Manuscript text needed | Evidence exists, but final manuscript prose still needs to be updated. |
| Verification needed | Intended fix exists, but final release/test evidence is still missing. |
| Open | Work remains before resubmission. |

## Matrix

| Reviewer concern | Response claim | Repository evidence | Verification evidence | Status | Next action |
| --- | --- | --- | --- | --- | --- |
| GitHub Pages examples/upload fail because backend is unavailable. | GitHub Pages is documentation/demo-only; full workflows require desktop, Docker, or local backend. | `README.md`; `revision/MBE_revision_response_draft.md`; `revision/addressed_review_items.md`. | Documentation review only. | Manuscript text needed | Ensure final manuscript and release page make the same distinction. |
| macOS app appears damaged / `start.sh` unclear. | Add Gatekeeper guidance and keep multiple run paths visible. | `README.md`; `electron-app/README.md`; `start.sh`; `revision/MBE_revision_response_draft.md`. | Final macOS release artifact test still needed. | Verification needed | Build and test the release app on current macOS before resubmission. |
| FastTree is surprising for publication-grade inference; IQ-TREE should be supported. | FastTree is exploratory; publication-facing rogue-taxon examples are regenerated with IQ-TREE while preserving ordering logic. | `publication_data/bootstrap_rogue_taxa/current_results/`; `publication_data/bootstrap_rogue_taxa/scripts/bootstrap_ordering/`; `publication_data/bootstrap_rogue_taxa/current_results/README.md`; `README.md`. | `publication_data/bootstrap_rogue_taxa/current_results/verification/VERIFICATION.md`; `publication_data/bootstrap_rogue_taxa/current_results/MANIFEST.sha256`. | Closed | Mirror this distinction in Methods and Data Availability. |
| Bootstrap ordering semantics are unclear. | Ordering is deterministic composition-distance ordering, not time, likelihood, support, or rogue severity. | `publication_data/bootstrap_rogue_taxa/current_results/ORDERING_SEMANTICS.md`; `publication_data/bootstrap_rogue_taxa/current_results/verification/VERIFICATION.md`. | Checksum manifest and verification report in `current_results/`. | Closed | Cite as visualization/order heuristic only. |
| Distance metric may be wrong. | Corrected to count all alignment cells as `(A, C, G, T, AmbiguousOrGap)`. | `publication_data/bootstrap_rogue_taxa/current_results/verification/VERIFICATION.md`; `publication_data/bootstrap_rogue_taxa/scripts/bootstrap_ordering/generate_bootstrap_order.py`. | IQ-TREE current-results verification passed; `MANIFEST.sha256` validates files. | Closed | Do not retain earlier FastTree rankings in `publication_data`. |
| Rogue-taxon source data are third-party and should not be confused with Phylo-Movies data. | Do not vendor the full Aberer/RogueNaRok archive; record only selected source files and checksums. | `publication_data/bootstrap_rogue_taxa/source_alignments/MANIFEST.tsv`; `publication_data/bootstrap_rogue_taxa/README.md`; `publication_data/bootstrap_rogue_taxa/README.md`. | SHA256 values recorded for source alignments `24` and `125`; source files intentionally `NOT_VENDORED`. | Closed | Decide final archive policy: vendor two selected files, DOI-deposit them, or cite external archive plus checksums. |
| EPAS1 material is ambiguous and not part of the manuscript. | EPAS1 exploratory scripts are excluded from publication-facing data. | `publication_data/bootstrap_rogue_taxa/README.md`. | EPAS1 payload is absent from the publication-data layer. | Closed | Keep out of final public archive. |
| Norovirus/ReCAN data relationship is unclear. | Canonical 334-sequence alignment is the source; ReCAN is a derived validation workflow. | `publication_data/recombination_norovirus/README.md`; `publication_data/recombination_norovirus/RECOMBINATION_DATA_HYGIENE_AUDIT.md`; `publication_data/recombination_norovirus/scripts/recan_recombination_analysis/README.md`. | `publication_data/recombination_norovirus/MANIFEST.sha256`; `current_results/SOURCE_RUN_MANIFEST.json`. | Closed | Final manuscript should describe ReCAN as validation/supporting evidence, not a separate primary dataset. |
| ReCAN superseded outputs may not be reproducible. | Only the reviewed promoted output set is retained in `current_results/`; generated run folders are recreated on demand. | `publication_data/recombination_norovirus/current_results/`; `publication_data/recombination_norovirus/REGENERATE.md`. | `shasum -a 256 -c publication_data/recombination_norovirus/MANIFEST.sha256`; current results record query `MK753032_P16_GII-4`, 48 input sequences, 33 windows, ReCAN 0.5. | Closed | Cite only the promoted `current_results/` outputs. |
| Norovirus source provenance needs hygiene. | Source is a hashed local snapshot derived from Nextstrain/GenBank unless exact upstream commit is recovered. | `publication_data/recombination_norovirus/SOURCE_PROVENANCE.md`; `publication_data/recombination_norovirus/MANIFEST.sha256`. | Local search on 2026-05-19 found no recoverable `nextstrain/norovirus` checkout. | Manuscript text needed | Add data-availability wording that uses hashes as the reproducibility anchor, or recover the original upstream commit. |
| HUD could not be dismissed / coordinate tooltip blank. | HUD hide/restore and coordinate tooltip improvements are part of the revision. | `revision/MBE_revision_response_draft.md`; relevant frontend changes in current worktree. | Final UI smoke test still needed. | Verification needed | Run browser/Electron smoke path and capture the UI state. |
| MSA viewer does not appear synced with tree animation. | Synchronization is initialized and refreshed when sync settings/window metadata change; interpolated frames retain source tree interval until next input tree. | `revision/MBE_revision_response_draft.md`; frontend state/schema changes in current worktree. | Final UI smoke test still needed. | Verification needed | Test with quick MSA demo and norovirus example. |
| Scalability to thousands of taxa may be overstated. | State practical bounds: hundreds are interactive; thousands require settings/hardware/precomputed inputs. | `README.md`; `revision/MBE_revision_response_draft.md`. | Documentation review only. | Manuscript text needed | Mirror in Discussion and avoid overclaiming. |
| Videos lack narration/captions. | Add narrated or captioned demos, or link to self-explanatory demos. | `revision/MBE_revision_response_draft.md`; `revision/addressed_review_items.md`. | No final video artifact yet. | Open | Produce or link final narrated/captioned videos. |
| Manuscript says all data are available in the repository. | The bioRxiv upload package was manuscript-only; repository/release archive must carry reproducibility data. | `revision/BIOARXIV_UPLOAD_DATA_DISTRIBUTION_COMPARISON.md`; `publication_data/README.md`. | Current `dist/examples/` is demo-only and not sufficient for regeneration. | Open | Define publication-data archive and `REGENERATE.md` before final public release. |

## Immediate Closure Order

1. Finish final manuscript text for the closed data-method claims:
   FastTree/IQ-TREE, rogue-taxon visualization limits, ReCAN relationship, and
   hashed norovirus source snapshot.
2. Run final software smoke tests: macOS desktop app, local backend, GitHub
   Pages docs-only path, HUD hide/restore, coordinate tooltip, and MSA sync.
3. Produce final video/caption evidence.
4. Decide archive policy for the two selected Aberer/RogueNaRok source
   alignments and the hashed Nextstrain-derived norovirus snapshot.
5. Separate app demo examples from the publication-data archive so users know
   what can be opened versus what can be regenerated.
