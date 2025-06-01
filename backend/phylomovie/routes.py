from __future__ import annotations

import os
import json
from pathlib import Path
from typing import Dict, Any, Union, Tuple, Optional
from flask import Response
from flask import Blueprint, current_app, jsonify, request, send_from_directory
from werkzeug.datastructures import FileStorage
try:
    from brancharchitect.io import UUIDEncoder
except ModuleNotFoundError:
    UUIDEncoder = None # Placeholder if brancharchitect is not installed
from .tree_processing.types import PhyloMovieData # Explicit import
from .tree_processing import handle_uploaded_file


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
def vite_static(filename: str) -> Response:
    """
    Serve static files from the production build 'dist' directory if they exist,
    otherwise fall back to the development 'static' directory.
    This allows serving assets correctly in both development and production.

    Args:
        filename: The name of the static file to serve.

    Returns:
        A Flask Response object containing the static file.
    """
    dist_path = Path(__file__).resolve().parent.parent / "dist"
    static_fallback = Path(__file__).resolve().parent / "static"

    # Prefer production build artefacts if present (``npm run build``)
    if (dist_path / filename).exists():
        return send_from_directory(dist_path, filename)
    return send_from_directory(static_fallback, filename)


@bp.route("/favicon.ico")
def favicon() -> Response:
    """
    Serve the favicon.ico to prevent 404 errors in browser requests.

    Returns:
        A Flask Response object containing the favicon.
    """
    static_dir = Path(__file__).resolve().parent / "static"
    return send_from_directory(
        static_dir,
        "favicon.ico",
        mimetype="image/vnd.microsoft.icon",
    )


# ----------------------------------------------------------------------
# Main business endpoint – tree upload & analysis
# ----------------------------------------------------------------------
@bp.route("/treedata", methods=["POST"])
def treedata() -> Union[Response, Tuple[Dict[str, Any], int]]:
    """
    Handle tree data uploads, process them, and return visualization data.

    Expects a POST request with 'multipart/form-data'.

    Request Form Data:
        treeFile (FileStorage): The Newick tree file. Required.
        msaFile (FileStorage, optional): MSA file for window parameter inference.
        windowSize (int, optional): Window size for tree processing. Defaults to 1.
        windowStepSize (int, optional): Window step size for tree processing. Defaults to 1.
        midpointRooting (str, optional): "on" if midpoint rooting should be enabled.
        deactivateEmbedding (str, optional): "on" if UMAP embedding should be deactivated.

    Returns:
        Response: JSON response containing processed PhyloMovieData on success (200),
                  or a JSON error object on failure (400 or 500).
    """
    try:
        log = current_app.logger

        log.info("[treedata] POST /treedata from %s", request.remote_addr)
        tree_file: Optional[FileStorage] = request.files.get("treeFile")
        if not tree_file or not tree_file.filename:
            return _fail(400, "Missing required file 'treeFile'."), 400

        # Small sanity‑check against empty uploads (common drag‑and‑drop issue)
        tree_file.seek(0, os.SEEK_END)
        if tree_file.tell() == 0:
            tree_file.seek(0) # Reset cursor before returning
            return _fail(400, "Uploaded file 'treeFile' is empty."), 400
        tree_file.seek(0)

        # Form parameters
        window_size = int(request.form.get("windowSize", 1))
        window_step = int(request.form.get("windowStepSize", 1))
        enable_rooting: bool = request.form.get("midpointRooting", "") == "on"
        enable_embedding: bool = request.form.get("deactivateEmbedding", "") != "on"

        log.info(f"[treedata] Midpoint rooting: {enable_rooting}")
        log.info(f"[treedata] Enable embedding: {enable_embedding}")

        # Simple MSA handling - just get content if provided
        msa_content: Optional[str] = None
        msa_file: Optional[FileStorage] = request.files.get("msaFile")
        if msa_file and msa_file.filename:
            # Check content_length if available and > 0.
            # FileStorage objects from Flask should have content_length.
            if msa_file.content_length and msa_file.content_length > 0:
                msa_content_bytes = msa_file.read()
                msa_content = msa_content_bytes.decode("utf-8", errors="replace")
                log.info(f"[treedata] MSA file provided: {msa_file.filename}, length: {len(msa_content_bytes)}")
            else:
                log.info(f"[treedata] MSA file {msa_file.filename} has no content or content_length is 0.")
        else:
            log.info("[treedata] No MSA file or filename provided.")

        # Process the uploaded tree file and optional MSA data
        payload: PhyloMovieData = handle_uploaded_file(
            tree_file,
            msa_content=msa_content,
            enable_rooting=enable_rooting,
            enable_embedding=enable_embedding,
            window_size=window_size,
            window_step=window_step,
        )

        # Accept either 'weighted_robinson_foulds_distance_list' or 'weighted_rfd_list' for compatibility
        required = [
            "tree_list",
            "rfd_list",
            "to_be_highlighted",
            "sorted_leaves",
            "file_name",
            "embedding",
        ]

        has_weighted = (
            "weighted_robinson_foulds_distance_list" in payload
            or "weighted_rfd_list" in payload
        )

        if not all(key in payload for key in required) or not has_weighted:
            return _fail(500, "Internal error - backend returned incomplete data."), 500

        # Always provide 'weighted_robinson_foulds_distance_list' for frontend compatibility
        if "weighted_robinson_foulds_distance_list" not in payload:
            payload["weighted_robinson_foulds_distance_list"] = payload.get(
                "weighted_rfd_list", []
            )
        # Success -------------------------------------------------------------
        # Augment payload with some of the request parameters for frontend context if needed
        response_data: Dict[str, Any] = {
            **payload,
            "window_size": window_size, # User-provided or default
            "window_step_size": window_step, # User-provided or default
            "enable_rooting": enable_rooting, # User-provided or default
            "enable_embedding": enable_embedding, # User-provided or default
        }

        # Ensure UUIDEncoder is available if used, otherwise this will fail
        if UUIDEncoder is None and any(isinstance(v, Path) for v in response_data.values()): # Path objects might need UUIDEncoder
             current_app.logger.warning("brancharchitect.io.UUIDEncoder not found, JSON serialization of Path objects might fail.")

        return Response(
            json.dumps(response_data, cls=UUIDEncoder if UUIDEncoder else None), mimetype="application/json"
        )
    except Exception as e:
        current_app.logger.error("[treedata] Exception: %s", str(e))
        return _fail(500, str(e)), 500


# ----------------------------------------------------------------------
# Diagnostic helpers
# ----------------------------------------------------------------------
@bp.route("/cause-error")
def cause_error():  # noqa: D401 – test helper does not need docstring galore
    raise Exception("Intentional test error - handled by global error handler")


@bp.errorhandler(Exception)
def global_error(exc: Exception) -> Tuple[Dict[str, Any], int]:
    """
    Global error handler for the Flask application.
    Logs the exception and returns a generic error message to the client.

    Args:
        exc: The unhandled exception instance.

    Returns:
        A tuple containing a dictionary with the error details and the HTTP status code 500.
    """
    current_app.logger.error("[global] Unhandled exception: %s", str(exc), exc_info=True)
    # It's often better to return a generic message for unexpected errors
    response = jsonify(_fail(500, "An unexpected server error occurred. Please try again later."))
    response.status_code = 500
    return response


# ----------------------------------------------------------------------
# Utility: short error JSON helper
# ----------------------------------------------------------------------
def _fail(status_code: int, message: str) -> Dict[str, Any]:
    """
    Creates a standardized dictionary for JSON error responses.

    Args:
        status_code: The HTTP status code for the error.
        message: A descriptive error message for the client.

    Returns:
        A dictionary containing the error message and status code.
    """
    return {
        "error": message,
        "status": status_code,
    }
