from typing import Dict, List, Optional, Any, Tuple
import logging
from logging.handlers import RotatingFileHandler
import os

from flask import Flask, send_from_directory
from flask import request, jsonify, current_app
from werkzeug.utils import secure_filename

import numpy as np
from sklearn.decomposition import PCA

from brancharchitect.io import serialize_tree_list_to_json, parse_newick
from brancharchitect.jumping_taxa.tree_interpolation import (
    interpolate_adjacent_tree_pairs,
)
from brancharchitect.distances import (
    calculate_along_trajectory,
    weighted_robinson_foulds_distance,
    relative_robinson_foulds_distance,
    calculate_matrix_distance,
)
from brancharchitect.tree import Node

# Configure application

app = Flask(__name__)
app.config["DEBUG"] = True
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # Set to 16MB
app.jinja_env.auto_reload = True  # Enable Jinja template auto-reload

# --- Logging setup ---
LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "debug_log.html")

# Rotating file handler: 1MB per file, keep 5 backups
file_handler = RotatingFileHandler(
    LOG_FILE, maxBytes=1_000_000, backupCount=5, encoding="utf-8"
)
file_handler.setLevel(logging.DEBUG)
file_formatter = logging.Formatter(
    "<pre>%(asctime)s [%(levelname)s] %(name)s: %(message)s</pre>", "%Y-%m-%d %H:%M:%S"
)
file_handler.setFormatter(file_formatter)
if not app.logger.handlers:
    app.logger.addHandler(file_handler)
else:
    # Avoid duplicate handlers
    for h in app.logger.handlers:
        if isinstance(h, RotatingFileHandler):
            break
    else:
        app.logger.addHandler(file_handler)
app.logger.setLevel(logging.DEBUG)

# Also log to console (for dev)
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_formatter = logging.Formatter(
    "%(asctime)s [%(levelname)s] %(name)s: %(message)s", "%H:%M:%S"
)
console_handler.setFormatter(console_formatter)
if not any(isinstance(h, logging.StreamHandler) for h in app.logger.handlers):
    app.logger.addHandler(console_handler)

# Optionally inject config into jinja globals for templates
app.jinja_env.globals.update(config=app.config)

# Initialize commit hash
try:
    with open("commithash", mode="r") as f:
        commit = f.read()
except FileNotFoundError:
    commit = "no"


# Type definitions for clarity
TreeList = List[Node]
TreeListDict = Dict[str, Any]
PhyloMovieData = Dict[str, Any]


@app.route("/about", methods=["GET"])
def about() -> str:
    """API endpoint for about page (returns JSON)."""
    return jsonify({"about": "Phylo-Movies API backend. See frontend for UI."})


@app.route("/favicon.ico")
def favicon() -> Any:
    """Serve the favicon to prevent 404 errors.

    Returns:
        Any: Flask response object with the favicon
    """
    return send_from_directory(
        os.path.join(app.root_path, "static"),
        "favicon.ico",
        mimetype="image/vnd.microsoft.icon",
    )


# --- Vite/Production static serving integration ---
@app.route("/static/<path:filename>")
def vite_static(filename):
    dist_path = os.path.join(os.path.dirname(__file__), "..", "dist")
    file_path = os.path.join(dist_path, filename)
    if os.path.exists(file_path):
        return send_from_directory(dist_path, filename)
    # fallback to legacy static folder if not found in dist
    static_path = os.path.join(os.path.dirname(__file__), "static")
    return send_from_directory(static_path, filename)


def handle_order_list(request) -> Optional[List[str]]:
    """Extract order list from uploaded file.

    Args:
        request: Flask request object containing the file

    Returns:
        Optional[List[str]]: List of taxa in order or None if no file
    """
    if request.files["orderFile"].filename == "":
        return None
    else:
        order_file = request.files["orderFile"]
        order_file_text = order_file.read().decode("utf-8")
        order_file_text = order_file_text.replace("\r", "").strip()
        order_file_list = order_file_text.split("\n")
        return order_file_list


def perform_pca(
    distance_matrix: np.ndarray,
    n_components: int = 3,
) -> np.ndarray:
    """Perform PCA dimensionality reduction on the distance matrix.

    Args:
        distance_matrix: Matrix of distances between trees (precomputed, symmetric)
        n_components: Number of dimensions in the output embedding

    Returns:
        np.ndarray: The PCA embedding
    """
    n = distance_matrix.shape[0]
    if n < n_components:
        # Not enough samples for full embedding; return zeros
        return np.zeros((n, n_components))

    # Defensive: replace NaN/inf in distance matrix
    if np.isnan(distance_matrix).any() or np.isinf(distance_matrix).any():
        current_app.logger.warning("[perform_pca] Distance matrix contains NaN or inf. Replacing with zeros.")
        distance_matrix = np.nan_to_num(distance_matrix, nan=0.0, posinf=0.0, neginf=0.0)

    # Centering matrix
    H = np.eye(n) - np.ones((n, n)) / n
    # Double centered matrix (Gower's centered matrix)
    B = -0.5 * H @ (distance_matrix**2) @ H

    # Defensive: replace NaN/inf in B
    if np.isnan(B).any() or np.isinf(B).any():
        current_app.logger.warning("[perform_pca] Centered matrix B contains NaN or inf. Replacing with zeros.")
        B = np.nan_to_num(B, nan=0.0, posinf=0.0, neginf=0.0)

    # PCA on the centered matrix
    pca = PCA(n_components=n_components, random_state=42)
    try:
        embedding = pca.fit_transform(B)
    except Exception as e:
        current_app.logger.error(f"[perform_pca] PCA failed: {e}", exc_info=True)
        embedding = np.zeros((n, n_components))

    # Defensive: replace NaN/inf in embedding
    if np.isnan(embedding).any() or np.isinf(embedding).any():
        current_app.logger.warning("[perform_pca] Embedding contains NaN or inf. Replacing with zeros.")
        embedding = np.nan_to_num(embedding, nan=0.0, posinf=0.0, neginf=0.0)

    # Log embedding stats for debugging
    try:
        def stats(arr):
            return (float(np.min(arr)), float(np.max(arr)), float(np.mean(arr)), float(np.std(arr)))
        x_stats = stats(embedding[:, 0]) if embedding.shape[1] > 0 else (0, 0, 0, 0)
        y_stats = stats(embedding[:, 1]) if embedding.shape[1] > 1 else (0, 0, 0, 0)
        z_stats = stats(embedding[:, 2]) if embedding.shape[1] > 2 else (0, 0, 0, 0)
        current_app.logger.info(
            f"[perform_pca] Embedding stats:\n"
            f"  X: min={x_stats[0]:.4f} max={x_stats[1]:.4f} mean={x_stats[2]:.4f} std={x_stats[3]:.4f}\n"
            f"  Y: min={y_stats[0]:.4f} max={y_stats[1]:.4f} mean={y_stats[2]:.4f} std={y_stats[3]:.4f}\n"
            f"  Z: min={z_stats[0]:.4f} max={z_stats[1]:.4f} mean={z_stats[2]:.4f} std={z_stats[3]:.4f}"
        )
    except Exception as e:
        current_app.logger.error(f"[perform_pca] Error logging embedding stats: {e}")

    return embedding


def process_tree_data(
    trees: TreeList,
) -> Tuple[TreeList, List[List[str]], List[float], List[float], np.ndarray]:
    if not trees or len(trees) == 0:
        # Return defaults for empty input
        return [], [[]], [0.0], [0.0], np.zeros((1, 1))
    if len(trees) == 1:
        # Return defaults for single-tree case
        tree = trees[0]
        return [tree], [[]], [0.0], [0.0], np.zeros((1, 1))

    # Identify jumping taxa between neighboring trees
    jumping_taxa_for_trajectories: List[List[str]] = []
    for i in range(0, max(0, len(trees) - 1), 1):
        if i + 1 < len(trees):
            jumping_taxa_for_trajectories.append([])

    # Generate interpolated trees for smooth transitions
    interpolated_trees = interpolate_adjacent_tree_pairs(trees)

    # Calculate distance metrics
    rfds: List[float] = calculate_along_trajectory(
        trees, relative_robinson_foulds_distance
    )
    wrfds: List[float] = calculate_along_trajectory(
        trees, weighted_robinson_foulds_distance
    )
    matrix_distance: List[List[float]] = calculate_matrix_distance(
        trees, relative_robinson_foulds_distance
    )

    return (
        interpolated_trees,
        jumping_taxa_for_trajectories,
        rfds,
        wrfds,
        matrix_distance,
    )


def handle_uploaded_file(f) -> PhyloMovieData:
    """Process uploaded Newick file and generate data for the frontend.

    Args:
        f: Uploaded file object

    Returns:
        Dict: Data for the frontend
    """
    # Use secure_filename to sanitize the user-provided filename
    filename: str = secure_filename(f.filename)
    current_app.logger.info(f"[handle_uploaded_file] Received file: {filename}")
    try:
        newick_string = f.read().decode("utf-8")
        newick_string_list = newick_string.strip("\r")
        current_app.logger.debug(
            f"[handle_uploaded_file] Newick string length: {len(newick_string_list)}"
        )
    except Exception as e:
        current_app.logger.error(
            f"[handle_uploaded_file] Error reading file: {e}", exc_info=True
        )
        return {
            "rfd_list": [],
            "embedding": [],
            "weighted_rfd_list": [],
            "to_be_highlighted": [],
            "sorted_leaves": [],
            "tree_list": [],
            "file_name": filename,
        }

    # Parse trees from Newick string
    try:
        trees = parse_newick(newick_string_list)
        if isinstance(trees, Node):
            trees = [trees]
        if not trees or not isinstance(trees, list) or len(trees) == 0:
            raise ValueError("No valid trees parsed from file.")
        current_app.logger.info(
            f"[handle_uploaded_file] Parsed {len(trees)} trees from file."
        )
    except Exception as e:
        current_app.logger.error(
            f"[handle_uploaded_file] Error parsing Newick file: {e}", exc_info=True
        )
        # Return all required keys with safe defaults
        return {
            "rfd_list": [],
            "embedding": [],
            "weighted_rfd_list": [],
            "to_be_highlighted": [],
            "sorted_leaves": [],
            "tree_list": [],
            "file_name": filename,
        }

    try:
        # Process tree data
        interpolated_trees, jumping_taxa, rfds, wrfds, matrix_distance = (
            process_tree_data(trees)
        )
        
        current_app.logger.info(
            f"[handle_uploaded_file] Processed tree data: {len(interpolated_trees)} interpolated trees."
        )
        
        matrix_distance_np = np.array(matrix_distance)

        embedding = perform_pca(matrix_distance_np, n_components=3).tolist()
        
        # Serialize trees to JSON for frontend
        interpolated_tree_list: List[Node] = serialize_tree_list_to_json(
            interpolated_trees
        )
        
        import json

        with open(
            "interpolated_trees.json",
            "w",
            encoding="utf-8",
        ) as f:
            f.write(
                json.dumps(
                    interpolated_tree_list,
                    ensure_ascii=False,
                    indent=4,
                )
            )
        
        print(json.dumps(interpolated_tree_list, ensure_ascii=False, indent=4))
        
        # the indices of the taxa are the indices which are used in the encoding.
        _encoding: List[str] = (
            trees[0]._order if trees and hasattr(trees[0], "_order") else []
        )
        
        current_app.logger.debug(
            f"[handle_uploaded_file] Embedding shape: {np.array(embedding).shape}"
        )

    except Exception as e:
        raise ValueError(
            f"[handle_uploaded_file] Error processing tree data: {e}"
        ) from e

    # Prepare data for frontend
    phylo_move_data: PhyloMovieData = {
        "rfd_list": rfds,
        "embedding": embedding,
        "weighted_rfd_list": wrfds,
        "to_be_highlighted": jumping_taxa,
        "sorted_leaves": _encoding,
        "tree_list": interpolated_tree_list,
        "file_name": filename,
    }
    current_app.logger.info(
        f"[handle_uploaded_file] Successfully prepared PhyloMovieData for file: {filename}"
    )
    return phylo_move_data


@app.route("/treedata", methods=["POST"])
def treedata():
    client_ip = request.remote_addr
    endpoint = request.path
    method = request.method
    app.logger.info(f"[treedata] {method} {endpoint} from {client_ip}")
    try:
        # Defensive: Check for empty request or missing file
        files_keys = list(request.files.keys())
        form_keys = list(request.form.keys())
        app.logger.info(f"[treedata] request.files keys: {files_keys}")
        app.logger.info(f"[treedata] request.form keys: {form_keys}")
        app.logger.debug(f"[treedata] request.files: {request.files}")
        app.logger.debug(f"[treedata] request.form: {request.form}")

        try:
            tree_file = request.files["treeFile"]
        except Exception as e:
            app.logger.error(
                f"[treedata] Exception accessing 'treeFile' in request.files: {e}",
                exc_info=True,
            )
            return (
                jsonify(
                    {
                        "error": "Missing required file 'treeFile'. Please upload a tree file.",
                        "request_files_keys": files_keys,
                        "request_form_keys": form_keys,
                        "exception": str(e),
                    }
                ),
                400,
            )
        if not tree_file or tree_file.filename == "":
            app.logger.error(
                f"[treedata] 'treeFile' is missing or empty in request.files. Keys: {files_keys}"
            )
            return (
                jsonify(
                    {
                        "error": "Missing required file 'treeFile'. Please upload a tree file.",
                        "request_files_keys": files_keys,
                        "request_form_keys": form_keys,
                    }
                ),
                400,
            )

        app.logger.info(f"[treedata] Received file: {tree_file.filename}")

        window_size = int(request.form.get("windowSize", 1))
        window_step_size = int(request.form.get("windowStepSize", 1))
        app.logger.info(
            f"[treedata] window_size={window_size}, window_step_size={window_step_size}"
        )

        # Check for empty file (no content)
        tree_file.seek(0, os.SEEK_END)
        file_size = tree_file.tell()
        tree_file.seek(0)
        if file_size == 0:
            app.logger.error(
                f"[treedata] Uploaded file '{tree_file.filename}' is empty."
            )
            return (
                jsonify(
                    {
                        "error": "Uploaded file 'treeFile' is empty.",
                        "request_files_keys": files_keys,
                        "request_form_keys": form_keys,
                    }
                ),
                400,
            )

        front_end_input = handle_uploaded_file(f=tree_file)

        # Defensive: check for None or missing keys
        required_keys = [
            "tree_list",
            "rfd_list",
            "weighted_rfd_list",
            "to_be_highlighted",
            "sorted_leaves",
            "file_name",
            "embedding",
        ]
        if not isinstance(front_end_input, dict):
            app.logger.error(
                f"[treedata] handle_uploaded_file did not return a dict. Got: {front_end_input}"
            )
            return (
                jsonify(
                    {
                        "error": "Internal error: handle_uploaded_file did not return a dictionary."
                    }
                ),
                500,
            )
        for key in required_keys:
            if key not in front_end_input:
                app.logger.error(
                    f"[treedata] Missing key '{key}' in handle_uploaded_file result. Got: {front_end_input}"
                )
                return (
                    jsonify(
                        {
                            "error": f"Internal error: missing key '{key}' in backend result."
                        }
                    ),
                    500,
                )

        app.logger.info(
            f"[treedata] Successfully processed and returning data for file: {tree_file.filename}"
        )

        # Return all data as JSON
        return jsonify(
            {
                "tree_list": front_end_input["tree_list"],
                "rfd_list": front_end_input["rfd_list"],
                "weighted_robinson_foulds_distance_list": front_end_input[
                    "weighted_rfd_list"
                ],
                "to_be_highlighted": front_end_input["to_be_highlighted"],
                "sorted_leaves": front_end_input["sorted_leaves"],
                "file_name": front_end_input["file_name"],
                "window_size": window_size,
                "window_step_size": window_step_size,
                "embedding": front_end_input["embedding"],
            }
        )
    except Exception as e:
        app.logger.error("[treedata] Error processing request", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/cause-error")
def cause_error() -> None:
    """Test endpoint to trigger error handling.

    Raises:
        Exception: Test exception
    """
    raise Exception("Test error logging")


@app.errorhandler(Exception)
def log_exception(e: Exception):
    """Global error handler for all exceptions."""
    app.logger.error("[global] Unhandled Exception", exc_info=True)
    return jsonify({"error": str(e)}), 500