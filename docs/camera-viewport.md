# Tree Camera And Viewport Contract

## Ownership

- `DeckGLContext` owns live tree camera state in memory. It passes a controlled `viewState` prop to deck.gl and applies every deck.gl `onViewStateChange` update back into `DeckGLContext.viewStates`.
- Zustand owns durable UI mode such as `cameraMode`, selected tree/frame state, label visibility, layout parameters, and controller lifetime. It does not own live tree `target` or `zoom`.
- `TreeLayoutController` owns layout dimensions in CSS pixels. deck.gl owns drawing-buffer resolution through `useDevicePixels`.

## Dimensions And DPR

- The tree canvas is measured from the native container bounding rect first, then canvas CSS size, then drawing-buffer dimensions as a last resort.
- Layout, fit math, and deck `width`/`height` use CSS pixels.
- High-DPI rendering is delegated to deck.gl. Do not multiply tree layout dimensions by `window.devicePixelRatio`.

## Auto-Fit Rules

- Initial single-tree static render auto-fits branch and extension geometry. When labels are visible, it also reserves label-anchor glyph height, but it does not fit full label text width.
- Discrete tree changes auto-fit once when `_lastFocusedTreeIndex` changes.
- Layout-affecting changes and untouched resizes clear the last focused tree so the next static render refits.
- Animation and scrub interpolation frames do not auto-fit.
- Label visibility changes redraw the layers with `skipAutoFit: true`; they do not move the camera.
- Manual "fit visible content" includes label text only when labels are visible. With labels hidden, hidden label text is not part of the fit.

## Bounds Vocabulary

- Branch bounds: node positions plus explicit link/path geometry passed to the fit calculation.
- Label anchor bounds: visible label anchor positions expanded by one rendered label line height. Automatic branch fit may use these to keep glyphs away from the canvas edge without making long label text control zoom.
- Label text bounds: label anchor positions expanded by the rendered text size heuristic.
- Visible fit bounds: manual fit semantics, which include label text only when text labels are currently visible.
- Comparison spacing bounds: side-by-side tree spacing uses each tree's local rendered radius and ignores hidden label text.

## Camera Modes

- Orthographic and orbit modes keep separate view-state objects.
- Switching modes preserves target and zoom so a 2D/3D toggle does not reset scale.
- Orbit keeps its own rotation defaults unless the user changes it through deck.gl controls.
