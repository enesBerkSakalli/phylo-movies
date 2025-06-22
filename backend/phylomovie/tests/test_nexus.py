#!/usr/bin/env python3
"""
Test script for nexus file parsing functionality.
"""

import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, "/Users/berksakalli/Projects/phylo-movies/backend")


def test_nexus_parsing():
    """Test the nexus parsing functionality."""

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

    # Import the functions we want to test
    try:
        from phylomovie.tree_processing.core import (
            _parse_nexus_to_newick_list,
            _create_individual_nexus_files,
            _detect_file_format,
        )

        print("✓ Successfully imported nexus parsing functions")

        # Test format detection
        format_result = _detect_file_format(nexus_content)
        print(f"✓ Format detection: {format_result}")
        assert format_result == "nexus", f"Expected 'nexus', got '{format_result}'"

        # Test nexus parsing
        newick_strings = _parse_nexus_to_newick_list(nexus_content, logger)
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
        individual_files = _create_individual_nexus_files(
            newick_strings, "test_collection.nexus", logger
        )
        print(f"✓ Created {len(individual_files)} individual NEXUS files")

        assert len(individual_files) == 3, (
            f"Expected 3 files, got {len(individual_files)}"
        )

        # Check first individual file
        first_file = individual_files[0]
        print(f"  First file: {first_file['filename']}")
        assert first_file["filename"] == "test_collection_tree_001.nexus"
        assert "#NEXUS" in first_file["content"]
        assert "BEGIN TREES;" in first_file["content"]
        assert newick_strings[0] in first_file["content"]

        print("✓ All tests passed!")
        return True

    except ImportError as e:
        print(f"✗ Import error: {e}")
        return False
    except Exception as e:
        print(f"✗ Test failed: {e}")
        return False


if __name__ == "__main__":
    print("Testing NEXUS parsing functionality...")
    success = test_nexus_parsing()
    if success:
        print("\n🎉 All tests passed! NEXUS functionality is working correctly.")
        sys.exit(0)
    else:
        print("\n❌ Tests failed.")
        sys.exit(1)
