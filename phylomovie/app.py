import math
from typing import Dict, List

import json
from flask import Flask
from flask import request, abort, render_template

from brancharchitect.io import parse_newick
from brancharchitect.io import serialize_tree_list_to_json
from brancharchitect.jumping_taxa.tree_interpolation import (
    interpolate_adjacent_tree_pairs,
)
from brancharchitect.distances import (
    calculate_along_trajectory,
    weighted_robinson_foulds_distance,
    relative_robinson_foulds_distance,
)


from .services.coloring_algorithm.algorithm_5 import algorithm_5



app = Flask(__name__)
app.config["DEBUG"] = True
app.config["TEMPLATES_AUTO_RELOAD"] = True

try:
    with open("commithash", mode="r") as f:
        commit = f.read()
except:
    commit = "no"


@app.route("/about", methods=["GET"])
def about():
    return render_template("about.html")


def handle_order_list(request):
    if request.files["orderFile"].filename == "":
        return None
    else:
        order_file = request.files["orderFile"]
        order_file_text = order_file.read().decode("utf-8")
        order_file_text = order_file_text.replace("\r", "").strip()
        order_file_list = order_file_text.split("\n")
        return order_file_list


@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "GET":
        return render_template("form.html", commit=commit)

    elif request.method == "POST":
        window_size = int(request.form["windowSize"])
        window_step_size = int(request.form["windowStepSize"])

        order_file_list = handle_order_list(request)

        front_end_input = handle_uploaded_file(
            leaf_order=order_file_list, f=request.files["treeFile"]
        )

        json_tree_list = json.dumps(front_end_input["tree_list"])

        return render_template(
            "index.html",
            tree_list=json_tree_list,
            rfe_list=front_end_input["rfd_list"],
            weighted_robinson_foulds_distance_list=front_end_input["weighted_rfd_list"],
            to_be_highlighted=front_end_input["to_be_highlighted"],
            sorted_leaves=front_end_input["sorted_leaves"],
            file_name=front_end_input["file_name"],
            window_size=window_size,
            window_step_size=window_step_size,
        )

    else:
        abort(401)


def handle_uploaded_file(leaf_order, f):
    # t_interpolator = Treere(given_leaforder=leaf_order)
    # newick_string = t_interpolator.newick_purification(f.read().decode("utf-8"))
    newick_string = f.read().decode("utf-8")
    newick_string_list = newick_string.strip("\r")
    trees = parse_newick(newick_string_list)
    interpolated_trees = interpolate_adjacent_tree_pairs(trees)
    filename = f.filename

    to_be_highlighted = []

    rfds = calculate_along_trajectory(trees, relative_robinson_foulds_distance)
    wrfds = calculate_along_trajectory(trees, weighted_robinson_foulds_distance)

    interpolated_tree_list = serialize_tree_list_to_json(interpolated_trees)

    phylo_move_data = {
        "rfd_list": rfds,
        "weighted_rfd_list": wrfds,
        "to_be_highlighted": to_be_highlighted,
        "sorted_leaves": trees[0]._order,
        "tree_list": interpolated_tree_list,
        "file_name": filename,
    }

    return phylo_move_data


def find_to_be_highlighted_leaves_delete(
    json_consensus_tree_list: List,
    sorted_nodes: List,
    file_name=None,
    newick_string_list: List = [],
) -> List[Dict]:
    highlights_every_tree_list = []

    for i in range(0, len(json_consensus_tree_list) - 5, 5):
        first_tree_index = math.floor(i / 5)
        second_tree_index = math.floor(i / 5) + 1

        pair_of_newick_string = [
            newick_string_list[first_tree_index],
            newick_string_list[second_tree_index],
        ]

        set_of_trees = json_consensus_tree_list[i : i + 6]

        highlights_every_tree_list.append(
            algorithm_5(set_of_trees, sorted_nodes, file_name, pair_of_newick_string)
        )

    return highlights_every_tree_list
