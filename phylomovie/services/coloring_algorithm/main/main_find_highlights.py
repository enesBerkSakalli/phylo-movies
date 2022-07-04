from typing import List, NewType
from dataclasses import dataclass

NodeName = NewType("NodeName", tuple[int])

@dataclass
class Node:
    full_name: str
    name: NodeName
    children: tuple["Node"]
    length: float

    def from_dict(d, sorted_nodes):
        children = []
        if "children" in d:
            children = [Node.from_dict(child, sorted_nodes)
                        for child in d["children"]]
            sorted_name = tuple(d["name"])
            full_name = "(" + \
                ",".join(child.full_name for child in children) + ")"
        else:
            sorted_name = (sorted_nodes.index(d["name"]),)
            full_name = str(sorted_nodes.index(d["name"]))

        return Node(full_name, sorted_name, tuple(children), d["length"])

    def from_class(d, sorted_nodes):
        children = []
        if d.children:
            children = [Node.from_class(child, sorted_nodes)
                        for child in d.children]
            return {"name": d.name, "length": d.length, "children": tuple(children)}
        else:
            return {"name": d.name, "length": d.length}

    def __hash__(self):
        return hash(self.name)

    def __eq__(self, other):
        return self.full_name == other.full_name and self.name == other.name and self.children == other.children and self.length == other.length

    def __str__(self) -> str:
        return str(self.name)

    def __repr__(self) -> str:
        return str(self.name)


def read_file(path):
    with open(path, mode="r") as f:
        l = f.readlines()
    l = [s.strip() for s in l]
    return l

def decode_highList_one_tree(high_list: List, sorted_nodes: List):
    for_one_tree_decoded = []
    for leave_index in high_list:
        for_one_tree_decoded.append(sorted_nodes[leave_index])
    return for_one_tree_decoded







