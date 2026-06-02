---
title: Export and Recording
---

# Export and Recording

Canvas export controls are in the top-right workspace toolbar.

## Viewport Controls

| Control | Meaning |
| --- | --- |
| **Fit all visible content** | Fits the active tree view into the canvas. |
| **Zoom out tree** | Decreases tree zoom. |
| **Reset tree view** | Restores the default tree view. |
| **Zoom in tree** | Increases tree zoom. |

These controls change only the viewport. They do not change the dataset, tree topology, or inference output.

## PNG Export

| Control | Meaning |
| --- | --- |
| **Save PNG** | Saves the current rendered tree canvas as a PNG image. |

PNG export captures the current canvas state, including layout, styling, labels, highlights, and comparison view if visible. It does not export the full manual, timeline, sidebar, or floating windows.

If PNG export fails, check that the tree has finished rendering and that the canvas is not blank.

## WebM Recording

| Control | Meaning |
| --- | --- |
| **Start recording** | Starts browser recording capture for the visualization canvas. |
| **Stop recording** | Finishes recording and saves the WebM file. |

Recording is useful for playback demonstrations and supplemental visual material. The browser may require recording permission, and recording can fail if the canvas is unavailable or the browser interrupts recording.

## Disabled Controls

Export controls can be disabled when:

- no dataset is loaded,
- the tree view is not ready,
- the active tree canvas has not rendered,
- the browser does not support the required recording behavior.

Load a dataset, wait for the tree to render, then try again.

## Manual Tour

The **Help** button starts the workspace tour. The tour highlights the sidebar, tree canvas, viewport controls, transport controls, timeline, and export controls. It does not start playback, change the dataset, record video, or download files.
