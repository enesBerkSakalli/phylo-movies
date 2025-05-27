# --------------------------------------------------------------
#  routes.py
# --------------------------------------------------------------
from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import Dict

from flask import Blueprint, current_app, jsonify, request, send_from_directory

from .tree_processing import handle_uploaded_file
from .tree_processing import infer_window_parameters
from .tree_processing import get_alignment_length

MSA_UPLOAD_DIR = Path(__file__).resolve().parent / "msa_uploads"
MSA_UPLOAD_DIR.mkdir(exist_ok=True)
# Global variable to store the last uploaded MSA content (for demo/dev)
LAST_MSA_CONTENT = None

bp = Blueprint("main", __name__)


@bp.route("/about")
def about() -> Dict[str, str]:
    """Simple health‑check / about endpoint."""
    return jsonify(
        {"about": "Phylo‑Movies API backend. See the Vue/React front‑end for the UI."}
    )


# ----------------------------------------------------------------------
# MSA fetch endpoint
# ----------------------------------------------------------------------
@bp.route("/msa", methods=["GET"])
def get_msa():
    msa_id = request.args.get("msa_id")
    if msa_id:
        msa_path = MSA_UPLOAD_DIR / f"{msa_id}.msa"
        if msa_path.exists():
            content = msa_path.read_text(encoding="utf-8")
            return jsonify({"filename": f"{msa_id}.msa", "content": content})
        else:
            return jsonify({"error": "MSA file not found."}), 404
    # fallback to LAST_MSA_CONTENT for dev
    global LAST_MSA_CONTENT
    if LAST_MSA_CONTENT is None:
        return jsonify({"error": "No MSA file uploaded yet."}), 404
    return jsonify(LAST_MSA_CONTENT)


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
def treedata():
    try:
        global LAST_MSA_CONTENT
        log = current_app.logger

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

        # Handle MSA file if present
        msa_file = request.files.get("msaFile")
        msa_content = None
        msa_id = None
        if msa_file and msa_file.filename != "":
            msa_file.seek(0, os.SEEK_END)
            if msa_file.tell() == 0:
                log.warning("[treedata] MSA file is empty")
                msa_content = None
                msa_id = None
            else:
                msa_file.seek(0)
                msa_content = msa_file.read().decode("utf-8", errors="replace")
                # Save to disk with a unique ID
                msa_id = str(uuid.uuid4())
                msa_path = MSA_UPLOAD_DIR / f"{msa_id}.msa"
                msa_path.write_text(msa_content, encoding="utf-8")
                log.info(f"[treedata] MSA file saved with ID: {msa_id}")
                # Always update LAST_MSA_CONTENT with new upload
                LAST_MSA_CONTENT = {
                    "filename": msa_file.filename,
                    "content": msa_content,
                    "msa_id": msa_id,
                }
        else:
            log.info("[treedata] No MSA file provided")
            # Don't reset LAST_MSA_CONTENT to None if no file provided
            # Only reset if explicitly empty

        # Pass the rooting parameter and MSA content to handle_uploaded_file
        payload = handle_uploaded_file(
            tree_file,
            msa_content=msa_content if LAST_MSA_CONTENT else None,
            enable_rooting=enable_rooting,
        )

        # Infer window parameters if we have both trees and MSA data
        inferred_window_size = None
        inferred_step_size = None
        is_overlapping = None

        # Get tree count from payload
        tree_list = payload.get("tree_list", [])
        num_trees = len(tree_list) // 5  # Every 5th tree is a full tree
        num_trees = max(1, num_trees)  # Ensure at least 1

        log.info(f"[treedata] Processing {num_trees} full trees")

        # Get alignment length from MSA if available
        alignment_length = None
        if LAST_MSA_CONTENT and "content" in LAST_MSA_CONTENT:
            alignment_length = get_alignment_length(LAST_MSA_CONTENT["content"])
            if alignment_length:
                log.info(f"[treedata] MSA alignment length: {alignment_length}")

                # Infer window parameters

                params = infer_window_parameters(num_trees, alignment_length)
                inferred_window_size = params.window_size
                inferred_step_size = params.step_size
                is_overlapping = params.is_overlapping

                log.info(
                    f"[treedata] Inferred window parameters: size={inferred_window_size}, "
                    f"step={inferred_step_size}, overlapping={is_overlapping}"
                )

        # Ensure inferred window parameters are always set (never None)
        if inferred_window_size is None:
            inferred_window_size = window_size
        if inferred_step_size is None:
            inferred_step_size = window_step
        if is_overlapping is None:
            is_overlapping = False

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
            return _fail(500, "Internal error – backend returned incomplete data."), 500

        # Always provide 'weighted_robinson_foulds_distance_list' for frontend compatibility
        if "weighted_robinson_foulds_distance_list" not in payload:
            payload["weighted_robinson_foulds_distance_list"] = payload.get(
                "weighted_rfd_list", []
            )
        # Success -------------------------------------------------------------
        response_data = {
            **payload,
            "window_size": window_size,
            "window_step_size": window_step,
            "inferred_window_size": inferred_window_size,
            "inferred_step_size": inferred_step_size,
            "windows_are_overlapping": is_overlapping,
            "alignment_length": alignment_length,
            "enable_rooting": enable_rooting,
        }
        if msa_id:
            response_data["msa_id"] = msa_id
        return jsonify(response_data)
    except Exception as e:
        current_app.logger.error("[treedata] Exception: %s", str(e))
        raise e  # noqa: R0801 (raise after return is not a good idea, but this is a test helper)


# ----------------------------------------------------------------------
# Diagnostic helpers
# ----------------------------------------------------------------------
@bp.route("/cause-error")
def cause_error():  # noqa: D401 – test helper does not need docstring galore
    raise Exception("Intentional test error – handled by global error handler")


@bp.errorhandler(Exception)
def global_error(exc):  # Flask passes the exception instance in
    current_app.logger.error("[global] Unhandled exception", exc_info=True)
    return _fail(500, str(exc)), 500


# ----------------------------------------------------------------------
# Utility: short error JSON helper
# ----------------------------------------------------------------------
def _fail(status_code: int, message: str):
    return {
        "error": message,
        "status": status_code,
    }