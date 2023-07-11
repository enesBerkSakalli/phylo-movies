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

        # Clean up the file (optional)
        # order_file.close()
        # order_file.unlink()

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
        request_map = request.form

        window_size = int(request_map["windowSize"])

        window_step_size = int(request_map["windowStepSize"])

        order_file_list = handle_order_list(request)

        phylo_movie_state = handle_uploaded_file(
            leaf_order=order_file_list, f=request.files["treeFile"]
        )

        phylo_movie_state['taxaColorMap'] = parse_form_taxa_color(
            request_map, phylo_movie_state["sortedLeaves"]
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
        group_colors = {}

        print("######### I am here ######")

        for entry in request_map.keys():
            if str(entry).startswith("group"):
                form_name = entry.split("-")
                group_colors[form_name[2]] = request_map[entry]

        for taxon in order_file_list:
            if separator != "first_letter":
                if taxon.split(separator)[0] in group_colors:
                    group_name = taxon.split(separator)[0]
                    taxa_color_map[taxon] = group_colors[group_name]
                else:
                    taxa_color_map[taxon] = "#000000"

            else:
                if taxon[0] in group_colors:
                    group_name = taxon[0]
                    taxa_color_map[taxon] = group_colors[group_name]
                else:
                    taxa_color_map[taxon] = "#000000"

    else:
        for entry in request_map.keys():
            if str(entry).startswith("taxa"):
                form_name = entry.split("-")
                taxa_color_map[form_name[2]] = request_map[entry]
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
