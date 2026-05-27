# Dependency Structure

This repository has multiple runnable layers. Each layer may have its own
dependency files, but each layer should have one authoritative entry point.

## Active Dependency Layers

| Layer                              | Canonical dependency files                                                                  | Purpose                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Web frontend                       | `package.json`, `package-lock.json`                                                         | React/Vite app, frontend tests, browser build.                                   |
| Desktop app                        | `electron-app/package.json`, `electron-app/package-lock.json`                               | Electron wrapper and desktop packaging.                                          |
| BranchArchitect backend            | `engine/BranchArchitect/pyproject.toml`, `engine/BranchArchitect/poetry.lock`               | Python backend used by local, Docker, and Electron workflows.                    |
| BranchArchitect MSA helper package | `engine/BranchArchitect/msa_to_trees/pyproject.toml`                                        | Python package metadata for the MSA-to-tree helper module.                       |
| BranchArchitect webapp package     | `engine/BranchArchitect/webapp/pyproject.toml`, `engine/BranchArchitect/webapp/poetry.lock` | Python webapp package metadata when maintained separately from the backend root. |
| Publication analysis               | `publication_data/environment.yml`                                                          | Reproducible conda environment for publication-data scripts.                     |
| Container runtime                  | `Dockerfile`, `docker-compose.yml`                                                          | Full-stack deployment/runtime image.                                             |

## Secondary Files

| File                                                                                             | Status                            | Rule                                              |
| ------------------------------------------------------------------------------------------------ | --------------------------------- | ------------------------------------------------- |
| `publication_data/recombination_norovirus/scripts/recan_recombination_analysis/requirements.txt` | Narrow ReCAN Python package list. | Secondary to `publication_data/environment.yml`.  |
| Former EPAS1 `env.yml` and `Makefile`                                                            | Removed exploratory files.        | Keep out of the publication-data release archive. |

Removed duplicate:

- `engine/BranchArchitect/requirements.txt` was removed because no active
  install/build path referenced it. Use `engine/BranchArchitect/pyproject.toml`
  and `engine/BranchArchitect/poetry.lock` for backend dependency resolution.

## Guidelines

1. Keep lockfiles next to their package manifests.
2. Do not add a second dependency manager to a layer unless it is generated from
   the canonical one.
3. Do not make publication-data scripts depend on Electron, frontend, or
   BranchArchitect package installs.
4. Do not make Electron use publication-analysis environments. Electron should
   depend on the frontend build plus the BranchArchitect backend bundle.
5. Generated dependency folders such as `node_modules/`, `.venv/`, `.venv-build/`,
   `dist/`, `build/`, and Electron release artifacts are not source-of-truth
   dependency files.
6. If a secondary dependency file is kept, say which canonical file produces or
   supersedes it.
