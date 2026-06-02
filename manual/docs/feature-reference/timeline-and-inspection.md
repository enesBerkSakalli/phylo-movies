---
title: Timeline and Inspection
---

# Timeline and Inspection

The movie timeline controls navigation through input trees and generated transition frames. It also exposes comparison mode, playback speed, tree-distance charts, and the Transition Inspector.

## Transport Controls

| Control | Meaning |
| --- | --- |
| **Previous input tree** | Jumps to the previous original input tree. |
| **Previous generated frame** | Moves one generated frame backward. |
| **Play / Pause** | Starts or stops animated playback. |
| **Next generated frame** | Moves one generated frame forward. |
| **Next input tree** | Jumps to the next original input tree. |
| **Show / Hide comparison view** | Displays or hides a neighboring comparison tree. |
| **Link / Unlink tree views** | Keeps comparison views synchronized or lets each view move independently. |

Input tree jumps skip generated interpolation frames. Generated-frame stepping is for detailed review of the transition between neighboring input trees.

## Timeline Legend

| Marker | Meaning |
| --- | --- |
| **Input trees** | Original trees in the ordered series. |
| **Generated frames** | Interpolated frames created between input trees. |
| **Selected segment** | Timeline segment selected for detailed inspection. |

## Playback Settings

| Control | Meaning |
| --- | --- |
| **Motion status** | Reports the current topology-change phase, such as Collapse, Expand, Reorder, or Idle. |
| **Playback Speed** | Adjusts animation speed from slow review to faster playback. |
| **Collapse / Expand timeline controls** | Hides or shows secondary timeline controls. |
| **Timeline scroll controls** | Moves the visible timeline range when the sequence is wider than the screen. |

## Metric Chart

The chart below the timeline can show input-tree metrics such as RF distance and weighted RF distance. For MSA datasets, the chart is useful for finding genome windows where neighboring tree topologies diverge.

Use peaks in the chart as candidate regions for closer review in the timeline, Transition Inspector, and MSA viewer.

## Hover and Selection

| Action | Result |
| --- | --- |
| Hover a segment | Shows a compact tooltip with segment context. |
| Select a segment | Opens the Transition Inspector. |
| Close the inspector | Clears the selected segment. |

## Transition Inspector

The Transition Inspector reports:

| Section | Fields |
| --- | --- |
| **Selection** | Segment name, direction, global frame range, local step range. |
| **SPR Move** | Moved taxa count, generated frame count, animation steps, pivot edge, affected subtree groups. |
| **Metrics** | RF distance, weighted RF distance, and source input-tree scale. |
| **Alignment** | MSA window coordinates when alignment data are mapped. |

Unavailable values usually mean the loaded dataset does not include that metric or the selected segment is an input-tree marker rather than a generated transition segment.
