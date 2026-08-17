# Phylo-Movies Brand Assets

This directory contains the canonical Phylo-Movies logo mark and the repository
social preview image.

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

## Social Preview

`phylo-movies-social-preview.png` is the image GitHub shows when the repository
URL is shared. It is 1280x640 (GitHub's recommended size) and 625 KB, under the
1 MB upload limit that rejects the full-size screenshot.

It is derived from `src/public/og/phylo-movies-preview.png` (3456x1992):

```sh
magick src/public/og/phylo-movies-preview.png \
  -resize 1280x -gravity north -extent 1280x640 \
  -strip -define png:compression-level=9 \
  assets/brand/phylo-movies-social-preview.png
```

The crop is anchored north rather than centered so the application header stays
in frame and the bottom edge lands on the timeline legend instead of slicing a
label in half.

GitHub exposes no API for the social preview. Upload this file by hand under
repository Settings, General, Social preview.

## Usage Rules

- Use the SVG for in-app UI and web favicon references.
- Use generated PNG, ICO, and ICNS files for browser install metadata and
  desktop packaging.
- If the mark changes, update only `phylo-movies-mark.svg`, then regenerate and
  commit the generated outputs together.
