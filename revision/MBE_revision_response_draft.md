# MBE Revision Response Draft

Manuscript: MBE-26-0127, "Phylo-Movies: Animating Phylogenetic Trees from Sliding-Window Analyses"

## Summary of Planned Revision

We thank the editor and reviewers for their constructive assessment. In the revised manuscript and software release, we will address the software accessibility issues, clarify the scope of the GitHub Pages deployment, improve usability around tree scaling and the HUD, clarify the MSA synchronization behavior, and revise the manuscript to state the scientific role of Phylo-Movies more precisely. In particular, we will present rogue-taxon visualization as a complementary exploratory and diagnostic view rather than as a replacement for quantitative instability measures. We will also clarify that the bundled FastTree workflow is intended for rapid exploratory tree construction, while Phylo-Movies accepts externally inferred trees from IQ-TREE, RAxML-NG, or other packages for publication-grade analyses.

## Editor

**Comment:** Reviewers encountered problems with software or web functionality, requested clearer justification of scientific use cases and impact, and asked for clarification of FastTree and scalability. The manuscript should be more concise, use clearer terminology, and discuss usability and visualization options.

**Response:** We have revised the software distribution notes and public landing page to make clear that the GitHub Pages site is documentation-only and that full processing requires the desktop application, Docker image, or local full-stack setup. We added explicit macOS Gatekeeper instructions for unsigned desktop builds, improved the HUD so it can be hidden and restored, and strengthened MSA-window synchronization on initialization and when sync settings change. In the manuscript, we will shorten redundant background/method text, reduce terminology, clarify FastTree's role as an exploratory default, add notes on scalability and layout/zoom controls, and expand the discussion of scientific uses and limitations.

## Reviewer 1

**Comment 1:** The macOS executables were reported as "damaged" and would not run on Mac Tahoe. The `start.sh` script installed packages but did not leave an obvious runnable application.

**Response:** We have added clearer macOS instructions explaining that unsigned open-source builds may be blocked by Gatekeeper and can appear as damaged. The README now gives both Finder-based opening instructions and the `xattr -cr /Applications/Phylo-Movies.app` workaround. We will also ensure the revised release page highlights source, Docker, and desktop options separately, and we will test the revised release artifacts on current macOS before resubmission.

**Comment 2:** Page 3, line 19-20: change "that" to "which".

**Response:** Corrected in the revised manuscript.

## Reviewer 2

**Comment 1:** The GitHub-hosted website did not load examples or uploaded projects and returned "Failed to fetch".

**Response:** We clarified that the GitHub Pages deployment is documentation-only and does not run the BranchArchitect backend required for example loading, interpolation, and MSA workflows. The public page and README now direct users to the desktop app, Docker, or local full-stack setup for full functionality.

**Comment 2:** The interface is feature-rich but more complicated than expected.

**Response:** We will add a short usability paragraph to the manuscript explaining the core workflow and optional advanced panels. We also improved the README organization so first-time users can choose the desktop, Docker, or source workflow quickly.

**Comment 3:** The tree was drawn at a small scale relative to labels and dotted extensions; it was not obvious how to rescale. Circular layout hides internal structure compared with rectangular layouts.

**Response:** We will document mouse-wheel/trackpad zoom and pan controls more explicitly in the manuscript and README. The current software includes zoom and branch-length controls; we will make their availability clearer. We agree that rectangular layouts are useful, especially for inspecting internal topology. In the revised manuscript, we will state that the current release focuses on radial animated layouts and identify rectangular animated layout support as an active visualization extension.

**Comment 4:** The text description accompanying Figure 1 is partly redundant with the figure legend.

**Response:** We will shorten the Figure 1 method text and use the space for a larger, clearer version of panels showing the transformation steps.

**Comment 5:** Rogue-taxon detection may be better quantified than visually inferred; many animated SPRs may reflect uncertainty rather than recombination, and filtering uncertainty while retaining animation is unclear.

**Response:** We will revise the rogue-taxon section to make a narrower claim: Phylo-Movies complements quantitative instability metrics by showing where unstable taxa attach, which nearby clades are affected, and whether repeated movements have interpretable patterns. We will avoid presenting visual inspection as a substitute for quantitative rogue-taxon scoring. We will also clarify that animated differences may reflect uncertainty, model choice, or sampling noise, and that users should combine animation with support metrics, replicate structure, and external rogue-taxon methods.

**Comment 6:** "Small step sizes" should clarify that this refers to the sliding window.

**Response:** Corrected to "small sliding-window step sizes."

**Comment 7:** The definition of Pivot Edges appears redundant.

**Response:** We will remove or shorten the repeated definition and use one consistent term.

**Comment 8:** It is not obvious that the tree can be resized by mouse scroll or trackpad zoom.

**Response:** We will add this to the README and manuscript usability notes. The UI already supports zoom/pan gestures, and we will make the controls easier to discover.

**Comment 9:** The HUD could not be dismissed; the Coordinate tooltip was blank.

**Response:** We added an explicit HUD hide button with a restore control, and expanded the coordinate tooltip to explain the displayed timeline coordinate and full precision value.

**Comment 10:** The MSA Viewer does not appear animated in sync with the tree, even when Sync Window is on.

**Response:** We strengthened the synchronization logic so the MSA window is initialized when the controller mounts and is force-updated when the transition resolver, sync toggle, window size, step size, or alignment length changes. We will also clarify in the manuscript that interpolated frames between two source windows retain the current source-window alignment interval until the next full-tree window is reached.

**Comment 11:** JavaScript source code is well documented and follows style conventions.

**Response:** We thank the reviewer for this comment.

**Comment 12:** The journal LaTeX template's two-column format, line numbering, and Computer Modern font made review awkward.

**Response:** For the revision, we will submit a more reviewable PDF using the journal's allowed format while preserving the required source files.

**Comment 13:** The alignment viewer sentence about ordering sequences by current tree layout is repeated.

**Response:** We will remove the duplicate sentence.

**Comment 14:** It is unclear how different substitution models would be arranged in a linear sequence.

**Response:** We will revise this discussion. The intended point was that users can compare a deliberately ordered series of trees, but substitution models do not define a natural linear progression. We will either remove this example or rephrase it as an ordered sensitivity analysis chosen by the user.

## Reviewer 3

**Comment 1:** The Vimeo videos in the abstract have no sound; add narration if they are meant to demo the software.

**Response:** We will add narrated versions or ensure the revised links clearly point to self-explanatory demos with captions.

**Comment 2:** A paragraph in the introduction is redundant.

**Response:** We will remove or consolidate the repeated paragraph.

**Comment 3:** FastTree is surprising because it is less accurate and older; IQ-TREE has a fast option.

**Response:** We will clarify that FastTree is used as a rapid exploratory default for bundled sliding-window tree generation, not as a requirement of Phylo-Movies or a recommendation over more accurate inference methods. Phylo-Movies accepts precomputed ordered Newick trees, so users can infer window trees with IQ-TREE, IQ-TREE `-fast`, RAxML-NG, or other tools and use Phylo-Movies only for animation and visualization. We will add this distinction to the Methods and Discussion.

**Comment 4:** "Preceding tree" adds too much terminology; use one term.

**Response:** We will standardize terminology and avoid introducing unnecessary synonyms.

**Comment 5:** Phylo-Movies may be useful as an educational/workshop tool.

**Response:** We will add this use case to the abstract or introduction and discuss its value for teaching how local sequence changes can affect tree topology.

**Comment 6:** Does Phylo-Movies scale to thousands of taxa?

**Response:** We will add a scalability note. The WebGL renderer is intended to keep interaction responsive for hundreds of taxa and can display larger trees depending on hardware and settings, but thousands of taxa require careful use of labels, branch effects, and precomputed tree inputs. We will avoid overstating scalability and include practical guidance for large datasets.
