# Phylo-Movies Manual

This directory contains the Docusaurus source for the public researcher-facing manual.

## Commands

```bash
npm --prefix manual ci
npm run manual:dev
npm run manual:build
```

The root `npm run build:gh` command builds the Vite app, builds this manual, and copies `manual/build/` into `dist/manual/` for GitHub Pages.

## Source Layout

- `docs/` - manual pages shown in the Docusaurus sidebar.
- `static/img/screenshots/` - screenshots embedded in manual pages.
- `src/css/custom.css` - manual-specific styling.
- `docusaurus.config.js` and `sidebars.js` - manual routing and navigation.

Generated directories such as `build/`, `.docusaurus/`, and `node_modules/` are ignored.
