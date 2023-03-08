from .services.coloring_algorithm.algorithm_5 import algorithm_5
from .services.tree.Treere import Treere, calculate_rfd_along_tracjectories, calculate_weighted_robinson_foulds_distance_along_trajectory
from typing import Dict, List
import math
from flask import Flask
from flask import request, abort, render_template, jsonify

app = Flask(__name__)

try:
    with open("commithash", mode="r") as f:
        commit = f.read()
except:
    commit = "no"


@app.route('/about', methods=["GET"])
def about():
    return render_template('about.html')


def handle_order_list(request):
    if request.files['orderFile'].filename == '':
        return None
    else:
        order_file = request.files['orderFile']
        order_file_text = order_file.read().decode("utf-8")
        order_file_text = order_file_text.replace('\r', '').strip()
        order_file_list = order_file_text.split("\n")
        return order_file_list


@app.route('/', methods=["GET", "POST"])
def index():
    if request.method == "GET":
        return render_template('form.html', commit=commit)
    elif request.method == "POST":

        request_map = request.form
        taxa_color_map = parse_form_taxa_color(request_map)
        print(taxa_color_map)

        window_size = int(request_map['windowSize'])
        window_step_size = int(request_map['windowStepSize'])
        order_file_list = handle_order_list(request)
        front_end_input = handle_uploaded_file(leaf_order=order_file_list, f=request.files['treeFile'])

        return render_template(
            'index.html',
            tree_list=front_end_input["tree_list"],
            rfe_list=front_end_input["rfd_list"],
            weighted_robinson_foulds_distance_list=front_end_input['weighted_rfd_list'],
            to_be_highlighted=front_end_input["to_be_highlighted"],
            sorted_leaves=front_end_input["sorted_leaves"],
            file_name=front_end_input["file_name"],
            taxa_color_map=taxa_color_map,
            window_size=window_size,
            window_step_size=window_step_size,
        )

    else:
        abort(401)

def parse_form_taxa_color(request_map):
    taxa_color_map = {}
    for entry in request.form.keys():
        if str(entry).startswith('taxa'):
            form_name = entry.split("-")
            taxa_color_map[form_name[2]] = request_map[entry]
    return taxa_color_map

def handle_uploaded_file(leaf_order, f):

    t_interpolator = Treere(given_leaforder=leaf_order)

    newick_string = t_interpolator.newick_purification(f.read().decode("utf-8"))

    newick_string_list = newick_string.strip("\r").split("\n")

    json_consensus_tree_list = t_interpolator.input_manager(
        newick_string, f.filename)

    rfd_list = calculate_rfd_along_tracjectories(json_consensus_tree_list)
    weighted_robinson_foulds_list = calculate_weighted_robinson_foulds_distance_along_trajectory(
        json_consensus_tree_list)

    filename = f.filename

    to_be_highlighted = find_to_be_highlighted_leaves_delete(
        json_consensus_tree_list=json_consensus_tree_list, sorted_nodes=t_interpolator.sorted_nodes,
        newick_string_list=newick_string_list)

    phylo_move_data = {
        "rfd_list": rfd_list,
        "weighted_rfd_list": weighted_robinson_foulds_list,
        "to_be_highlighted": to_be_highlighted,
        "sorted_leaves": t_interpolator.sorted_nodes,
        "tree_list": json_consensus_tree_list,
        "file_name": filename,
    }

    return phylo_move_data


def write_robinson_foulds_file(file_name, rfd_list):
    f = open(f"{file_name}.rfe", "w")
    f.write("\n".join(str(e['robinson_foulds']['relative']) for e in rfd_list))
    f.close()


def find_to_be_highlighted_leaves_delete(json_consensus_tree_list: List, sorted_nodes: List, file_name=None,
                                         newick_string_list: List = []) -> List[Dict]:
    highlights_every_tree_list = []

    for i in range(0, len(json_consensus_tree_list) - 5, 5):
        first_tree_index = math.floor(i / 5)
        second_tree_index = math.floor(i / 5) + 1
        pair_of_newick_string = [
            newick_string_list[first_tree_index], newick_string_list[second_tree_index]]

        set_of_trees = json_consensus_tree_list[i: i + 6]

        highlights_every_tree_list.append(algorithm_5(
            set_of_trees, sorted_nodes, file_name, pair_of_newick_string))
    return highlights_every_tree_list
