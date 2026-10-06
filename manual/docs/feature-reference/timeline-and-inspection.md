---
title: Timeline and Inspection
---

# Timeline and Inspection

The movie player bar controls navigation through input trees and generated transition frames. It has two rows. The top row holds the **☰** Settings toggle, the transport buttons, the current position, **Inspect transition**, the alignment button (when an MSA is loaded), and playback speed. The bottom row is the timeline strip, which summarizes each transition (RF change and SPR moves) so you can pick one to inspect, with zoom buttons and a legend button beside it. On a phone (under 640 px wide) the top row keeps the **☰** toggle, the transport buttons, and a **⋯** button, with the position on its own line; speed, zoom, **Inspect transition**, the alignment button, and the legend move into the **⋯** popover, and the strip takes the full width of the bottom row. Comparison mode and the pinned tree live in **Settings ▸ View Mode**.

## Transport Controls

| Control                      | Meaning                                    |
| ---------------------------- | ------------------------------------------ |
| **Previous input tree**      | Jumps to the previous original input tree. |
| **Previous generated frame** | Moves one generated frame backward.        |
| **Play / Pause**             | Starts or stops animated playback.         |
| **Next generated frame**     | Moves one generated frame forward.         |
| **Next input tree**          | Jumps to the next original input tree.     |

Keyboard: **Space** plays or pauses, **← / →** step one generated frame, and **Shift + ← / →** jump between input trees. The keys are ignored while a text field, a slider such as Playback Speed, or a menu has focus. They also work on the focused timeline strip, where they act from the playhead (see [Playback and Timeline View](#playback-and-timeline-view)). With the tree canvas focused, Space still plays and pauses, but the arrow keys pan the tree.

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

| Marker                  | Meaning                                                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RF change (max …)**   | Bar height: the transition's normalized Robinson-Foulds distance, scaled to the dataset's largest RF (shown as max).                                                |
| **SPR move**            | One dot below the baseline per SPR move; size is the taxa moved. A transition too narrow for its moves gets one dot sized by its move count: zoom in for each move. |
| **Branch lengths only** | Dashed segment: only branch lengths changed (RF 0, weighted RF above 0).                                                                                            |
| **Input tree**          | Short tick for each original input tree (a circle at high zoom).                                                                                                    |
| **Selected**            | The selected transition turns dark, with a bracket under the exact selected part, so it reads by its shape as well as its colour.                                   |

The cyan line is the playhead: drag its knob at the top of the strip, or the line itself, to scrub. A click anywhere else selects the transition under it, even right beside the playhead (a press on the playhead that does not move counts as a click); clicking the selected transition again clears the selection. Numbering is 1-based and per transition throughout: the status strip reads "Tree a → b · step i of N" (or "Input tree n"), and the tooltip and Inspector use "Transition k of P".

## Playback and Timeline View

| Control                              | Meaning                                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| **Transition phase**                 | Shown as a chip next to the position text while a transition plays: Collapse, Expand, or Reorder. |
| **Playback Speed**                   | Adjusts animation speed from slow review to faster playback.                                      |
| **Zoom out / Fit / Zoom in** (− ⛶ +) | Zoom the timeline strip, or fit the whole sequence to the available width.                        |

Zoomed in, **Shift + wheel**, a sideways swipe, or a drag on empty strip pans the strip; the wheel zooms about the pointer and the buttons about the playhead. During playback the view pages to keep the playhead in sight. Click the strip, or Tab to it, to use the keyboard on it. The focus ring (an ink outline inside the strip, so cyan stays the playhead's) shows for keyboard focus, not after a click.

| Key                   | Result                                                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Space**             | Plays or pauses.                                                                                                                                                                            |
| **← / →**             | Previous or next generated frame, from the playhead.                                                                                                                                        |
| **Shift + ← / →**     | Previous or next input tree, from the playhead.                                                                                                                                             |
| **PageUp / PageDown** | Selects and jumps to the previous or next transition, skipping input trees, from the segment under the playhead.                                                                            |
| **Home / End**        | Selects and jumps to the first or last segment.                                                                                                                                             |
| **Enter**             | Opens the Transition Inspector for the selected transition, or with nothing selected for the one under the playhead (selecting it). On an input tree with nothing selected it does nothing. |
| **Esc**               | Clears the selection, so the Inspector follows the playhead again. With nothing selected it does nothing, and the key goes to whatever else is open.                                        |
| **+ / −**             | Zooms the strip in or out about the playhead.                                                                                                                                               |
| **0**                 | Fits the whole sequence.                                                                                                                                                                    |

The playhead and the selection are separate: the arrow keys move the playhead and leave the selection on the transition you chose. Clicking, PageUp / PageDown, Home / End, and Enter change the selection; Esc, or clicking the selected transition again, clears it.

## Finding Candidate Regions

RF distance and weighted RF distance per transition appear in the strip (bar height is the RF distance), the hover tooltip, and the Transition Inspector. For MSA datasets, tall bars are a quick way to find genome windows where neighboring tree topologies diverge. Use them as candidate regions for closer review in the Transition Inspector and the MSA viewer.

## Hover and Selection

| Action                         | Result                                                                                                                                                                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hover a transition             | Shows a compact tooltip above the player bar, so it never covers the controls. Header "Transition k of P · Tree a → b", then "RF x · weighted RF y" and "n SPR moves · m taxa moved" or "Branch lengths only".                                                            |
| Select a transition            | Turns it dark, updates the status strip, and keeps the Inspector on it; it does not open the Inspector. Clicking it again, or **Esc** on the focused strip, clears the selection.                                                                                         |
| **Inspect transition** button  | Opens the Transition Inspector for the selected transition, or with nothing selected for the transition under the playhead. Sits next to the status strip; on an input tree with nothing selected it is dimmed but still reachable by keyboard, and its tooltip says why. |
| Double-click a transition      | Selects it and opens the Transition Inspector.                                                                                                                                                                                                                            |
| **Enter** on the focused strip | Opens the Transition Inspector for the selected transition, selecting the one under the playhead first if none is. Does nothing on an input tree.                                                                                                                         |
| Close the Inspector tab        | Keeps the selected transition.                                                                                                                                                                                                                                            |

## Transition Inspector

The Transition Inspector shows the selected transition; with nothing selected it follows the transition under the playhead and says so, and selecting a transition pins it until you press **Esc** or click it again. It reports:

| Section       | Fields                                                                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Selection** | Header "Transition k of P", name "Tree a → Tree b", direction, "Steps s–e of N", and "Event j of m" when a transition has several split events. |
| **SPR Move**  | Moved taxa count, animation steps, pivot edge, affected subtree groups.                                                                         |
| **Metrics**   | RF distance, weighted RF distance, and source input-tree scale.                                                                                 |
| **Alignment** | MSA window coordinates when alignment data are mapped.                                                                                          |

Unavailable values usually mean the loaded dataset does not include that metric or the selection is an input tree rather than a transition.
