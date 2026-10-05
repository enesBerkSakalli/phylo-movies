---
title: Timeline and Inspection
---

# Timeline and Inspection

The movie player bar controls navigation through input trees and generated transition frames. It has two rows. The top row holds the **☰** Settings toggle, the transport buttons, the current position, **Inspect transition**, the alignment button (when an MSA is loaded), and playback speed. The bottom row is the timeline strip, which summarizes each transition (RF change and SPR moves) so you can pick one to inspect, with zoom buttons and a legend button beside it. Comparison mode and the pinned tree live in **Settings ▸ View Mode**.

## Transport Controls

| Control                      | Meaning                                    |
| ---------------------------- | ------------------------------------------ |
| **Previous input tree**      | Jumps to the previous original input tree. |
| **Previous generated frame** | Moves one generated frame backward.        |
| **Play / Pause**             | Starts or stops animated playback.         |
| **Next generated frame**     | Moves one generated frame forward.         |
| **Next input tree**          | Jumps to the next original input tree.     |

Keyboard: **Space** plays or pauses, **← / →** step one generated frame, and **Shift + ← / →** jump between input trees. The keys are ignored while a text field, slider, or menu has focus.

Input tree jumps skip generated interpolation frames. Generated-frame stepping is for detailed review of the transition between neighboring input trees.

The position text next to the buttons reads "Tree a → b · step i of N" during a transition or "Input tree n" on an input tree, and its tooltip shows the current movie time. While a transition plays, a stage chip beside it names the current phase.

## Comparison and Pinned Tree

These controls are in **Settings ▸ View Mode**, not in the player bar.

| Control                         | Meaning                                                                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Show / Hide comparison view** | Displays or hides a neighboring comparison tree.                                                                        |
| **Link / Unlink tree views**    | Appears only in comparison mode. Keeps comparison views synchronized or lets each view move independently.              |
| **Pinned tree ‹ ›**             | Pins a neighbouring input tree as a translucent overlay reference; starts from the current tree. **None** means no pin. |

## Timeline Legend

The strip draws one gray bar per transition, between each pair of consecutive input trees. Click the **(?)** button at the right end of the strip to open the legend.

| Marker                  | Meaning                                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **RF change (max …)**   | Bar height: the transition's normalized Robinson-Foulds distance, scaled to the dataset's largest RF (shown as max). |
| **SPR move**            | One dot below the baseline per SPR move. Dot size is the number of taxa moved.                                       |
| **Branch lengths only** | Dashed segment: only branch lengths changed (RF 0, weighted RF above 0).                                             |
| **Input tree**          | Short tick for each original input tree (a circle at high zoom).                                                     |
| **Selected**            | The selected transition turns green, with a green line under the exact selected part.                                |

The blue line is the playhead. Numbering is 1-based and per transition throughout: the status strip reads "Tree a → b · step i of N" (or "Input tree n"), and the tooltip and Inspector use "Transition k of P".

## Playback and Timeline View

| Control                              | Meaning                                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| **Transition phase**                 | Shown as a chip next to the position text while a transition plays: Collapse, Expand, or Reorder. |
| **Playback Speed**                   | Adjusts animation speed from slow review to faster playback.                                      |
| **Zoom out / Fit / Zoom in** (− ⛶ +) | Zoom the timeline strip, or fit the whole sequence to the available width.                        |

Click the focused strip and press **Home** or **End** to jump to the first or last segment. **← / →** move the selection one segment at a time.

## Finding Candidate Regions

RF distance and weighted RF distance per transition appear in the strip (bar height is the RF distance), the hover tooltip, and the Transition Inspector. For MSA datasets, tall bars are a quick way to find genome windows where neighboring tree topologies diverge. Use them as candidate regions for closer review in the Transition Inspector and the MSA viewer.

## Hover and Selection

| Action                        | Result                                                                                                                                                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hover a transition            | Shows a compact tooltip above the player bar, so it never covers the controls. Header "Transition k of P · Tree a → b", then "RF x · weighted RF y" and "n SPR moves · m taxa moved" or "Branch lengths only". |
| Select a transition           | Turns it green and updates the status strip. It does not open the Inspector.                                                                                                                                   |
| **Inspect transition** button | Opens the Transition Inspector. Sits next to the status strip and is enabled when a transition is selected.                                                                                                    |
| Double-click a transition     | Selects it and opens the Transition Inspector.                                                                                                                                                                 |
| Close the Inspector tab       | Keeps the selected transition.                                                                                                                                                                                 |

## Transition Inspector

The Transition Inspector reports:

| Section       | Fields                                                                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Selection** | Header "Transition k of P", name "Tree a → Tree b", direction, "Steps s–e of N", and "Event j of m" when a transition has several split events. |
| **SPR Move**  | Moved taxa count, animation steps, pivot edge, affected subtree groups.                                                                         |
| **Metrics**   | RF distance, weighted RF distance, and source input-tree scale.                                                                                 |
| **Alignment** | MSA window coordinates when alignment data are mapped.                                                                                          |

Unavailable values usually mean the loaded dataset does not include that metric or the selection is an input tree rather than a transition.
