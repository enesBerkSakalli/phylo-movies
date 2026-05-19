# scripts/utils_topology.py
from typing import List, Tuple
import newick

def parse_newick(path:str):
    with open(path) as f:
        return newick.load(f)[0]

def leaves(tree) -> List[str]:
    return [n.name for n in tree.walk() if n.is_leaf]

def has_clade(tree, taxa:set) -> bool:
    """Return True if there exists a node whose leaf-set == taxa"""
    tset = set(taxa)
    for n in tree.walk():
        if n.is_leaf: continue
        if set([l.name for l in n.get_leaves()]) == tset:
            return True
    return False

def rogue_state(tree) -> str:
    """
    Returns one of:
      - 'TIB_with_DEN'  (Tibetan clusters exactly with Denisovan)
      - 'TIB_with_NEA'  (Tibetan clusters exactly with Neanderthal)
      - 'Default'       (no special 2-taxon clade with archaics)
    """
    if has_clade(tree, {"tibetan","denisovan"}):
        return "TIB_with_DEN"
    if has_clade(tree, {"tibetan","neanderthal"}):
        return "TIB_with_NEA"
    return "Default"