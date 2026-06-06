# Configuration

[Back to README](../README.md)

The app has a small set of verified environment variables. The template is [.env.example](../.env.example).

## Frontend

| Variable           | Used by                                     | Default         | Meaning                                                             |
| ------------------ | ------------------------------------------- | --------------- | ------------------------------------------------------------------- |
| `VITE_DOCS_ONLY`   | `src/Router.jsx`, `scripts/apply-gh-seo.js` | unset/false     | Builds the documentation-only GitHub Pages experience when `true`.  |
| `ELECTRON_BUILD`   | `vite.config.mts`, Electron build scripts   | unset/false     | Uses relative asset paths for Electron frontend builds when `true`. |
| `VITE_APP_VERSION` | `vite.config.mts` define and splash UI      | package version | Injected from `package.json`; normally not set manually.            |

Vite dev server defaults:

- Host: `127.0.0.1`
- Port: `5173`
- Strict port: enabled
- Proxies: `/treedata`, `/stream`, `/msa`, `/health`, and `/about` to `http://127.0.0.1:5002`
- Example files: served from `publication_data/` under `/examples/`

## Backend

| Variable             | Used by                 | Default                 | Meaning                                                               |
| -------------------- | ----------------------- | ----------------------- | --------------------------------------------------------------------- |
| `SECRET_KEY`         | Flask config            | random token at startup | Flask secret key.                                                     |
| `FLASK_DEBUG`        | Flask config            | `1`                     | Enables Flask debug mode when equal to `1`.                           |
| `CORS_ORIGINS`       | Flask config            | `*`                     | CORS origin setting.                                                  |
| `LOG_LEVEL`          | Flask logging config    | `INFO`                  | Backend logging level.                                                |
| `LOG_FORMAT`         | Flask logging config    | `text`                  | `text` or `json` backend log records.                                 |
| `LOG_ACCESS`         | Flask logging config    | `1`                     | Emits request access logs when truthy.                                |
| `LOG_HEALTHCHECKS`   | Flask logging config    | `0`                     | Includes `/about` and `/health` in access logs when truthy.           |
| `BACKEND_LOG_FILE`   | Flask logging config    | unset                   | Optional rotating backend log file path.                              |
| `LOG_FILE`           | Flask logging config    | unset                   | Fallback optional rotating backend log file path.                     |
| `IQTREE_PATH`        | `msa_to_trees` pipeline | unset                   | Explicit IQ-TREE executable path.                                     |
| `FASTTREE_PATH`      | `msa_to_trees` pipeline | unset                   | Explicit FastTree executable path.                                    |

Backend defaults:

- Local backend port: `5002`
- Upload limit: 100 MB
- Console logging is the primary backend sink for Docker and Electron launchers.
- `engine/BranchArchitect/start_movie_server.sh` redirects backend stdout/stderr to `engine/BranchArchitect/logs/backend.log`.
- Direct Python backend runs do not create a file log unless `BACKEND_LOG_FILE` or `LOG_FILE` is set. Frozen desktop bundles default to a user log directory.

## Docker

| Variable                      | Used by                    | Default                   | Meaning                                              |
| ----------------------------- | -------------------------- | ------------------------- | ---------------------------------------------------- |
| `PHYLOMOVIES_PUBLICATION_ENV` | publication Docker profile | `phylomovies-publication` | Names the publication-data regeneration environment. |

Docker ports:

- Full-stack container: `8080`
- Development backend profile: `5002`

## Current Limitation

The frontend does not currently expose a documented environment variable for changing the backend URL in normal browser mode. Browser development uses the Vite proxy. Electron gets the backend URL through `window.electronAPI.getBackendUrl()`.
