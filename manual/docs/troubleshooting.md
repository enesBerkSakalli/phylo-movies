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

Use the desktop app, Docker, or source checkout when you need full processing.

## Export Controls Are Disabled

PNG and WebM controls are disabled until a dataset is loaded and the tree canvas is available. Wait for rendering to finish, then try again.

## Timeline Metrics Are Missing

Some inspector metrics depend on the processed result. If RF values, scale values, or MSA windows are unavailable, the source dataset or backend result did not include those fields.
