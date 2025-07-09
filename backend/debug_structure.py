#!/usr/bin/env python3

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from services.movie_data import MovieData
import json

# Create a simple test with the API
import requests

def test_structure():
    """Test the actual structure of lattice_edge_solutions"""
    
    # Simple test tree data
    test_newick = "(A,B,(C,D));"
    
    # Send to API
    files = {'treeFile': ('test.newick', test_newick)}
    data = {'windowSize': '2', 'windowStepSize': '1'}
    
    try:
        response = requests.post('http://localhost:5000/treedata', files=files, data=data)
        if response.status_code == 200:
            result = response.json()
            
            print("=== ACTUAL TREE PAIR SOLUTIONS STRUCTURE ===")
            tree_pair_solutions = result.get('tree_pair_solutions', {})
            
            if tree_pair_solutions:
                # Get first pair solution
                first_pair_key = list(tree_pair_solutions.keys())[0]
                first_solution = tree_pair_solutions[first_pair_key]
                
                print(f"First pair key: {first_pair_key}")
                print(f"Solution keys: {list(first_solution.keys())}")
                
                # Check lattice_edge_solutions structure
                lattice_edge_solutions = first_solution.get('lattice_edge_solutions', {})
                print(f"lattice_edge_solutions type: {type(lattice_edge_solutions)}")
                print(f"lattice_edge_solutions keys: {list(lattice_edge_solutions.keys())}")
                
                if lattice_edge_solutions:
                    # Get first lattice edge solution
                    first_key = list(lattice_edge_solutions.keys())[0]
                    first_value = lattice_edge_solutions[first_key]
                    print(f"First lattice edge key: {first_key}")
                    print(f"First lattice edge value type: {type(first_value)}")
                    print(f"First lattice edge value: {first_value}")
                    
                    # Check if it's a nested structure
                    if isinstance(first_value, list) and len(first_value) > 0:
                        print(f"First value is list with {len(first_value)} items")
                        if len(first_value) > 0:
                            print(f"First item type: {type(first_value[0])}")
                            print(f"First item value: {first_value[0]}")
                
                print("\n=== FULL STRUCTURE ===")
                print(json.dumps(first_solution, indent=2))
                
            else:
                print("No tree_pair_solutions found")
                
        else:
            print(f"API call failed with status {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_structure()