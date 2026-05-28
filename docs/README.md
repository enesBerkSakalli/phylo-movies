# Documentation Index

[Back to README](../README.md)

These docs are the canonical documentation for the combined Phylo-Movies web tool.

| Document                              | Use it for                                                         |
| ------------------------------------- | ------------------------------------------------------------------ |
| [Getting started](getting-started.md) | Installing, starting, and completing the first successful run.     |
| [Usage](usage.md)                     | Input/output contracts and common user workflows.                  |
| [Web interface](web-interface.md)     | Setup screen and visualization workspace map.                      |
| [Configuration](configuration.md)     | Environment variables, ports, and runtime defaults.                |
| [API](api.md)                         | Flask endpoints, upload fields, and SSE stream contract.           |
| [Examples](examples.md)               | Built-in example datasets and how they map to `publication_data/`. |
| [Development](development.md)         | Architecture, data flow, test ownership, and feature locations.    |
| [Deployment](deployment.md)           | Static, GitHub Pages, Docker, and Electron deployment paths.       |
| [Troubleshooting](troubleshooting.md) | Symptom-based debugging entries.                                   |

Specialized folders keep local details close to their source:

- [Electron desktop app](../electron-app/README.md)
- [BranchArchitect backend](../engine/BranchArchitect/README.md)
- [Publication data](../publication_data/README.md)
- [Frontend tests](../test/README.md)
