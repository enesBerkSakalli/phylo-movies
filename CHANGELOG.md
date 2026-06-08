# Changelog

All notable changes to Phylo-Movies are documented in this file.

## [0.98.0] — Unreleased (dev)

### Added

- Wiki lint tooling (markdownlint, lychee link checking)
- Revised reviewer response documentation and citation metadata
- Reworked analysis tools and movement ledger UI
- Improved tree scaling and viewport readability
- Simplified workspace startup UI

### Fixed

- Stabilized animation render progress
- Centralized tree highlight role resolution
- Warn when backend is unavailable in dev

### Changed

- Refreshed bootstrap support example data
- Refreshed ostrich fixture for mover sequencing

## [0.91.0] — 2026-02-09

### Added

- Normalized angular velocity across deck.gl interpolation
- Streamlined upload flows and normalized shadcn surfaces
- Publication-focused landing page SEO
- GitHub Pages information site with docs-only deployment
- Preprint citation metadata (CITATION.cff)

### Fixed

- Aligned subtree analytics and stale fixtures
- Hardened movie processing workflow
- Silenced loaders.gl browser build warning
- Ad-hoc macOS code signing to prevent "damaged" error on launch

### Changed

- Migrated phylo store and timeline lifecycle
- Refactored legacy CSS assets (removed unused files)
- Narrowed editor project file globs
- GitHub Pages now a documentation-only site (no backend)

### CI/CD

- Added desktop smoke build job to CI
- Auto-sync version from git tag in release workflow
- Added GitHub Pages deploy step with SPA fallback

## [0.64.0] — 2026-02-07

### Added

- Electron desktop app with splash screen
- BranchArchitect backend bundled via PyInstaller
- Auto-update support via electron-updater
- Cross-platform installers: macOS (ARM64/x64 DMG), Windows (NSIS), Linux (AppImage)
- MSA alignment viewer with bidirectional highlighting
- Side-by-side tree comparison view
- Taxa color presets and subtree highlighting
- Session recording and SVG/PNG/WebM export
- Timeline navigation with linked charts
- Scatter plot analysis for tree relationships

### Infrastructure

- Git submodule for BranchArchitect engine
- Docker containerized deployment (full stack)
- GitHub Actions CI: tests, build, integration, release
- npm-based frontend toolchain with Vite

## [0.37.0] and earlier

Earlier releases focused on core phylogenetics pipeline development:

- SPR-based tree interpolation engine (BranchArchitect)
- Robinson-Foulds distance computation
- Sliding-window MSA-to-tree pipeline (FastTree 2)
- WebGL tree rendering via deck.gl
- Bootstrap rogue taxa analysis
- Norovirus recombination case study data
