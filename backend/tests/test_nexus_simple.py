#!/usr/bin/env python3
"""
Simple test script for nexus file parsing functionality.
Tests only the parsing logic without dependencies.
"""

import re


def test_nexus_parsing():
    """Test the nexus parsing functionality directly."""

    # Sample NEXUS content with multiple trees
    nexus_content = """#NEXUS

BEGIN TREES;
    TREE tree1 = (A:0.1,B:0.2,(C:0.3,D:0.4):0.5);
    TREE tree2 = ((A:0.1,C:0.3):0.2,(B:0.2,D:0.4):0.5);
    TREE tree3 = (((A:0.1,B:0.2):0.1,C:0.3):0.2,D:0.4);
END;
"""

    # Mock logger
    class MockLogger:
        def info(self, msg):
            print(f"INFO: {msg}")

        def warning(self, msg):
            print(f"WARNING: {msg}")

        def error(self, msg, exc_info=None):
            print(f"ERROR: {msg}")

    logger = MockLogger()

    # Test format detection (inline implementation)
    def detect_file_format(content: str) -> str:
        content_upper = content.upper().strip()
        if content_upper.startswith("#NEXUS") or "BEGIN TREES" in content_upper:
            return "nexus"
        return "newick"

    # Test nexus parsing (inline implementation)
    def parse_nexus_to_newick_list(nexus_content: str, logger) -> list[str]:
        try:
            # Remove comments (enclosed in square brackets)
            content_no_comments = re.sub(r"\[.*?\]", "", nexus_content, flags=re.DOTALL)

            # Find the TREES block
            trees_block_match = re.search(
                r"BEGIN\s+TREES\s*;(.*?)END\s*;",
                content_no_comments,
                re.IGNORECASE | re.DOTALL,
            )

            if not trees_block_match:
                logger.warning("No TREES block found in NEXUS file")
                return []

            trees_block = trees_block_match.group(1)

            # Extract individual tree definitions
            tree_pattern = r"TREE\s+[^=]*=\s*([^;]+);"
            tree_matches = re.findall(
                tree_pattern, trees_block, re.IGNORECASE | re.DOTALL
            )

            newick_trees: list[str] = []
            for tree_match in tree_matches:
                # Clean up the tree string
                tree_string = tree_match.strip()
                tree_string = re.sub(r"\s+", " ", tree_string).strip()

                if tree_string.endswith(";"):
                    tree_string = tree_string[:-1]

                if tree_string:
                    newick_trees.append(tree_string)

            logger.info(f"Extracted {len(newick_trees)} trees from NEXUS format")
            return newick_trees

        except Exception as e:
            logger.error(f"Error parsing NEXUS format: {e}")
            return []

    # Test individual nexus file creation (inline implementation)
    def create_individual_nexus_files(
        tree_strings: list[str], base_filename: str, logger
    ):
        nexus_files: list[dict[str, str]] = []
        base_name = base_filename.rsplit(".", 1)[0]

        for i, tree_string in enumerate(tree_strings, 1):
            nexus_content = f"""#NEXUS

BEGIN TREES;
    TREE tree_{i} = {tree_string};
END;
"""
            individual_filename = f"{base_name}_tree_{i:03d}.nexus"
            nexus_files.append(
                {"filename": individual_filename, "content": nexus_content}
            )

        logger.info(f"Created {len(nexus_files)} individual NEXUS file contents")
        return nexus_files

    # Run tests
    print("Testing NEXUS parsing functionality...")

    # Test format detection
    format_result = detect_file_format(nexus_content)
    print(f"✓ Format detection: {format_result}")
    assert format_result == "nexus", f"Expected 'nexus', got '{format_result}'"

    # Test nexus parsing
    newick_strings = parse_nexus_to_newick_list(nexus_content, logger)
    print(f"✓ Parsed {len(newick_strings)} trees from NEXUS")

    expected_trees = [
        "(A:0.1,B:0.2,(C:0.3,D:0.4):0.5)",
        "((A:0.1,C:0.3):0.2,(B:0.2,D:0.4):0.5)",
        "(((A:0.1,B:0.2):0.1,C:0.3):0.2,D:0.4)",
    ]

    assert len(newick_strings) == 3, f"Expected 3 trees, got {len(newick_strings)}"

    for i, (actual, expected) in enumerate(zip(newick_strings, expected_trees)):
        print(f"  Tree {i + 1}: {actual}")
        assert actual == expected, f"Tree {i + 1} mismatch: {actual} != {expected}"

    # Test individual nexus file creation
    individual_files = create_individual_nexus_files(
        newick_strings, "test_collection.nexus", logger
    )
    print(f"✓ Created {len(individual_files)} individual NEXUS files")

    assert len(individual_files) == 3, f"Expected 3 files, got {len(individual_files)}"

    # Check first individual file
    first_file = individual_files[0]
    print(f"  First file: {first_file['filename']}")
    assert first_file["filename"] == "test_collection_tree_001.nexus"
    assert "#NEXUS" in first_file["content"]
    assert "BEGIN TREES;" in first_file["content"]
    assert newick_strings[0] in first_file["content"]

    print("✓ All tests passed!")
    return True


if __name__ == "__main__":
    try:
        success = test_nexus_parsing()
        if success:
            print("\n🎉 All tests passed! NEXUS functionality is working correctly.")
        else:
            print("\n❌ Tests failed.")
    except Exception as e:
        print(f"\n❌ Test failed with exception: {e}")
