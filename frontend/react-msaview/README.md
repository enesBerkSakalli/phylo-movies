
# react-msaview

A multiple sequence alignment viewer

---

## API Documentation

### Main Exports

- **MSAView**: React component for rendering the MSA and tree view.
- **MSAModelF**: Factory function for creating the MSA model instance.

---

### Components and Functions

#### MSAView (default export)
**Type:** `React.Component<{ model: MsaViewModel }>`

Renders the main MSA and tree view. Accepts a model created by `MSAModelF().create(...)`.

#### MSAModelF (default export from `model`)
**Type:** `() => MsaViewModel`

Factory function for creating the MobX-state-tree model for the viewer. The model exposes actions and properties for controlling the view, such as color scheme, background color, and more.

---

### Utility Functions

#### parseGFF(str?: string): object[]
Parses a GFF (General Feature Format) string and returns an array of feature objects.

#### parseAsn1(asnString: string): { id: number; parent: number; name: string }[]
Parses an NCBI ASN.1 format string into a JavaScript object representing the tree structure.

#### measureTextCanvas(text: string, fontSize: number): number
Measures the width of a text string in pixels for a given font size using a canvas context.

#### chooseGridPitch(scale: number, minMajorPitchPx: number, minMinorPitchPx: number): { majorPitch: number, minorPitch: number }
Given a scale and minimum distances between gridlines, returns the gridline pitches to use.

#### makeTicks(start: number, end: number, bpPerPx: number, emitMajor = true, emitMinor = true): object[]
Generates tick marks for a scale, returning an array of tick objects with type and position.

#### mathPower(num: number): string
Formats a number with commas for thousands (e.g., 12345 → "12,345").

#### transform<T>(obj: Record<string, T>, cb: (arg0: [string, T]) => [string, T]): Record<string, T>
Transforms an object by applying a callback to each key-value pair.

#### generateNodeIds(tree: Node, parent = 'node', depth = 0): NodeWithIds
Recursively assigns unique IDs to nodes in a tree structure.

#### colorContrast(colorScheme: Record<string, string>, theme: Theme): Record<string, string>
Returns a color scheme with contrast text colors based on the theme.

#### skipBlanks(blanks: number[], arg: string | string[]): string
Removes characters at specified blank positions from a string or array.

#### setBrLength(...)
Sets branch length for tree visualization (see util.ts for details).

---

### Tree Rendering Functions (tree/renderTreeCanvas.ts)

#### renderTree({ offsetY, ctx, model, theme, blockSizeYOverride })
Renders the tree structure onto a canvas context.

#### renderNodeBubbles({ ctx, clickMap, offsetY, model, blockSizeYOverride })
Draws clickable node bubbles on the tree for interaction.

#### renderTreeLabels({ theme, model, offsetY, ctx, clickMap, blockSizeYOverride })
Draws labels for tree leaves and nodes.

#### renderTreeCanvas({ model, clickMap, ctx, offsetY, theme, highResScaleFactorOverride, blockSizeYOverride })
Main function to render the entire tree area, including branches, bubbles, and labels.

---

### MSA Rendering Functions (msa/renderMSABlock.ts, msa/renderBoxFeatureCanvasBlock.ts, msa/renderMSAMouseover.ts)

#### renderMSABlock({ model, offsetX, offsetY, contrastScheme, ctx, theme, ... })
Renders a block of the MSA (Multiple Sequence Alignment) onto a canvas context.

#### renderBoxFeatureCanvasBlock({ model, offsetX, offsetY, ctx, ... })
Renders annotation features (e.g., protein domains) as boxes on the MSA canvas.

#### renderMouseover({ ctx, model })
Renders mouseover highlights for columns and rows in the MSA view.

---

### InterProScan Integration (launchInterProScan.ts)

#### loadInterProScanResults(jobId: string): Promise<InterProScanResponse>
Fetches InterProScan results for a given job ID.

#### launchInterProScan({ seq, onProgress, onJobId, programs, model }): Promise<void>
Submits a sequence to InterProScan and updates the model with results.

#### loadInterProScanResultsWithStatus({ jobId, model }): Promise<void>
Fetches InterProScan results and updates the model, with status tracking.

---

### Data Models (model/)

#### DataModelF()
MobX-state-tree model for storing MSA, tree, and metadata strings. Includes actions for setting each property.

#### TreeModelF()
MobX-state-tree model for tree visualization state (label alignment, area width, branch length, etc.).

#### DialogQueueSessionMixin()
MobX-state-tree mixin for managing a queue of dialogs in the UI.

---

### Miscellaneous

#### version (from version.ts)
Current version of the package as a string.

#### Layout (default export from layout.ts)
Class for managing layout of rectangles (e.g., for annotation tracks) with collision detection.

---

## Docs

See [user guide](docs/user_guide.md)

## Demo

See https://gmod.github.io/react-msaview

This page is a deployment of the `app` directory in this repo, which uses the
`react-msaview` NPM package, and additionally adds the 3-D structure viewer

## Developers

The lib folder contains the NPM package, and the `app` folder contains an
example usage with additional wiring to use with a 3-D protein structure viewer

```bash
git clone https://github.com/GMOD/react-msaview
cd react-msaview
```

In one window, start a watcher for the library

```bash
cd lib
yarn tsc --watch
```

In another window, start the app

```bash
cd app
yarn dev
```

## Programmatic usage, embedding, downloading from NPM

To install as a NPM package or CDN style bundle, see [USAGE.md](USAGE.md)

## Notes

This repo also supports https://github.com/GMOD/jbrowse-plugin-msaview which is
a jbrowse 2 plugin for viewing MSAs

This repo also builds on abrowse (https://github.com/ihh/abrowse) and
phylo-react (https://www.npmjs.com/package/phylo-react)
