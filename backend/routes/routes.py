# --------------------------------------------------------------
#  routes.py
# --------------------------------------------------------------
from __future__ import annotations

from logging import Logger
import os
import json
from pathlib import Path
from typing import Dict, Any
from flask import Response
from flask import Blueprint, current_app, jsonify, request, send_from_directory
from brancharchitect.io import UUIDEncoder
from werkzeug.datastructures.file_storage import FileStorage
from services.core import handle_uploaded_file
from typing import Union, Tuple

bp = Blueprint("main", __name__)


@bp.route("/about")
def about() -> Response:
    """Simple health-check / about endpoint."""
    return jsonify(
        {"about": "Phylo-Movies API backend. See the Vue/React front-end for the UI."}
    )


# ----------------------------------------------------------------------
# Static assets – works both during *vite dev* and after production build
# ----------------------------------------------------------------------
@bp.route("/static/<path:filename>")
def vite_static(filename: str):  # noqa: D401  (simple function suffices)
    dist_path = Path(__file__).resolve().parent.parent / "dist"
    static_fallback = Path(__file__).resolve().parent / "static"

    # Prefer production build artefacts if present (``npm run build``)
    if (dist_path / filename).exists():
        return send_from_directory(dist_path, filename)
    return send_from_directory(static_fallback, filename)


@bp.route("/favicon.ico")
def favicon():
    """Serve the favicon to silence 404s in browsers."""
    return send_from_directory(
        Path(__file__).resolve().parent / "static",
        "favicon.ico",
        mimetype="image/vnd.microsoft.icon",
    )


# ----------------------------------------------------------------------
# Main business endpoint – tree upload & analysis
# ----------------------------------------------------------------------


@bp.route("/treedata", methods=["POST"])
def treedata() -> Union[Response, Tuple[dict[str, Any], int]]:
    try:
        log: Logger = current_app.logger

        log.info("[treedata] POST /treedata from %s", request.remote_addr)
        tree_file = request.files.get("treeFile")
        if not tree_file or tree_file.filename == "":
            return _fail(400, "Missing required file 'treeFile'."), 400

        # Small sanity‑check against empty uploads (common drag‑and‑drop issue)
        tree_file.seek(0, os.SEEK_END)
        if tree_file.tell() == 0:
            return _fail(400, "Uploaded file 'treeFile' is empty."), 400
        tree_file.seek(0)

        window_size = int(request.form.get("windowSize", 1))
        window_step = int(request.form.get("windowStepSize", 1))

        # Get the rooting parameter from the form
        enable_rooting = request.form.get("midpointRooting", "") == "on"
        log.info(f"[treedata] Midpoint rooting: {enable_rooting}")

        # Get the embedding parameter from the form
        enable_embedding = request.form.get("deactivateEmbedding", "") != "on"
        log.info(f"[treedata] Enable embedding: {enable_embedding}")

        # Simple MSA handling - just get content if provided
        msa_content = None
        msa_file: FileStorage | None = request.files.get("msaFile")
        if (
            msa_file
            and msa_file.filename
            and hasattr(msa_file, "content_length")
            and msa_file.content_length > 0
        ):
            msa_content = msa_file.read().decode("utf-8", errors="replace")
            log.info(f"[treedata] MSA file provided: {msa_file.filename}")
        else:
            log.info("[treedata] No MSA file provided")

        # Process the uploaded file and get structured response
        response_data: Dict[str, Any] = handle_uploaded_file(
            tree_file,
            msa_content=msa_content,
            enable_rooting=enable_rooting,
            window_size=window_size,
            window_step=window_step,
        )

        log.info(
            f"[treedata] Processed {len(response_data.get('trees', {}).get('tree_names', []))} trees"
        )

        return Response(
            json.dumps(response_data, cls=UUIDEncoder), mimetype="application/json"
        )
    except Exception as e:
        import traceback
        current_app.logger.error("[treedata] Exception: %s", str(e))
        current_app.logger.error("[treedata] Full traceback: %s", traceback.format_exc())
        return _fail(500, str(e)), 500




# ----------------------------------------------------------------------
# Diagnostic helpers
# ----------------------------------------------------------------------
@bp.route("/cause-error")
def cause_error():  # noqa: D401 – test helper does not need docstring galore
    raise Exception("Intentional test error - handled by global error handler")


@bp.errorhandler(Exception)
def global_error(exc: Exception):  # Flask passes the exception instance in
    current_app.logger.error("[global] Unhandled exception", exc_info=True)
    return _fail(500, str(exc)), 500


# ----------------------------------------------------------------------
# Utility: short error JSON helper
# ----------------------------------------------------------------------
def _fail(status_code: int, message: str) -> dict[str, Any]:
    return {
        "error": message,
        "status": status_code,
    }
