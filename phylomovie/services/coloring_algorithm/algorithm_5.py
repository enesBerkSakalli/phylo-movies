import sys
from typing import List, Callable, TypeVar, Union, NewType, Optional, Collection, Collection
from .main.main_find_highlights import decode_highList_one_tree, Node, NodeName
from ete3 import Tree
import numpy as np
from phylomovie.services.tree.Treere import Treere
from icecream import ic

sys.path.append("..")
# --------- algo  ----------

Component = NewType("Component", tuple[int])
ComponentSet = tuple[Component, ...]  # type: ignore
EdgeType = str
X = TypeVar("X")
Y = TypeVar("Y")
ic.disable()


def calculate_component_set_tree(node: Node) -> ComponentSet:
    components: list[Component] = []
    if(node.length != 0):
        components.append(NodeName(node.name))
        return tuple(components)

    if len(node.children) == 0:
        return (Component(node.name), )

    for child in node.children:
        components += sorted(calculate_component_set_tree(child))

    return tuple(sorted(components))


class FunctionalTree:

    def __init__(self, all_sedges: list[Node], edge_types: dict[NodeName, EdgeType], ancestor_edges: dict[ComponentSet, Node], arms: dict[NodeName, list[ComponentSet]]):
        self._all_sedges: list[Node] = all_sedges
        self._edge_types: dict[NodeName, EdgeType] = edge_types
        self._ancestor_edges: dict[ComponentSet, Node] = ancestor_edges
        self._arms: dict[NodeName, list[ComponentSet]] = arms

    def __add__(self, other: "FunctionalTree") -> "FunctionalTree":
        all_sedges = self._all_sedges + other._all_sedges

        _edge_types = {}
        _edge_types.update(self._edge_types)
        _edge_types.update(other._edge_types)

        _ancestor_edges = {}
        _ancestor_edges.update(self._ancestor_edges)
        _ancestor_edges.update(other._ancestor_edges)

        arms = {}
        arms.update(self._arms)
        arms.update(other._arms)

        return FunctionalTree(all_sedges, _edge_types, _ancestor_edges, arms)


def get_type(node: Node) -> EdgeType:
    if len(node.children) == 0:
        return "leaf"
    if all(child.length == 0 for child in node.children) and node.length > 0:
        return "full"
    elif any(child.length == 0 for child in node.children) and node.length > 0:
        return "partial"
    elif all(child.length > 0 for child in node.children) and node.length == 0:
        return "anti"
    else:
        return "none"


def traverse(node: Node) -> FunctionalTree:

    all_sedges = []
    edge_types = {}
    ancestor_edges = {}
    arms = {}

    type_ = get_type(node)

    edge_types[node.name] = type_

    if type_ in ["full", "partial"]:
        all_sedges.append(node)

    # Set[Set[Components]]

    edge_arms = [calculate_component_set_tree(
        child) for child in node.children]

    arms[node.name] = edge_arms

    for child in node.children:
        ancestor_edges[child.name] = node

    # for every Set[Component]
    for arm in edge_arms:
        ancestor_edges[arm] = node

    t1 = FunctionalTree(all_sedges, edge_types, ancestor_edges, arms)

    for child in node.children:
        t = traverse(child)
        t1 = t1 + t

    # alle s-edge
    # für jedes edge den typ
    # für jede componente den "ancestor edge"
    # für jede s-edge die Set[Set[Component]] == Set[Arm]
    return t1


def delete_tree_leaves_for_coloring_newick(to_be_deleted_leaves=[], newick_list=[]):

    t1 = Tree(newick_list[0])
    t2 = Tree(newick_list[1])

    for leave in to_be_deleted_leaves:

        to_be_deleted_node_one = t1.search_nodes(name=leave)[0]
        to_be_deleted_node_two = t2.search_nodes(name=leave)[0]

        to_be_deleted_node_one.delete()
        to_be_deleted_node_two.delete()

    treeReInstance = Treere()

    newick_string_1 = t1.write()
    newick_string_2 = t2.write()

    newick_list = "\n".join([newick_string_1, newick_string_2])

    json_treelist = treeReInstance.json_list(newick_list)
    treelist = treeReInstance.jsonTreelist_to_sortedConsensusTreelist(
        json_treelist)

    a = [newick_string_1, newick_string_2]

    return Node.from_dict(treelist[1], treeReInstance.sorted_nodes), Node.from_dict(treelist[4], treeReInstance.sorted_nodes), treeReInstance.sorted_nodes, a


# === Helpers ===

def print_component_map(component_set, sorted_nodes, title=None):
    if title:
        ic(title)
    ic(component_set)
    for component_set in component_set:
        components_converted = []
        for components in component_set:
            components_converted.append(
                [sorted_nodes[subcomponent] for subcomponent in components])
        ic(components_converted)


# ==== Functional Programming Style ====
#
# -- Functions --

def remove_last_component_if_longer_than_one(component_set: ComponentSet) -> ComponentSet:
    if(len(component_set) != 1):
        return component_set[:-1]
    else:
        return component_set


def calculate_component_set(t: FunctionalTree, sedge) -> list[ComponentSet]:
    return t._arms[sedge.name]


def cartesian(c1: Collection[X], c2: Collection[Y]) -> list[tuple[X, Y]]:
    r: list[tuple[X, Y]] = []
    for x in c1:
        for y in c2:
            r.append((x, y))
    return r


def map1(f: Callable[[X], Y], l: Collection[tuple[X, X]]) -> list[Y]:
    r: list[Y] = []
    for x in l:
        r.append(f(x))
    return r


def map2(f: Callable[[X, X], Y], l: Collection[tuple[X, X]]) -> list[Y]:
    r: list[Y] = []
    for x in l:
        a, b = x
        r.append(f(a, b))
    return r


def reduce(f: Callable[[X, X], X], l: Collection[X]) -> Optional[X]:
    r: list[X] = []
    if len(l) == 0:
        return []
    x0: X = l[0]  # type: ignore
    for x in l[1:]:  # type: ignore
        x0 = f(x0, x)
    return x0


def union(a: List[X], b: List[X]) -> List[X]:
    return a + b


def count(a: List[X], x: X) -> int:
    return a.count(x)


def size(a: Collection[X]) -> int:
    return len(a)


def argmax(l: Collection[X], f: Callable[[X], int]) -> list[X]:
    count: int = -1
    args: list[X] = []
    for x in l:
        c: int = f(x)
        if c > count:
            args = [x]
            count = c
        elif c == count:
            args.append(x)
    return args


def argmin(l: Collection[X], f: Callable[[X], float]) -> list[X]:
    count: float = np.inf
    args: list[X] = []
    for x in l:
        c = f(x)
        if c < count:
            args = [x]
            count = c
        elif c == count:
            args.append(x)
    return args


def filter_(f: Callable[[X], bool], l: Collection[X]):
    r: list[X] = []
    for i in l:
        if f(i):
            r.append(i)
    return r


def get_ancestor_edge(t: FunctionalTree, c: ComponentSet) -> Node:

    # for key,value in t._ancestor_edges.items():
    #     print(key,value,f"Searched for {c}","\n")

    return t._ancestor_edges[tuple(c)]


def is_anti_s_edge(t: FunctionalTree, ancestor_edge: Node) -> bool:
    return t._edge_types[ancestor_edge.name] == "anti"


def is_full_s_edge(t: FunctionalTree, ancestor_edge: Node) -> bool:
    return t._edge_types[ancestor_edge.name] == "full"


def is_partial_s_edge(t: FunctionalTree, ancestor_edge: Node) -> bool:
    return t._edge_types[ancestor_edge.name] == "partial"


def is_none_edge(t: FunctionalTree, ancestor_edge: Node) -> bool:
    return t._edge_types[ancestor_edge.name] == "none"


def cut(a: Collection[X], b: Collection[X]) -> Collection[X]:
    a_uniques = set(a)
    b_uniques = set(b)
    a_and_b = a_uniques.intersection(b_uniques)
    return sorted(list(a_and_b))


def symm(a: list[X], b: list[X]) -> list[X]:
    a_uniques = set(a)
    b_uniques = set(b)
    a_and_b = a_uniques.symmetric_difference(b_uniques)
    return sorted(list(a_and_b))


def filter_components_from_arms(cond, arms):
    filtered_arms = []
    for component_set in arms:

        filtered_component_set = []
        for component in component_set:
            if cond(component):
                filtered_component_set.append(component)
        if(filtered_component_set):
            filtered_arms.append(tuple(filtered_component_set))
    return filtered_arms


def algo5_partial_partial_cond(t1, t2):
    def cond(component):

        ancestor_edge1 = get_ancestor_edge(t1, component)
        ancestor_edge2 = get_ancestor_edge(t2, component)

        partial1 = is_partial_s_edge(t1, ancestor_edge1)
        partial2 = is_partial_s_edge(t2, ancestor_edge2)

        anti1 = is_anti_s_edge(t1, ancestor_edge1)
        anti2 = is_anti_s_edge(t2, ancestor_edge2)

        return (partial1 and anti2) or (anti1 and partial2)
    return cond


# -- Algorithms --


def algo1(sedge: Node, t1: FunctionalTree, t2: FunctionalTree) -> list[Component]:

    c1: list[ComponentSet] = calculate_component_set(t1, sedge)
    c2: list[ComponentSet] = calculate_component_set(t2, sedge)
    c12: list[tuple[ComponentSet, ComponentSet]] = cartesian(c1, c2)

    intersections: list[ComponentSet] = map2(cut, c12)  # type: ignore
    symmetric_differences: list[ComponentSet] = map2(symm, c12)  # type: ignore

    voting_map: list[ComponentSet] = intersections + symmetric_differences

    m: list[Component] = argmax(voting_map, lambda x: count(voting_map, x))

    r: list[Component] = argmin(m, size)

    rr: list[Component] = reduce(union, r)  # type: ignore

    return rr


def case_full_full(sedge: Node, t1: FunctionalTree, t2):
    return algo1(sedge, t1, t2)


def case_full_none(sedge, t1, t2):
    return algo1(sedge, t1, t2)


def case_partial_partial(sedge, t1, t2, sorted_nodes):

    c1 = calculate_component_set(t1, sedge)
    c2 = calculate_component_set(t2, sedge)

    print_component_map(c1, sorted_nodes, "C1")
    print_component_map(c2, sorted_nodes, "C2")

    cf1 = filter_components_from_arms(algo5_partial_partial_cond(t1, t2), c1)
    cf2 = filter_components_from_arms(algo5_partial_partial_cond(t2, t1), c2)

    print_component_map(cf1, sorted_nodes, "CF1")
    print_component_map(cf2, sorted_nodes, "CF2")

    cff1 = filter_(lambda x: len(x) != 0, cf1)
    cff2 = filter_(lambda x: len(x) != 0, cf2)

    print_component_map(cff1, sorted_nodes, "CFF1")
    print_component_map(cff2, sorted_nodes, "CFF2")

    c12 = cartesian(cff1, cff2)

    intersections = map2(cut, c12)
    print_component_map(intersections, sorted_nodes, "Intersections")

    symmetric_differences = map2(symm, c12)

    print_component_map(symmetric_differences,
                        sorted_nodes, "Symmetric Differences")

    voting_map = intersections + symmetric_differences

    voting_map_filtered = filter_(lambda x: x, voting_map)

    m: list[Component] = argmax(
        voting_map_filtered, lambda x: count(voting_map_filtered, x))

    m = argmin(m, size)

    c = map1(remove_last_component_if_longer_than_one, m)

    c = reduce(union, c)

    return c


def algo5_partial_none_only_partial(t1):
    def cond(component):

        ancestor_edge1 = get_ancestor_edge(t1, component)

        partial1 = is_partial_s_edge(t1, ancestor_edge1)

        return partial1
    return cond


def algo5_partial_none_only_anti_sedge(t1):
    def cond(component):
        ancestor_edge1 = get_ancestor_edge(t1, component)

        anti1 = is_anti_s_edge(t1, ancestor_edge1)

        return anti1
    return cond


def case_partial_none(sedge, t1, t2, sorted_nodes):
    c1 = calculate_component_set(t1, sedge)
    c2 = calculate_component_set(t2, sedge)

    print_component_map(c1, sorted_nodes, "C1")
    print_component_map(c2, sorted_nodes, "C2")

    cf1_anti_s_edge = filter_components_from_arms(
        algo5_partial_none_only_anti_sedge(t1), c1)

    cf1_partial_s_edge = filter_components_from_arms(
        algo5_partial_none_only_partial(t1), c1)

    print_component_map(cf1_anti_s_edge, sorted_nodes, "CF1 Anti S-edge")

    print_component_map(cf1_partial_s_edge, sorted_nodes, "Partial S-edge")

    cf1_partial_s_edge = [reduce(union, cf1_partial_s_edge)]

    print_component_map(cf1_partial_s_edge, sorted_nodes,
                        "Reduced partial s-edges")

    combined = (cf1_partial_s_edge + cf1_anti_s_edge)

    print_component_map(combined, sorted_nodes, "Combined")

    cf1 = argmin(combined, size)

    c = map1(remove_last_component_if_longer_than_one, cf1)

    c = reduce(union, c)

    return c


def algorithm_5_for_sedge(sedge, t1, t2, sorted_nodes):

    if is_full_s_edge(t1, sedge) and is_full_s_edge(t2, sedge):

        ic("Full Full")

        return case_full_full(sedge, t1, t2)

    if is_full_s_edge(t1, sedge) and is_partial_s_edge(t2, sedge):

        ic("Full Partial")

        return case_full_full(sedge, t1, t2)

    if is_partial_s_edge(t1, sedge) and is_full_s_edge(t2, sedge):

        ic("Partial Full")

        return case_full_full(sedge, t2, t1)

    if is_partial_s_edge(t1, sedge) and is_partial_s_edge(t2, sedge):

        ic("Partial Partial")

        return case_partial_partial(sedge, t1, t2, sorted_nodes)

    if is_partial_s_edge(t1, sedge) and is_none_edge(t2, sedge):
        ic("PARTIAL NONE")
        return case_partial_none(sedge, t1, t2, sorted_nodes)

    if is_none_edge(t1, sedge) and is_partial_s_edge(t2, sedge):

        ic("NONE PARTIAL")

        return case_partial_none(sedge, t2, t1, sorted_nodes)

    if(is_full_s_edge(t1, sedge)):
        return case_full_full(sedge, t1, t2)

    if(is_full_s_edge(t2, sedge)):
        return case_full_full(sedge, t1, t2)

    else:
        raise Exception("We forgot one case")


def merge_sedges(edge_set_one, edge_set_two):

    d = {}

    for e in edge_set_one:
        d[e.name] = e

    for e in edge_set_two:
        d[e.name] = e

    return list(d.values())


def algorithm_5(tree_list, sorted_nodes: List, file_name=None, newick_list=[]):

    it1, it2, sorted_nodes, newick_list = delete_tree_leaves_for_coloring_newick(
        newick_list=newick_list)

    t1 = traverse(it1)
    t2 = traverse(it2)

    global_decoded_result_list: list[str] = []

    all_sedges = set(t1._all_sedges + t2._all_sedges)

    all_sedges = merge_sedges(t1._all_sedges, t2._all_sedges)

    while True:

        decoded_list = []

        for s_edge in all_sedges:

            # execute algorithm
            jumping_taxas = algorithm_5_for_sedge(s_edge, t1, t2, sorted_nodes)

            # translate taxa to indices
            taxa = list(set([y for x in jumping_taxas for y in x]))

            decoded_list = decode_highList_one_tree(taxa, sorted_nodes)

            global_decoded_result_list += decoded_list

        # Stop condition for Pruning
        if(len(decoded_list) > 0 and (len(sorted_nodes) - len(decoded_list) > 3)):

            prunned_intermediate_tree_one, prunned_intermediate_tree_two, sorted_nodes, newick_list = delete_tree_leaves_for_coloring_newick(
                decoded_list, newick_list)

            t1 = traverse(prunned_intermediate_tree_one)

            t2 = traverse(prunned_intermediate_tree_two)

            all_sedges = set(t1._all_sedges + t2._all_sedges)

        else:
            break

    return list(set(global_decoded_result_list))


def algorithm1(tree_list, sorted_nodes, file_name, newick_list):

    it1, it2, sorted_nodes, newick_list = delete_tree_leaves_for_coloring_newick(
        newick_list=newick_list)

    t1 = traverse(it1)

    t2 = traverse(it2)

    global_decode_result_list = []

    all_sedges = set(t1._all_sedges + t2._all_sedges)

    taxa_jumping_map = {leave: 0 for leave in sorted_nodes}

    for sedge in all_sedges:

        jumping_taxas = algo1(sedge, t1, t2)

        taxa = list([y for x in jumping_taxas for y in x])
        decoded_list = decode_highList_one_tree(taxa, sorted_nodes)

        for leave in decoded_list:
            taxa_jumping_map[leave] = taxa_jumping_map[leave] + 1

        global_decode_result_list += [k for k,
                                      v in taxa_jumping_map.items() if v > 0]

    return set(global_decode_result_list)


if __name__ == "__main__":
    pass
