from typing import Dict, Tuple, Any, List
from .Treere import Treere


def merge_tree_list_weight_robinson_foulds(json_consensus_tree_list, weighted_robinson_fould_list):
    for weight_data in weighted_robinson_fould_list:
        json_consensus_tree_list[weight_data['consensus_index']
                                 ]['distance'] = weight_data
    return json_consensus_tree_list


def calculate_rfd_along_tracjectories(json_consensus_tree_list: List) -> List[Dict]:
    distance_list = []
    for i in range(0, len(json_consensus_tree_list) - 5, 5):
        partitioned_tree_list = json_consensus_tree_list[i: i + 6]
        distance_dict = compute_robinson_foulds(partitioned_tree_list)
        distance_list.append(
            {"tree": int(i / 5), "consensus_index": i, "robinson_foulds": distance_dict})
    return distance_list


def compute_robinson_foulds(json_consensus_tree_list):

    branchListOriginalTree1 = traverse(json_consensus_tree_list[0], [])

    countInternalBranchesOriginalTree1 = len(branchListOriginalTree1)

    branchListConsensusTree1 = traverse(json_consensus_tree_list[2], [])

    countInternalBranchesConsensusTree1 = len(branchListConsensusTree1)

    difference_number_con1_org_1 = countInternalBranchesOriginalTree1 - \
        countInternalBranchesConsensusTree1

    ######################################################################################################

    branchListOriginalTree2 = traverse(json_consensus_tree_list[5], [])

    countInternalBranchesOriginalTree2 = len(branchListOriginalTree2)

    branchListConsensusTree2 = traverse(json_consensus_tree_list[3], [])

    countInternalBranchesConsensusTree2 = len(branchListConsensusTree2)

    difference_number_con_2_org_2 = countInternalBranchesOriginalTree2 - \
        countInternalBranchesConsensusTree2

    distance = difference_number_con1_org_1 + difference_number_con_2_org_2

    relative_distance = distance / \
        (countInternalBranchesOriginalTree1 + countInternalBranchesOriginalTree2)

    return {"absolute": distance, "relative": relative_distance}


def traverse(node: Dict[str, Any], treeList: List[Tuple[str, str]]) -> List[Tuple[str, str]]:
    if('children' in node.keys()):
        for child in node['children']:
            if('children' in child.keys()):
                traverse(child, treeList)
                treeList.append((node['name'], child['name']))
    return treeList


def traverse_for_construcuting_edge_Length_map(node, treeList):
    if('children' in node.keys()):
        for child in node['children']:
            if('children' in child.keys()):
                traverse_for_construcuting_edge_Length_map(child, treeList)

        treeList[str(node['name'])] = node['length']

    return treeList

def calculate_weighted_robinson_foulds_distance_along_trajectory(json_consensus_tree_list):
        distance_list = []
        for i in range(0, len(json_consensus_tree_list) - 5, 5):
            partitioned_tree_list = json_consensus_tree_list[i: i + 6]
            first_tree = partitioned_tree_list[0]
            second_tree = partitioned_tree_list[-1]
            weighted_robinson_foulds_distance = calculate_weighted_robinson_foulds_distance(first_tree, second_tree)
            distance_list.append(weighted_robinson_foulds_distance)        
        return distance_list


def calculate_weighted_robinson_foulds_distance(first_tree, second_tree):
        edge_length_map_first = traverse_for_construcuting_edge_Length_map(first_tree,{})
        edge_length_map_second = traverse_for_construcuting_edge_Length_map(second_tree,{})

        edge_length_map_summed = {}

        for edge in edge_length_map_first:
            if(edge not in edge_length_map_second):
                edge_length_map_second[edge] = 0
                
        for edge in edge_length_map_second:
            if(edge not in edge_length_map_first):
                edge_length_map_first[edge] = 0
                
        for edge in edge_length_map_second:
            edge_length_map_summed[edge] = abs(edge_length_map_second[edge] - edge_length_map_first[edge] )

        return sum(edge_length_map_summed.values())

        

if __name__ == '__main__':
    stepSize = 1
    startPosition = 1
    frontend_input = "alltrees.tree";

    with open(frontend_input) as f:    

        f = open(frontend_input,"r")

        newick_string = f.read()

        t_interpolator = Treere()

        json_consensus_tree_list = t_interpolator.input_manager(newick_string, frontend_input)

        w_list = calculate_weighted_robinson_foulds_distance_along_trajectory(json_consensus_tree_list)


"""
    Explanation what trees are beeing generated
    0 - orig1	- full tree 1
    1 - zw 1	- orig1, but branches=0 if not in orig2, other branches auf average
    2 - cons1	- consensus 1 - only branches existent in both trees, sorted by orig1
    3 - cons2	- consensus 2 - only branches existent in both trees, sorted by orig2
    4 - zw 2	- orig2, but branches=0 if not in orig1, other branches auf average
    5 - orig2	- full tree 2
"""

# weighted_robinson_fould_list = calculate_rfd_along_tracjectories(json_consensus_tree_list)
# json_consensus_tree_list = merge_tree_list_weight_robinson_foulds(
#    json_consensus_tree_list, weighted_robinson_fould_list)
