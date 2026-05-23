import pytest

from generate_bootstrap_order import (
    annotate_newick_with_split_support,
    calculate_split_support_from_newicks,
    canonical_split_key,
)


def test_canonical_split_key_is_complement_aware():
    taxa = ["A", "B", "C", "D"]

    assert canonical_split_key(["A", "B"], taxa) == "A|B"
    assert canonical_split_key(["C", "D"], taxa) == "A|B"
    assert canonical_split_key(["A"], taxa) == "A"


def test_calculates_split_frequency_across_bootstrap_replicate_trees():
    taxa = ["A", "B", "C", "D"]
    trees = [
        "((A:1,B:1):1,(C:1,D:1):1);",
        "((A:1,B:1):1,(C:1,D:1):1);",
        "((A:1,C:1):1,(B:1,D:1):1);",
    ]

    support = calculate_split_support_from_newicks(trees, taxa)

    assert support["A|B"]["replicate_count"] == 2
    assert support["A|B"]["support_percent"] == pytest.approx(66.66666666666666)
    assert support["A|C"]["replicate_count"] == 1


def test_annotates_tree_internal_labels_with_split_frequency_support():
    taxa = ["A", "B", "C", "D"]
    tree = "((A:1,B:1):1,(C:1,D:1):1);"
    support = {
        "A|B": {"support_percent": 87.5, "replicate_count": 175, "replicate_total": 200},
    }

    annotated = annotate_newick_with_split_support(tree, taxa, support)

    assert "(A:1.000000,B:1.000000)87.5[" in annotated
    assert "support_kind=bootstrap_replicate_split_frequency" in annotated
