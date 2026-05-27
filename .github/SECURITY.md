# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.92.x  | :white_check_mark: |
| 0.91.x  | :white_check_mark: |
| < 0.64  | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Phylo-Movies, please report it privately rather than opening a public issue.

**Contact:** [enes.sakalli@univie.ac.at](mailto:enes.sakalli@univie.ac.at)

Please include:

- A description of the vulnerability
- Steps to reproduce
- Affected versions
- Any potential mitigations you've identified

We aim to respond within 5 business days.

### Electron Security

Phylo-Movies Desktop uses Electron with the following security defaults:

- `contextIsolation: true` on all windows
- `nodeIntegration: false` on all windows
- `sandbox: true` on all windows
- Preload scripts use `contextBridge` with minimal IPC surface
- Auto-updates via `electron-updater` with signature verification

If you find issues in these areas, please report them immediately.

## Supply Chain

- Dependencies are pinned via `package-lock.json` (lockfile v3)
- Python dependencies are pinned via `poetry.lock`
- Dependency vulnerability reviews are handled before release; add explicit CI
  audit jobs before claiming every PR is automatically audited.
- Release builds are performed in CI with isolated environments
