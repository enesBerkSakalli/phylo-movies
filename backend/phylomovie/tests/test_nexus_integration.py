#!/usr/bin/env python3
"""
Integration test for NEXUS file support in the phylo-movies backend.
This script uploads a NEXUS file to the running backend and verifies
that it correctly parses multiple trees and returns individual NEXUS files.
"""

import requests
import json
import os


def test_nexus_upload():
    """Test uploading a NEXUS file to the backend."""
    backend_url = "http://127.0.0.1:5002"

    # Check if sample NEXUS file exists
    nexus_file_path = "/Users/berksakalli/Projects/phylo-movies/sample_trees.nexus"
    if not os.path.exists(nexus_file_path):
        print(f"❌ Sample NEXUS file not found at {nexus_file_path}")
        return False

    # Read the NEXUS file
    with open(nexus_file_path, "r") as f:
        nexus_content = f.read()

    print(f"📁 Testing NEXUS file upload with content:")
    print(f"📄 First 200 characters: {nexus_content[:200]}...")
    print()

    try:
        # Prepare the file upload
        files = {
            "treeFile": (
                "sample_trees.nexus",
                nexus_content,
                "application/octet-stream",
            )
        }

        # Make the request
        print(f"🚀 Uploading NEXUS file to {backend_url}/treedata...")
        response = requests.post(f"{backend_url}/treedata", files=files, timeout=30)

        print(f"📊 Response status: {response.status_code}")

        if response.status_code != 200:
            print(f"❌ Upload failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False

        # Parse the response
        try:
            result = response.json()
        except json.JSONDecodeError:
            print(f"❌ Failed to parse JSON response")
            print(f"Response: {response.text}")
            return False

        # Check the response structure
        print(f"✅ Upload successful! Checking response structure...")

        # Print key response fields
        if "tree_list" in result:
            print(f"📊 Number of tree_list entries: {len(result['tree_list'])}")
        else:
            print(f"❌ No 'tree_list' field in response")

        if "individual_nexus_files" in result:
            nexus_files = result["individual_nexus_files"]
            print(f"📄 Number of individual NEXUS files: {len(nexus_files)}")

            # Show a sample of the individual NEXUS files
            for i, nexus_file in enumerate(nexus_files):
                filename = nexus_file.get("filename", f"file_{i}")
                content = nexus_file.get("content", "")
                print(f"  📁 {filename}: {len(content)} characters")
                if i == 0:  # Show first file content preview
                    print(f"     Preview: {content[:100]}...")
        else:
            print(f"❌ No 'individual_nexus_files' field in response")

        # Print other interesting fields
        for key in ["success", "error", "processing_info"]:
            if key in result:
                print(f"🔍 {key}: {result[key]}")

        # Verify that we got the expected structure
        success = True
        if "tree_list" not in result:
            print(f"❌ Missing 'tree_list' field")
            success = False
        elif len(result["tree_list"]) == 0:
            print(f"❌ No trees were parsed")
            success = False

        if "individual_nexus_files" not in result:
            print(f"❌ Missing 'individual_nexus_files' field")
            success = False
        elif len(result["individual_nexus_files"]) == 0:
            print(f"❌ No individual NEXUS files were generated")
            success = False

        if success:
            print(f"✅ Integration test PASSED! NEXUS support is working correctly.")
        else:
            print(f"❌ Integration test FAILED!")

        return success

    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


if __name__ == "__main__":
    print("🧪 Starting NEXUS integration test...")
    print("=" * 60)

    success = test_nexus_upload()

    print("=" * 60)
    if success:
        print("🎉 All tests passed! NEXUS file support is working.")
    else:
        print("💥 Tests failed. Check the backend implementation.")
