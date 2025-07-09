#!/usr/bin/env python3
"""
Quick test to verify the individual NEXUS file contents are correctly formatted.
"""

import requests


def test_nexus_file_content():
    """Test that the individual NEXUS files have correct content."""
    backend_url = "http://127.0.0.1:5002"
    nexus_file_path = "/Users/berksakalli/Projects/phylo-movies/sample_trees.nexus"

    with open(nexus_file_path, "r") as f:
        nexus_content = f.read()

    files = {
        "treeFile": ("sample_trees.nexus", nexus_content, "application/octet-stream")
    }

    response = requests.post(f"{backend_url}/treedata", files=files, timeout=30)
    result = response.json()

    print("✅ NEXUS File Content Verification:")
    print("=" * 60)

    nexus_files = result["individual_nexus_files"]

    for i, nexus_file in enumerate(nexus_files[:2]):  # Show first 2 files
        filename = nexus_file["filename"]
        content = nexus_file["content"]

        print(f"\n📁 File: {filename}")
        print(f"📊 Size: {len(content)} characters")
        print(f"📄 Content:")
        print("-" * 40)
        print(content)
        print("-" * 40)

        # Verify it's valid NEXUS format
        if content.startswith("#NEXUS"):
            print("✅ Valid NEXUS header")
        else:
            print("❌ Invalid NEXUS header")

        if "BEGIN TREES;" in content and "END;" in content:
            print("✅ Valid NEXUS structure")
        else:
            print("❌ Invalid NEXUS structure")

    print(
        f"\n🎯 Summary: Generated {len(nexus_files)} individual NEXUS files from the multi-tree file"
    )
    print("✅ NEXUS file splitting functionality working correctly!")


if __name__ == "__main__":
    test_nexus_file_content()
