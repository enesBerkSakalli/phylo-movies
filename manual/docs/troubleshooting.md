---
title: Troubleshooting
---

# Troubleshooting

## Backend Offline

If the setup screen reports that BranchArchitect is offline, uploads and backend-driven examples will not run. Start the backend with:

```bash
./start.sh
```

or use the generated browser demo for precomputed examples.

## Browser Demo Cannot Process Uploads

GitHub Pages is static. It can open generated demo data, but it cannot process new uploads or run MSA tree inference.

Use the source checkout or Docker when you need full processing. The desktop app is an optional convenience build; on macOS, prefer source or Docker because the desktop artifact is unsigned.

## Failed to Fetch on GitHub Pages

Likely cause: a backend-dependent action was attempted on the public GitHub Pages site. The browser demo can open generated movie payloads, but it cannot run BranchArchitect, IQ-TREE, FastTree, SPR interpolation, uploaded datasets, or MSA tree inference.

Fix: open a generated example from the browser demo, or run the full stack locally:

```bash
./start.sh
```

or:

```bash
docker compose up --build
```

## macOS Says the App Is Damaged

Likely cause: the downloaded desktop app is an unsigned convenience build and macOS Gatekeeper quarantined it. The project does not currently notarize macOS artifacts because notarization requires a paid Apple Developer ID.

Recommended reviewer fix: use the source checkout or Docker workflow instead of the unsigned desktop artifact:

```bash
./start.sh
```

or:

```bash
docker compose up --build
```

If you still want to use the unsigned desktop artifact, first confirm that it came from the project GitHub Releases page and that you trust that artifact. Move it to `/Applications`, then check whether quarantine metadata is present:

```bash
xattr -l "/Applications/Phylo-Movies.app"
```

To clear quarantine for that trusted release artifact:

```bash
xattr -dr com.apple.quarantine "/Applications/Phylo-Movies.app"
```

Do not use this workaround for artifacts downloaded from any location other than the project release page.

## Export Controls Are Disabled

PNG and WebM controls are disabled until a dataset is loaded and the tree canvas is available. Wait for rendering to finish, then try again.

## Timeline Metrics Are Missing

Some inspector metrics depend on the processed result. If RF values, scale values, or MSA windows are unavailable, the source dataset or backend result did not include those fields.
