from typing import Dict, Tuple, Any, List

# =========================================== Distances ============================================


def merge_tree_list_weight_robinson_foulds(
    json_consensus_tree_list, weighted_robinson_fould_list
):
    for weight_data in weighted_robinson_fould_list:
        json_consensus_tree_list[weight_data["consensus_index"]][
            "distance"
        ] = weight_data
    return json_consensus_tree_list


def calculate_rfd_along_trajectories(json_consensus_tree_list: List) -> List[Dict]:
    distance_list = []
    for i in range(0, len(json_consensus_tree_list) - 5, 5):
        partitioned_tree_list = json_consensus_tree_list[i : i + 6]
        distance_dict = compute_robinson_foulds(partitioned_tree_list)
        distance_list.append(
            {"tree": int(i / 5), "consensus_index": i, "robinson_foulds": distance_dict}
        )
    return distance_list


def compute_robinson_foulds(json_consensus_tree_list):
    # Helper function to get the count of internal branches in a tree
    def get_internal_branch_count(tree):
        branch_list = traverse(tree, [])
        return len(branch_list)

    # Calculate internal branch counts for original tree 1 and consensus tree 1
    original_tree_1_branch_count = get_internal_branch_count(
        json_consensus_tree_list[0]
    )
    consensus_tree_1_branch_count = get_internal_branch_count(
        json_consensus_tree_list[2]
    )

    # Calculate the difference in internal branch counts between original tree 1 and consensus tree 1
    difference_1_1 = original_tree_1_branch_count - consensus_tree_1_branch_count

    # Calculate internal branch counts for original tree 2 and consensus tree 2
    original_tree_2_branch_count = get_internal_branch_count(
        json_consensus_tree_list[5]
    )
    consensus_tree_2_branch_count = get_internal_branch_count(
        json_consensus_tree_list[3]
    )

    # Calculate the difference in internal branch counts between original tree 2 and consensus tree 2
    difference_2_2 = original_tree_2_branch_count - consensus_tree_2_branch_count

    # Calculate the absolute distance as the sum of the differences in internal branch counts
    absolute_distance = difference_1_1 + difference_2_2

    # Calculate the relative distance as the absolute distance divided by the sum of internal branch counts of both original trees
    total_branch_count = original_tree_1_branch_count + original_tree_2_branch_count
    relative_distance = absolute_distance / total_branch_count

    # Return the distances as a dictionary
    return {"absolute": absolute_distance, "relative": relative_distance}


def traverse(
    node: Dict[str, Any], tree_list: List[Tuple[str, str]]
) -> List[Tuple[str, str]]:
    if "children" in node.keys():
        for child in node["children"]:
            if "children" in child.keys():
                traverse(child, tree_list)
                tree_list.append((node["name"], child["name"]))
    return tree_list


def construct_edge_length_map(node, tree_list):
    if "children" in node.keys():
        for child in node["children"]:
            if "children" in child.keys():
                construct_edge_length_map(child, tree_list)
        tree_list[str(node["name"])] = node["length"]
    return tree_list


def calculate_weighted_robinson_foulds_distance_along_trajectory(
    json_consensus_tree_list,
):
    distance_list = [
        calculate_weighted_robinson_foulds_distance(
            json_consensus_tree_list[i], json_consensus_tree_list[i + 5]
        )
        for i in range(0, len(json_consensus_tree_list) - 5, 5)
    ]
    return distance_list


def calculate_weighted_robinson_foulds_distance(first_tree, second_tree):
    # Construct edge length maps for the first and second trees
    edge_length_map_first_tree = construct_edge_length_map(first_tree, {})
    edge_length_map_second_tree = construct_edge_length_map(second_tree, {})

    # Create a new edge length map for the summed differences
    edge_length_map_summed = {}

    # Fill missing edges in the second tree's edge length map with 0
    for edge in edge_length_map_first_tree:
        if edge not in edge_length_map_second_tree:
            edge_length_map_second_tree[edge] = 0

    # Fill missing edges in the first tree's edge length map with 0
    for edge in edge_length_map_second_tree:
        if edge not in edge_length_map_first_tree:
            edge_length_map_first_tree[edge] = 0

    # Calculate the absolute differences between the edge lengths
    for edge in edge_length_map_second_tree:
        edge_length_map_summed[edge] = abs(
            edge_length_map_second_tree[edge] - edge_length_map_first_tree[edge]
        )

    # Return the sum of the weighted differences
    return sum(edge_length_map_summed.values())
