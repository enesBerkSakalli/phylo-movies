---
title: Timeline and Inspection
---

# Timeline and Inspection

The movie timeline controls navigation through input trees and generated transition frames. Its strip summarizes each transition (RF change and SPR moves) so you can pick one to inspect. It also exposes comparison mode, playback speed, tree-distance charts, and the Transition Inspector.

## Transport Controls

| Control                         | Meaning                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Previous input tree**         | Jumps to the previous original input tree.                                                             |
| **Previous generated frame**    | Moves one generated frame backward.                                                                    |
| **Play / Pause**                | Starts or stops animated playback.                                                                     |
| **Next generated frame**        | Moves one generated frame forward.                                                                     |
| **Next input tree**             | Jumps to the next original input tree.                                                                 |
| **Show / Hide comparison view** | Displays or hides a neighboring comparison tree.                                                       |
| **Link / Unlink tree views**    | Keeps comparison views synchronized or lets each view move independently.                              |
| **Pinned tree ‹ ›**             | Pins a neighbouring input tree as a translucent overlay reference; starts from the tree at the cursor. |

Keyboard: **Space** plays or pauses, **← / →** step one generated frame, and **Shift + ← / →** jump between input trees. The keys are ignored while a text field, slider, or menu has focus.

Input tree jumps skip generated interpolation frames. Generated-frame stepping is for detailed review of the transition between neighboring input trees.

## Timeline Legend

The strip draws one gray bar per transition, between each pair of consecutive input trees.

| Marker                  | Meaning                                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **RF change (max …)**   | Bar height: the transition's normalized Robinson-Foulds distance, scaled to the dataset's largest RF (shown as max). |
| **SPR move**            | One dot below the baseline per SPR move. Dot size is the number of taxa moved.                                       |
| **Branch lengths only** | Dashed segment: only branch lengths changed (RF 0, weighted RF above 0).                                             |
| **Input tree**          | Short tick for each original input tree (a circle at high zoom).                                                     |
| **Selected**            | The selected transition turns green, with a green line under the exact selected part.                                |

The blue line is the playhead. Numbering is 1-based and per transition throughout: the status strip reads "Tree a → b · step i of N" (or "Input tree n"), and the tooltip and Inspector use "Transition k of P".

## Playback Settings

| Control                                 | Meaning                                                                          |
| --------------------------------------- | -------------------------------------------------------------------------------- |
| **Transition phase**                    | Shown next to the cursor while a transition plays: Collapse, Expand, or Reorder. |
| **Playback Speed**                      | Adjusts animation speed from slow review to faster playback.                     |
| **Collapse / Expand timeline controls** | Hides or shows secondary timeline controls.                                      |
| **Timeline scroll controls**            | Moves the visible timeline range when the sequence is wider than the screen.     |

## Metric Chart

The chart below the timeline can show input-tree metrics such as RF distance and weighted RF distance. For MSA datasets, the chart is useful for finding genome windows where neighboring tree topologies diverge.

Use peaks in the chart as candidate regions for closer review in the timeline, Transition Inspector, and MSA viewer.

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
