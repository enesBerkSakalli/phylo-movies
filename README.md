# PhyloMovies

PhyloMovies is a browser-based phylogenetic tree viewer for inspecting tree trajectories, morphing animations, and comparative evolutionary relationships. It targets computational biologists, outbreak analysts, and visualization researchers who need to interrogate tree dynamics without building bespoke tooling.

## Demo Video

- **Platform overview**: [High-level demo](https://www.youtube.com/watch?v=zf_UNh2EjUg) covering morphing, charting, and export flows.
- **Norovirus walkthrough**: [Dataset-specific tour](https://www.youtube.com/watch?v=lqur97hfok0) showcasing how to trace clades frame by frame.

## Features

### Interactive Tree Visualization

- **Interpolated tree morphing**: Generate intermediate states between anchor trees to study incremental topological changes.
- **Anchor vs. transition states**: Toggle between reference snapshots and interpolated frames to isolate where splits differ.
- **Adjustable rendering parameters**: Control branch thickness, font size, and color schemes to highlight specific taxa.
- **Zoom and pan controls**: Inspect large trees using standard mouse or trackpad gestures.

### Comprehensive Analysis Tools

- **Robinson-Foulds distance charts**: Plot similarity metrics across a series to pinpoint major rearrangements.
- **Weighted distance analysis**: Compare branch-length aware distances alongside pure topology metrics.
- **Scale tracking**: Visualize evolutionary scale values associated with each tree.
- **Linked timeline navigation**: Drag the time axis or charts to keep numerical indicators and tree views synchronized.

### MSA Integration

- **Alignment viewer**: Display aligned sequences next to the tree viewport.
- **Bidirectional highlighting**: Selecting taxa in either view highlights the same entries elsewhere.
- **Position tracking**: Jump to alignment coordinates that correspond to the active tree state.
- **Unified theme**: Tree and alignment panes share the same dark UI style for accessibility.

### Recording & Export

- **Session capture**: Record morphing sessions directly from the browser canvas.
- **Vector export**: Output SVG representations of trees and charts for publication.
- **Automatic download**: Save recordings immediately after capture if desired.
- **Multiple formats**: Export static images (SVG/PNG) or video (WebM) depending on the use case.

### Advanced Features

- **Side-by-side comparison**: Render two trees simultaneously for qualitative inspection.
- **Taxa color presets**: Store and reuse color palettes for clade highlighting.
- **Scatter plot analysis**: Plot tree relationships in derived feature spaces.
- **Responsive layout**: Layout adjusts between desktop and tablet breakpoints.

## Who It's For

- **Pipeline authors** validating inference methods by replaying topology changes along a timeline.
- **Surveillance teams** summarizing clade dynamics for operational briefings.
- **Instructors or communicators** illustrating how sequence differences propagate to tree structure.

## Quick Start

### Prerequisites

**System Requirements:**
- **Node.js**: Version 18.0.0 or newer (tested with v24.10.0)
- **npm**: Version 8.0.0 or newer (comes with Node.js)
- **Modern web browser**: Chrome, Firefox, Safari, or Edge with JavaScript enabled
- **Git**: For cloning the repository
- **RAM**: 4GB minimum, 8GB recommended for large datasets
- **Storage**: 1GB free space for installation and temporary files

### Installation Methods

This project is a frontend-only application built with Vite and React. Start with the base setup, then choose the workflow that fits your needs.

#### Base setup

```bash
git clone https://github.com/enesBerkSakalli/phylo-movies.git
cd phylo-movies
npm install
```

#### Method 1: Local development (contributor workflow)

Use when modifying code or running tests with hot reload.

1. Start the dev server:
   ```bash
   npm run dev
   ```
2. Open `http://localhost:5173/pages/home/` or `http://localhost:5173/pages/visualization/`.
3. Development mode provides HMR, source maps, and error overlays out of the box.

#### Method 2: Production build (custom hosting)

Use when deploying optimized static assets to your own infrastructure.

1. Build static files:
   ```bash
   npm run build
   ```
   Outputs go to `dist/` with minified JS/CSS and code splitting.
2. Optionally preview locally:
   ```bash
   npm run preview
   ```
   Serves `dist/` at `http://localhost:4173`.
3. Deploy the contents of `dist/` to your preferred web server or CDN.

#### Method 3: GitHub Pages (static demo)

Use for a public, dataset-backed demo hosted on GitHub Pages.

1. Build with the GitHub Pages base path:
   ```bash
   npm run build:gh
   ```
   The script sets `--base`, copies `example.json`, and writes a redirecting `dist/index.html`.
2. Publish `dist/` via the `gh-pages` branch or the Pages configuration in repository settings.
3. Access the deployment at `https://<username>.github.io/<repo>/pages/home/` (replace placeholders). Update the `build:gh` script if the repository name differs from `phylo-movies`.

---

### Running Tests

The project includes comprehensive test suites covering various functionalities.

**Run all tests:**
```bash
npm test
```

**Run tests in watch mode:**
```bash
npm run test:watch
```

**Run specific test suites:**
```bash
npm run test:unit          # Parser and file upload tests
npm run test:msa           # MSA workflow tests
npm run test:tree-animation # Tree animation tests
```

Some targeted suites load fixtures from the `data/` directory; keep the sample datasets intact or update the paths before running CI locally.

---

### Verifying Your Installation

After installing, verify everything works correctly:

**1. Check Node.js and npm versions:**

```bash
node --version  # Should show v18.0.0 or higher
npm --version   # Should show v8.0.0 or higher
```

**2. Verify dependencies installed:**

```bash
npm list --depth=0  # Should list all packages without errors
```

**3. Test development server:**

```bash
npm run dev
```

Expected output should include:
```
VITE v5.4.20  ready in XXX ms
Local: http://localhost:5173/
```

Open `http://localhost:5173/pages/home/` in your browser. You should see the PhyloMovies home page.

**4. Test production build:**

```bash
npm run build
```

Expected output should end with:
```
Built in XXXs
dist/pages/home/index.html                   0.57 kB
dist/pages/visualization/index.html          1.11 kB
dist/assets/[various files listed]
```

Check that `dist/` folder was created:
```bash
ls -l dist/
```

**5. Test production preview:**

```bash
npm run preview
```

Access at `http://localhost:4173/pages/home/`

**6. Test with example data:**

- Start dev server: `npm run dev`
- Navigate to `http://localhost:5173/pages/home/`
- Click "Load Example" button
- Should load example phylogenetic tree visualization

**7. Run tests (optional):**

```bash
npm test  # Runs full test suite
```

**Success indicators:**
- Dev server starts without errors
- Browser shows the home page interface
- "Load Example" button works and displays tree visualization
- Build completes and creates `dist/` folder
- No critical errors in browser console (F12)

**If any step fails**, refer to the [Troubleshooting](#installation-troubleshooting) section below.

---

### Development Scripts

Additional utility scripts for development:

```bash
npm run lint:store-usage   # Check Zustand store usage patterns
npm run demo:msa-scrolling # Run MSA scrolling demonstration
```

## Usage Guide

### Loading Phylogenetic Data

1. Upload your tree files (Newick format supported)
2. Optionally upload Multiple Sequence Alignment (MSA) files
3. Configure visualization parameters (window size, step size, etc.)

### Navigation Controls

- **Play/Pause**: Start or stop tree animation sequences
- **Step Forward/Backward**: Navigate frame by frame through tree transitions
- **Tree Navigation**: Jump between major tree states
- **Speed Control**: Adjust animation speed (1x to 10x)

### Analysis Features

- **Chart Viewer**: Open interactive charts showing distance metrics
- **MSA Viewer**: Launch the sequence alignment viewer
- **Tree Comparison**: Compare different trees side by side
- **Recording**: Capture your analysis sessions as videos

### Customization Options

- **Branch Coloring**: Highlight internal branches and specific taxa
- **Scale Adjustment**: Modify tree scaling and branch lengths
- **Color Schemes**: Apply custom coloring to taxa groups
- **Export Settings**: Configure output formats and quality

### Typical Analysis Scenario

1. Use the **Load Example** action on the home page (or drop your own Newick/FASTA files) to populate the viewer.
2. Set animation cadence (window size, step size, playback speed) and optionally filter taxa through saved color palettes.
3. Correlate topology shifts with **Robinson-Foulds** or **Scale** charts by scrubbing the shared timeline.
4. Open the **MSA Viewer** to validate that highlighted taxa share the expected sequence signatures.
5. Capture a WebM recording or export SVG snapshots once the inspection is complete.

## Technical Details

### Architecture

- **Frontend Framework**: React 18.2.0 with modern hooks and state management
- **Build Tool**: Vite 5.4.20 for fast development and optimized builds
- **State Management**: Zustand 5.0.6 for global application state
- **Tree Rendering**: Deck.gl 9.1.14 (GPU-accelerated WebGL) with D3.js 7.9.0 for tree layouts
- **UI Components**: Radix UI primitives with Tailwind CSS 4.1.13 for styling
- **MSA Viewer**: alignment-viewer-2 for sequence alignment visualization
- **Type Safety**: TypeScript 5.8.3 with JSDoc annotations
- **Testing**: Mocha + Chai for unit tests, Playwright for E2E tests

### Key Technologies

- **@deck.gl/core & @deck.gl/layers**: GPU-accelerated rendering for smooth animations
- **D3.js**: Tree layout algorithms and data transformations
- **React**: Component-based UI architecture
- **Zustand**: Lightweight state management with React hooks
- **Vite**: Next-generation frontend tooling with instant HMR
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality accessible UI components

### File Formats Supported

- **Trees**: Newick format (.nwk, .newick, .tree), JSON format
- **Alignments**: FASTA format (.fasta, .fas, .fa)
- **Export**: SVG, PNG (trees), WebM (recordings)

### Browser Compatibility

- Chrome/Chromium 90+ (recommended)
- Firefox 88+
- Safari 14+
- Edge 90+

**Note**: WebGL support is required for optimal performance.

### Performance Considerations

- GPU-accelerated rendering via Deck.gl for smooth animations
- Optimized for datasets with hundreds to thousands of taxa
- Progressive loading for large tree series
- Memory-efficient rendering pipeline with viewport culling
- Responsive design adapts to various screen sizes and devices


## Project Structure

```
phylo-movies/
|-- src/                     # Source code
|   |-- react/               # React components
|   |   |-- components/      # UI components (HUD, nav, taxa-coloring, etc.)
|   |   |-- home/            # Home page components
|   |   `-- App.jsx          # Main app component
|   |-- js/                  # Core JavaScript modules
|   |   |-- controllers/     # App controllers (GUI, navigation)
|   |   |-- core/            # Core systems (store, TransitionIndexResolver)
|   |   |-- treeVisualisation/ # Tree rendering (DeckGL, D3.js)
|   |   |-- timeline/        # Timeline management
|   |   |-- treeColoring/    # Taxa coloring system
|   |   `-- utils/           # Utility functions
|   |-- components/          # shadcn/ui components
|   |-- lib/                 # Library utilities
|   `-- index.css            # Global styles
|-- pages/                   # Static pages
|   |-- home/                # Home page entry point
|   `-- visualization/       # Visualization page entry point
|-- data/                    # Example datasets
|-- test/                    # Test suites
|-- dist/                    # Production build output (generated)
|-- package.json             # npm dependencies and scripts
|-- vite.config.ts           # Vite configuration
|-- tsconfig.json            # TypeScript configuration
|-- tailwind.config.js       # Tailwind CSS configuration
`-- README.md                # This file
```


### The `data/` Folder

The `data/` directory contains example datasets and sample files, including those from the original PhyloMovies publication. This folder is useful for:

- **Reproducing Publication Results**: Includes datasets such as `norovirus_200_20/` and `simulation_trees/` used in the original paper, allowing you to replicate published analyses and figures.
- **Quick Start & Demos**: Provides ready-to-use tree and alignment files so you can try out PhyloMovies features without needing to supply your own data.
- **Testing**: Contains small and large example files to test performance and compatibility.
- **Format Reference**: Includes files in supported formats (e.g., Newick for trees, FASTA for alignments) to serve as templates for your own data.

**Typical contents:**

- `norovirus_200_20/` - Dataset from the publication for norovirus phylogenies.
- `simulation_trees/` - Simulated tree datasets as used in the paper.
- `example_tree.nwk` - Example phylogenetic tree in Newick format.
- `example_alignment.fasta` - Example multiple sequence alignment in FASTA format.
- `README.txt` - (Optional) Describes the datasets included in the folder.

You can add your own data files here for local testing, or use these samples to explore the application's capabilities and reproduce results from the publication.

## Contributing

Follow the standard GitHub workflow:

- File bugs or feature requests through GitHub Issues.
- Discuss architectural or UX topics in Discussions before large changes.
- Submit pull requests with focused commits and rationale.
- Update documentation, examples, or tests when behavior changes.

### Development Setup

1. Complete the installation steps in the Quick Start section.
2. Create a feature branch describing the change scope.
3. Run the relevant `npm run test:*` targets and document required fixtures.
4. Include screenshots or short clips when modifying the UI.

## License

This project is open source. Please check the license file for specific terms and conditions.

## Citation

If you use PhyloMovies in your research, please consider citing:

PhyloMovies: An Interactive Phylogenetic Tree Visualization Platform

[Authors and publication details to be added]

## Support & Documentation

### Getting Help

- **Issues**: Report bugs on GitHub Issues
- **Documentation**: Check the wiki for detailed guides
- **Community**: Join discussions in GitHub Discussions

### Installation Troubleshooting

**Node.js version issues:**

- Ensure you have Node.js 18+ installed: `node --version`
- Update Node.js if needed: [nodejs.org/download](https://nodejs.org/download)
- Consider using [nvm](https://github.com/nvm-sh/nvm) for managing Node versions

**npm install fails:**

- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then run `npm install` again
- Ensure you have write permissions in the project directory
- Check for disk space issues

**Port already in use:**

- Default dev server runs on port 5173
- If occupied, Vite will automatically try the next available port
- Or manually specify: `npm run dev -- --port 3000`

**Build fails:**

- Ensure all dependencies are installed: `npm install`
- Check Node.js version compatibility (18+)
- Clear Vite cache: `rm -rf node_modules/.vite`
- Review error messages for missing dependencies

**TypeScript/JSConfig warnings:**

- These are typically non-blocking for JavaScript projects
- The `ignoreDeprecations: "6.0"` setting in configs silences baseUrl deprecation warnings
- The project uses both TS and JS files for gradual type safety adoption

### Common Runtime Issues

- **Browser Issues**: Use a modern browser with JavaScript and WebGL enabled
- **Performance**: For large datasets, consider:
  - Reducing animation speed
  - Closing other browser tabs
  - Using hardware acceleration
  - Increasing browser memory limits
- **File Upload**: Ensure files are in supported formats (Newick, FASTA, JSON)
- **Visualization not loading**: Check browser console for errors, ensure WebGL is supported

### System Requirements

- **RAM**: 4GB minimum, 8GB recommended for large datasets
- **Storage**: 1GB free space for installation and temporary files
- **Network**: Internet connection required for initial npm install
- **Graphics**: WebGL-capable GPU recommended for optimal performance
---
