# API

[Back to README](../README.md)

The BranchArchitect backend is a Flask app in `engine/BranchArchitect/webapp/`. In local development it listens on `http://127.0.0.1:5002/`. The Vite frontend proxies API paths to this backend.

## Endpoints

| Method | Path                            | Purpose                                                                                   |
| ------ | ------------------------------- | ----------------------------------------------------------------------------------------- |
| `GET`  | `/`                             | Small backend landing page for direct browser visits.                                     |
| `GET`  | `/health`                       | Readiness endpoint used before enabling backend-dependent frontend actions.                |
| `GET`  | `/about`                        | Informational JSON endpoint.                                                              |
| `POST` | `/treedata/stream`              | Starts tree or MSA processing and returns a progress channel id.                          |
| `GET`  | `/stream/progress/<channel_id>` | Server-sent events stream for processing progress, metadata, tree chunks, and completion. |
| `GET`  | `/favicon.ico`                  | Backend favicon route.                                                                    |

## Health Check

```bash
curl http://127.0.0.1:5002/health
```

Current response shape:

```json
{
  "service": "brancharchitect",
  "status": "ready",
  "ready": true,
  "version": "0.64.0",
  "capabilities": [
    "tree-stream-upload",
    "sse-progress-stream",
    "msa-tree-inference",
    "tree-interpolation"
  ],
  "routes": {
    "health": "/health",
    "tree_stream": "/treedata/stream",
    "progress_stream": "/stream/progress/<channel_id>"
  }
}
```

## Start Processing

```bash
curl -X POST http://127.0.0.1:5002/treedata/stream \
  -F "treeFile=@publication_data/figure_example/paper_example.tree" \
  -F "windowSize=1" \
  -F "windowStepSize=1" \
  -F "midpointRooting="
```

Response:

```json
{
  "channel_id": "<generated-channel-id>"
}
```

At least one of `treeFile` or `msaFile` is required.

## Form Fields

| Field                    | Type             | Required                       | Backend default | Validation                                        |
| ------------------------ | ---------------- | ------------------------------ | --------------- | ------------------------------------------------- |
| `treeFile`               | file             | required if `msaFile` missing  | none            | Must be non-empty when present.                   |
| `msaFile`                | file             | required if `treeFile` missing | none            | Empty MSA-only uploads are rejected.              |
| `windowSize`             | positive integer | no                             | `1`             | Must be positive.                                 |
| `windowStepSize`         | positive integer | no                             | `1`             | Must be positive.                                 |
| `midpointRooting`        | checkbox string  | no                             | off             | `on` enables rooting.                             |
| `treeInferenceEngine`    | string           | no                             | `iqtree`        | Must be `iqtree` or `fasttree`.                   |
| `iqtreeFastSearch`       | checkbox string  | no                             | on              | `on` enables IQ-TREE fast search.                 |
| `iqtreeSupportMode`      | string           | no                             | `none`          | `none`, `ufboot`, `sh_alrt`, or `sh_alrt_ufboot`. |
| `iqtreeUfbootReplicates` | integer          | no                             | `1000`          | 1000 to 100000.                                   |
| `iqtreeShAlrtReplicates` | integer          | no                             | `1000`          | 100 to 100000.                                    |
| `iqtreeBnni`             | checkbox string  | no                             | off             | `on` enables BNNI.                                |
| `useGtr`                 | checkbox string  | no                             | on              | `on` enables GTR.                                 |
| `useGamma`               | checkbox string  | no                             | on              | `on` enables gamma rate heterogeneity.            |
| `usePseudo`              | checkbox string  | no                             | off             | `on` enables pseudocounts.                        |
| `noMl`                   | checkbox string  | no                             | on              | `on` disables ML NNI updates in FastTree config.  |

## Progress Stream

Connect after receiving `channel_id`:

```bash
curl -N http://127.0.0.1:5002/stream/progress/<channel_id>
```

SSE event types used by the frontend:

| Event         | Meaning                                                                         |
| ------------- | ------------------------------------------------------------------------------- |
| `progress`    | Percent/message progress update.                                                |
| `log`         | Backend warning/error log message.                                              |
| `metadata`    | Movie metadata before tree chunks.                                              |
| `trees_chunk` | A chunk of serialized tree frames with `start_index`, `end_index`, and `total`. |
| `complete`    | Final result or error marker.                                                   |
| `error`       | Stream/channel error.                                                           |

The frontend expects metadata first, then zero or more `trees_chunk` events, then `complete`.
