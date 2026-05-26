# Response to Editor and Reviewers

Manuscript: MBE-26-0127, "Phylo-Movies: Animating Phylogenetic Trees from Sliding-Window Analyses"

Date: 2026-05-19

We thank the Associate Editor and the reviewers for their constructive and detailed feedback. We were encouraged that the reviewers found Phylo-Movies promising and potentially useful, and we have treated the software-accessibility concerns as the highest-priority revision item. In the repository and revision plan, we have also narrowed the scientific scope of the tool, especially around rogue-taxon analysis, and clarified methodological choices including FastTree, externally inferred trees, and scalability.

The repository materials now distinguish more clearly between the documentation-only GitHub Pages site and the full application, which requires the desktop app, Docker image, or a local full-stack setup. The revised manuscript will mirror this distinction. We also clarify that Phylo-Movies is primarily a visualization and diagnostic tool: it complements quantitative summaries such as Robinson-Foulds distances, support values, and rogue-taxon scores rather than replacing them.

## Associate Editor

**Comment:** The reviewers found the tool promising and potentially useful, but identified software or web functionality issues. They requested clearer justification of scientific use cases and impact, particularly for rogue taxon detection, and clarification of methodological choices such as FastTree and scalability. The manuscript would benefit from more concise presentation, clearer terminology, and improved discussion of usability and visualization options.

**Response:** We have addressed the repository/documentation portions of these points and have identified the remaining manuscript and release checks before resubmission. First, the README now separates the GitHub Pages information site from full application workflows that require the BranchArchitect backend. It describes desktop, Docker, and local installation options, explains why backend-dependent examples do not run on GitHub Pages alone, and includes macOS Gatekeeper guidance for unsigned builds. The final release page and manuscript text will be checked to ensure they make the same distinction. Second, the response narrows the scientific framing: rogue-taxon animations are described as an exploratory and diagnostic complement to quantitative instability measures, not as a replacement for them. Third, repository documentation and the response clarify methodological scope: FastTree is retained only as a rapid exploratory tree-building option, while users can load ordered trees inferred externally with IQ-TREE, IQ-TREE `-fast`, RAxML-NG, or other tools. We have also added practical scalability guidance in repository documentation; the final manuscript will still need the corresponding streamlined methods text and terminology.

## Reviewer 1

**Comment 1:** The tool appears valuable and useful, but the reviewer could not test the executables. macOS reported that the app was "damaged", and after running `start.sh` it was unclear how to run the software as a standalone app or through the browser.

**Response:** We have clarified the macOS distribution instructions. Because the current open-source desktop builds are unsigned, macOS Gatekeeper can block first launch and may report the application as damaged. The README now explains how to open the app using Finder's right-click or Control-click "Open" workflow, and also documents the Terminal workaround `xattr -cr /Applications/Phylo-Movies.app`. We also clarified the difference between the desktop build, Docker workflow, and local `start.sh` workflow. The `start.sh` path is intended to start the BranchArchitect backend and Vite frontend for browser use, with the frontend available locally after startup. Before resubmission, we will test the current macOS release artifacts and make the release page separate desktop downloads from source-based workflows more visibly.

**Comment 2:** Page 3, line 19-20, first column: change "that" to "which".

**Response:** This will be corrected in the revised manuscript, and the final manuscript check remains part of the resubmission checklist.

## Reviewer 2

**Comment 1:** The GitHub-hosted website was not functioning properly. Loading an example file and uploading a downloaded example both produced "Failed to fetch".

**Response:** We have clarified in the README and revision notes that the GitHub Pages deployment is an information and documentation site, not the full-stack application. Backend-dependent functions such as example loading, tree interpolation, and MSA-derived tree construction require the BranchArchitect backend and therefore require the desktop app, Docker image, or local full-stack setup. The final manuscript and release page will be checked to make this distinction explicit so users do not expect the GitHub Pages site to provide full processing.

**Comment 2:** The user interface was more complicated than expected, although feature-rich and fairly intuitive.

**Response:** We will add a short usability-oriented paragraph to the manuscript that separates the core workflow from optional advanced panels. The core workflow is: load or generate an ordered tree series, navigate the timeline, inspect animated subtree movements, and optionally use distance charts, MSA views, and export controls for deeper analysis. The README has also been reorganized so first-time users can choose a desktop, Docker, or source workflow more directly.

**Comment 3:** The tree was drawn at a small scale relative to labels and dotted leader lines. It was not obvious how to rescale the tree. The circular layout makes internal structure less visible than a rectangular layout, and the interface appears locked to circular layout only.

**Response:** We will document the existing zoom and pan controls more explicitly in the manuscript and README, including mouse-wheel and two-finger trackpad zoom. We agree that rectangular layouts are valuable for inspecting internal topology. The current release focuses on radial animated layouts because this layout keeps moving subtrees visually trackable during interpolation, but we now present this as a design choice rather than a universal preference. We will identify rectangular animated layouts as an important future visualization extension.

**Comment 4:** The three paragraphs describing the animation algorithm are partly redundant with Figure 1 and its legend. Space might be better used to enlarge panels (c) and (d).

**Response:** We will shorten the algorithm description around Figure 1 and rely more on the figure and legend for the step-by-step explanation. The saved space will be used to improve figure readability, especially the transformation panels.

**Comment 5:** The reviewer was not convinced that visual inspection is the best way to identify rogue taxa. Quantifying instability may be more effective, and many SPRs may reflect phylogenetic uncertainty rather than recombination. There does not seem to be a way to filter uncertainty while retaining animation.

**Response:** We agree with this concern and have narrowed the claim. Phylo-Movies is not intended to replace quantitative rogue-taxon detection, bootstrap-support filtering, or uncertainty-threshold filtering. In the revised pipeline, branch-support annotations from bootstrap-aware analyses are parsed and integrated into the SPR movement ledger. The movement events table reports source and destination support values for each movement and can filter movements with a user-selected bootstrap threshold, grouping rows as both attachments at or above threshold, one attachment at or above threshold, both below threshold, or support missing. This helps users focus the movement table on support-aware movement classes without implying that the animation itself automatically suppresses uncertain rearrangements. We will state explicitly that animated rearrangements can reflect reconstruction uncertainty, model choice, sampling noise, or genuine biological signal, and that support-aware inspection should be interpreted alongside replicate structure and external rogue-taxon methods. To support this framing, the revised software work also adds subtree and SPR-move analytics so animation can be interpreted alongside quantitative summaries, while threshold-based pruning of the animated tree sequence remains outside the core animation step.

**Comment 6:** On page 2, "Small step sizes" should clarify that this refers to the sliding window.

**Response:** Corrected to "small sliding-window step sizes."

**Comment 7:** "Pivot Edges are defined as shared branches [...]" appears redundant given the earlier definition.

**Response:** We will remove or shorten the repeated definition and use one consistent definition.

**Comment 8:** In the app, it is not obvious that the tree can be resized by mouse scroll or two-finger trackpad zoom.

**Response:** We will document zoom and pan gestures in the manuscript usability section and README. We will also make these controls easier to discover in the interface documentation.

**Comment 9:** It does not seem possible to dismiss the HUD. The tooltip for Coordinate in the HUD is blank.

**Response:** We added an explicit HUD hide control with a restore affordance and expanded the Coordinate tooltip to explain the displayed timeline coordinate and full-precision value. This remains marked for final UI smoke testing and will be included in the revised software release notes after verification.

**Comment 10:** The MSA Viewer does not seem animated in sync with the tree, even when the Sync Window toggle is on.

**Response:** We strengthened the synchronization logic so the MSA window initializes when the controller mounts and updates when the transition resolver, sync toggle, window size, step size, or alignment length changes. This remains marked for final UI smoke testing. We will also clarify the intended behavior: interpolated transition frames retain the source input tree's alignment interval until the next input tree is reached. This avoids implying base-by-base animation inside generated transition frames.

**Comment 11:** The JavaScript source code appears well documented and adherent to style conventions.

**Response:** We thank the reviewer for this positive comment.

**Comment 12:** The LaTeX two-column format, line numbering, and Computer Modern font made review awkward.

**Response:** For the revision, we will submit a more reviewable PDF format if permitted by the journal while preserving the required source files.

**Comment 13:** The manuscript repeats the point that the alignment viewer can order sequences according to the current tree layout.

**Response:** We will remove the duplicate sentence.

**Comment 14:** The statement that Phylo-Movies could visualize affected subtrees when the substitution model changes is confusing because different substitution models do not naturally define a linear sequence.

**Response:** We agree. We will either remove this example or rephrase it as a user-defined ordered sensitivity analysis. We will not imply that substitution models have a natural linear ordering.

## Reviewer 3

**Comment 1:** The Vimeo videos linked from the abstract have no sound; narration would be useful if they are intended to demonstrate the software.

**Response:** We will add narrated versions or ensure the revised links point to captioned, self-explanatory demo videos.

**Comment 2:** The paragraph beginning "A phylogenetic tree represents ..." in the introduction is redundant with earlier introduction text.

**Response:** We will remove or consolidate this repeated background paragraph.

**Comment 3:** The use of FastTree is surprising because it is fast but less accurate, has not been updated in a long time, and IQ-TREE has a `-fast` option.

**Response:** We agree that FastTree should not be presented as a publication-grade recommendation. We have clarified that FastTree is used only as a rapid exploratory default in the bundled sliding-window tree-generation workflow. Phylo-Movies itself accepts precomputed ordered Newick trees, so users can infer trees externally with IQ-TREE, IQ-TREE `-fast`, RAxML-NG, or another preferred package and use Phylo-Movies only for animation and visualization. For the revised rogue-taxon publication data, we have treated IQ-TREE-based bootstrap tree sets as the publication-facing evidence while retaining FastTree only as an optional exploratory mode in reproducibility tooling.

**Comment 4:** The term "preceding tree" introduces too much terminology; it is better to stick to one term.

**Response:** We will standardize terminology throughout the manuscript. In particular, we will use "input tree" for observed trees supplied to the viewer and "transition frame" for generated intermediate animation states. We will avoid unnecessary synonyms such as "preceding tree" where a simpler reference to the previous input tree is sufficient.

**Comment 5:** Phylo-Movies may be useful as an educational tool, for example in workshops.

**Response:** We agree and will add this use case to the abstract or introduction. Animation can help students and workshop participants see how local sequence changes, sliding-window choices, or bootstrap uncertainty can produce visible topology changes.

**Comment 6:** Does Phylo-Movies scale to large trees, for example thousands of taxa?

**Response:** We will add a practical scalability statement. The WebGL renderer is intended to keep interaction responsive for hundreds of taxa on typical laptops. Trees with thousands of taxa can be inspected depending on hardware, label visibility, branch effects, and the number of transition frames, but they require conservative rendering settings and are best used with precomputed tree inputs. We will avoid overstating performance and will present large-tree use as possible but setting-dependent.

## Remaining Checks Before Resubmission

The current revision plan still requires final confirmation of several items before resubmission: testing the final macOS desktop artifact on current macOS, running a UI smoke test for HUD hide/restore and MSA synchronization, producing or linking final narrated or captioned videos, and checking that every manuscript-only edit above is reflected in the final submitted manuscript.
