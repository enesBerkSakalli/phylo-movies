from algorithm_5 import algorithm_5
from typing import Dict, List
import math
from flask import Flask
from flask import request, abort, render_template
from TreeInterpolator import (
    TreeInterpolator,
    calculate_rfd_along_trajectories,
    calculate_weighted_robinson_foulds_distance_along_trajectory,
)
import json

app = Flask(__name__)

try:
    with open("commithash", mode="r") as f:
        commit = f.read()
except:
    commit = "no"


@app.route("/about", methods=["GET"])
def about():
    return render_template("about.html")


def handle_order_list(request):
    try:
        order_file = request.files["orderFile"]
        if order_file.filename == "":
            return None

        order_file_text = order_file.read().decode("utf-8")
        order_file_list = order_file_text.strip().split("\n")

        return order_file_list

    except KeyError:
        # Handle case when "orderFile" key is not found in request.files
        return None

    except UnicodeDecodeError:
        # Handle case when decoding the file content fails
        return None


@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "GET":
        return render_template("form.html", commit=commit)
    elif request.method == "POST":
        window_size = int(request.form["windowSize"])
        window_step_size = int(request.form["windowStepSize"])
        order_file_list = handle_order_list(request)
        phylo_movie_state = handle_uploaded_file(
            leaf_order=order_file_list, f=request.files["treeFile"]
        )
        phylo_movie_state["taxaColorMap"] = parse_form_taxa_color(
            request.form, phylo_movie_state["sortedLeaves"]
        )

        return render_template(
            "index.html",
            window_size=window_size,
            window_step_size=window_step_size,
            phylo_movie_state=json.dumps(phylo_movie_state),
        )

    else:
        abort(401)


def parse_form_taxa_color(request_map, order_file_list):
    taxa_color_map = {}

    if "separator" in request_map:
        separator = request_map["separator"]
        group_colors = {
            entry.split("-")[2]: request_map[entry]
            for entry in request_map
            if str(entry).startswith("group")
        }

        for taxon in order_file_list:
            if separator != "first_letter":
                group_name = taxon.split(separator)[0]
            else:
                group_name = taxon[0]

            taxa_color_map[taxon] = group_colors.get(group_name, "#000000")

    else:
        taxa_color_map = {
            entry.split("-")[2]: request_map[entry]
            for entry in request_map
            if str(entry).startswith("taxa")
        }

    return taxa_color_map


def handle_uploaded_file(leaf_order, f):
    t_interpolator = TreeInterpolator(given_leaf_order=leaf_order)

    newick_string = t_interpolator.newick_purification(f.read().decode("utf-8"))

    newick_list = newick_string.strip("\r").split("\n")

    json_consensus_tree_list = t_interpolator.input_manager(newick_string, f.filename)

    rfd_list = calculate_rfd_along_trajectories(json_consensus_tree_list)

    weighted_robinson_foulds_list = (
        calculate_weighted_robinson_foulds_distance_along_trajectory(
            json_consensus_tree_list
        )
    )

    filename = f.filename

    to_be_highlighted = find_jumping_taxa_list(
        json_consensus_tree_list, t_interpolator.sorted_nodes, newick_list
    )

    phylo_move_state = {
        "robinsonFouldsDistances": rfd_list,
        "weightedFouldsDistances": weighted_robinson_foulds_list,
        "toBeHighlighted": to_be_highlighted,
        "sortedLeaves": t_interpolator.sorted_nodes,
        "treeList": json_consensus_tree_list,
        "fileName": filename,
    }

    return phylo_move_state


def find_jumping_taxa_list(
    json_consensus_tree_list: List, sorted_nodes: List, newick_list: List = []
) -> List[Dict]:
    jumping_taxa_lists = []

    for i in range(0, len(json_consensus_tree_list) - 5, 5):
        first_tree_index = math.floor(i / 5)
        second_tree_index = first_tree_index + 1
        pair_of_newick_string = [
            newick_list[first_tree_index],
            newick_list[second_tree_index],
        ]
        set_of_trees = json_consensus_tree_list[i : i + 6]
        jumping_taxa_lists.append(
            algorithm_5(
                set_of_trees,
                sorted_nodes,
                "phylo-movies-web-call",
                pair_of_newick_string,
            )
        )

    return jumping_taxa_lists


if __name__ == "__main__":
    app.run(debug=True)
