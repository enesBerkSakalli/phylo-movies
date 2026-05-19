# Phylo-Movies Brand Assets

This directory contains the canonical Phylo-Movies logo mark.

## Source Of Truth

- `phylo-movies-mark.svg` is the editable source asset.
- Generated web and desktop icon files must not be edited by hand.

## Generated Outputs

Run this from the repository root:

```sh
npm run generate:brand
```

The generator writes:

- `src/public/icons/phylo-tree-icon.svg`
- `src/public/icons/favicon-16.png`
- `src/public/icons/favicon-32.png`
- `src/public/icons/apple-touch-icon.png`
- `src/public/icons/icon-192.png`
- `src/public/icons/icon-512.png`
- `electron-app/build/icon.png`
- `electron-app/build/icon_16.png`
- `electron-app/build/icon.iconset/*.png`
- `electron-app/build/icon.icns`
- `electron-app/build/icon.ico`

Run this to verify the generated files:

```sh
npm run check:brand
```

## Usage Rules

- Use the SVG for in-app UI and web favicon references.
- Use generated PNG, ICO, and ICNS files for browser install metadata and
  desktop packaging.
- If the mark changes, update only `phylo-movies-mark.svg`, then regenerate and
  commit the generated outputs together.
