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
from .tree_processing import handle_uploaded_file
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
        msa_file = request.files.get("msaFile")
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

        # Pass the rooting parameter and MSA content to handle_uploaded_file
        payload: Dict[str, Any] = handle_uploaded_file(
            tree_file,
            msa_content=msa_content,
            enable_rooting=enable_rooting,
            enable_embedding=enable_embedding,
            window_size=window_size,
            window_step=window_step,
        )
        # Success -------------------------------------------------------------
        response_data: Dict[str, Any] = {
            **payload,
            "window_size": window_size,
            "window_step_size": window_step,
            "enable_rooting": enable_rooting,
            "enable_embedding": enable_embedding,
        }

        # Always ensure tree_names is present in the response
        response_data["tree_names"] = payload.get("tree_names", [])

        log.info(
            f"[treedata] Sending tree_names in response: {response_data['tree_names']}"
        )

        return Response(
            json.dumps(response_data, cls=UUIDEncoder), mimetype="application/json"
        )
    except Exception as e:
        current_app.logger.error("[treedata] Exception: %s", str(e))
        return _fail(500, str(e)), 500


# ----------------------------------------------------------------------
# MSA data endpoint
# ----------------------------------------------------------------------
@bp.route("/msa")
def get_msa() -> Union[Response, Tuple[dict[str, Any], int]]:
    """Retrieve MSA data by ID."""
    try:
        msa_id = request.args.get("msa_id")
        if not msa_id:
            return _fail(400, "Missing required parameter 'msa_id'."), 400

        # For now, return a simple response indicating MSA endpoint exists
        # TODO: Implement actual MSA storage and retrieval logic
        # This might involve storing MSA content in a database or file system
        # and retrieving it by the provided msa_id

        current_app.logger.info(f"[get_msa] MSA data requested for ID: {msa_id}")

        # Placeholder response - you'll need to implement actual storage/retrieval
        return _fail(404, f"MSA data not found for ID: {msa_id}"), 404

    except Exception as e:
        current_app.logger.error("[get_msa] Exception: %s", str(e))
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
