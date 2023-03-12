from typing import Dict, List
import math
from os.path import join
import itertools
import pytest
import sys
  
# append the path of the parent directory
sys.path.append("..")

from services.tree.Treere import Treere
from services.coloring_algorithm.algorithm_5 import (
    algorithm_5,
)

DATA_ROOT = "./test-data/"

test_data_list = [
    [
        join(DATA_ROOT, "rerun-iqtree-AE+AGonly_500_25-GTR-midpoint-rooted-17-18.trees"),
        "C1/C2 jumps into A2, E1/E2 jumps into",
        algorithm_5,
        [[["C1", "C2", "E1", "E2"]]],
    ],
]

# discus
algorithms = [algorithm_5]

def all_combinations(a, b):
    return [sorted(l) for l in itertools.product(a, b)]

def find_to_be_highlighted_leaves(
    json_consensus_tree_list: List,
    sorted_nodes: List,
    find_highlight_tax,
    file_name=None,
    newick_string_list: List = [],
) -> List[Dict]:

    highlights_every_tree_list = []

    for i in range(0, len(json_consensus_tree_list) - 5, 5):

        first_tree_index = math.floor(i / 5)
        print(first_tree_index)
        second_tree_index = math.floor(i / 5) + 1
        print(second_tree_index)
        

        pair_of_newick_string = [
            newick_string_list[first_tree_index],
            newick_string_list[second_tree_index],
        ]

        set_of_trees = json_consensus_tree_list[i: i + 6]

        highlights_every_tree_list.append(
            find_highlight_tax(
                set_of_trees, sorted_nodes, file_name, pair_of_newick_string
            )
        )

    return highlights_every_tree_list

def _test_highlighting_algorithm(
    file_name,
    description,
    find_to_be_highlighted_taxa_function,
    results,
    strict=False,
    output=True,
):

    with open(file_name) as f:
        txt = f.read()

    treeRe = Treere()
    tree_list = treeRe.input_manager(txt, file_name)

    newick_string = treeRe.newick_purification(txt)

    newick_string_list = newick_string.split("\n")

    to_be_highlighted_leaves = find_to_be_highlighted_leaves(
        tree_list,
        treeRe.sorted_nodes,
        find_to_be_highlighted_taxa_function,
        file_name,
        newick_string_list,
    )

    for j in range(len(results)):
        for i in range(len(results[j])):
            results[j][i] = sorted(results[j][i])

    for i in range(len(to_be_highlighted_leaves)):
        to_be_highlighted_leaves[i] = sorted(to_be_highlighted_leaves[i])

    worked = True
    for rs, tree_result in zip(results, to_be_highlighted_leaves):
        worked = worked and tree_result in rs

    if not worked:
        functionname = find_to_be_highlighted_taxa_function.__name__
        treename = file_name
        if output:
            print(
                f"Algorithm {functionname} produced incorrect results on tree {treename}:"
            )
            print(f"Expected: {results}")
            print(f"Got: {to_be_highlighted_leaves}")
    if strict:
        for rs, tree_result in zip(results, to_be_highlighted_leaves):
            assert worked and tree_result in rs

    return worked, to_be_highlighted_leaves

    # assert to_be_highlighted_leaves == results,  ("Expected Results %", "".join(results))

@pytest.fixture()
def latest_algorithm():
    return algorithms[-1]

@pytest.fixture(params=test_data_list)
def test_data(request):
    return request.param

def test_algorithms(test_data, latest_algorithm):
    filepath, description, function, result = test_data
    function = latest_algorithm
    _test_highlighting_algorithm(filepath, description, function, result)


if __name__ == "__main__":
     for path, description, _, expected_results in test_data_list:    
        r = _test_highlighting_algorithm(
        path, description, algorithm_5, expected_results, strict=False, output=False)
