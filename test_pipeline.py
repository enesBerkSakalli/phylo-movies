#!/usr/bin/env python3
import sys
import os
sys.path.append('../backend')

from services.tree_operations import TreeProcessor
from brancharchitect.io import parse_newick
import json

# Test with a simple tree file
test_file = "../data/small_example/small_example.trees"

if os.path.exists(test_file):
    print(f"Processing {test_file}...")
    
    # Read the tree file
    with open(test_file, 'r') as f:
        tree_content = f.read()
    
    # Parse trees
    trees = parse_newick(tree_content)
    print(f"Parsed {len(trees)} trees")
    
    # Create processor and interpolate
    processor = TreeProcessor(trees, enable_rooting=False)
    result = processor.interpolate_trees(trees)
    
    print(f"Result type: {type(result)}")
    print(f"Result keys: {list(result.keys()) if isinstance(result, dict) else 'Not a dict'}")
    
    # Print structure info
    if isinstance(result, dict):
        for key, value in result.items():
            print(f"\n{key}:")
            if isinstance(value, list):
                print(f"  List with {len(value)} items")
                if value:
                    print(f"  First item type: {type(value[0])}")
                    if hasattr(value[0], '__dict__'):
                        print(f"  First item attributes: {list(value[0].__dict__.keys())}")
            elif isinstance(value, dict):
                print(f"  Dict with keys: {list(value.keys())}")
            else:
                print(f"  Type: {type(value)}, Value: {value}")
    
    # Save to JSON for analysis
    try:
        with open('pipeline_result.json', 'w') as f:
            json.dump(result, f, indent=2, default=str)
        print(f"\nResult saved to pipeline_result.json")
    except Exception as e:
        print(f"Error saving JSON: {e}")
        
else:
    print(f"Test file not found: {test_file}")
    print("Available files:")
    for root, dirs, files in os.walk("../data"):
        for file in files:
            if file.endswith('.trees') or file.endswith('.tree'):
                print(f"  {os.path.join(root, file)}")