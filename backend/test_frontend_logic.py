#!/usr/bin/env python3

import sys
import io
sys.path.append('.')
from run import app

def simulate_has_actual_interpolation(metadata, tree_pair_solutions):
    """Simulate the frontend _hasActualInterpolation method"""
    print(f"[TEST] _hasActualInterpolation called with: {metadata['tree_name']}")
    
    # Check if this tree has a tree_pair_key (is interpolated)
    if not metadata.get('tree_pair_key'):
        print(f"[TEST] no tree_pair_key, returning False")
        return False
        
    # Check if the tree pair actually has s-edges (actual interpolation)
    pair_solution = tree_pair_solutions.get(metadata['tree_pair_key'])
    print(f"[TEST] pairSolution for {metadata['tree_pair_key']}: {bool(pair_solution)}")
    
    if not pair_solution:
        print(f"[TEST] no pairSolution, returning False")
        return False
        
    # Check if there are actual s-edges in the solution
    lattice_edge_solutions = pair_solution.get('lattice_edge_solutions', {})
    has_lattice_edges = (lattice_edge_solutions and 
                        isinstance(lattice_edge_solutions, dict) and 
                        len(lattice_edge_solutions) > 0)
    
    print(f"[TEST] lattice edge check: {lattice_edge_solutions.keys() if lattice_edge_solutions else 'None'}")
    print(f"[TEST] has_lattice_edges: {has_lattice_edges}")
    
    if not has_lattice_edges:
        print(f"[TEST] no lattice edges, returning False")
        return False
        
    # Has s-edges and is not the original tree
    is_interpolated = bool(metadata.get('step_in_pair'))
    
    print(f"[TEST] step_in_pair: {metadata.get('step_in_pair')}, is_interpolated: {is_interpolated}")
    print(f"[TEST] Final result: {is_interpolated}")
    
    return is_interpolated

def test_with_backend_data():
    """Test the logic with actual backend data"""
    print("=== TESTING FRONTEND LOGIC WITH BACKEND DATA ===")
    
    with app.test_client() as client:
        # Use minimal tree for faster testing
        newick = b'(A:1,B:1,(C:1,D:1):1);(A:1,(B:1,C:1):1,D:1);'
        data = {
            'treeFile': (io.BytesIO(newick), 'test.newick'),
            'windowSize': '2',
            'windowStepSize': '1',
        }
        resp = client.post('/treedata', data=data, content_type='multipart/form-data')
        
        if resp.status_code != 200:
            print(f"ERROR: {resp.get_json()}")
            return
            
        result = resp.get_json()
        tree_metadata = result['tree_metadata']
        tree_pair_solutions = result['tree_pair_solutions']
        
        print(f"Total trees: {len(tree_metadata)}")
        print(f"Tree pair solutions: {list(tree_pair_solutions.keys())}")
        
        # Test each tree
        print("\n=== TESTING EACH TREE ===")
        for i, metadata in enumerate(tree_metadata[:10]):  # Test first 10 trees
            print(f"\n--- Tree {i}: {metadata['tree_name']} ---")
            has_interpolation = simulate_has_actual_interpolation(metadata, tree_pair_solutions)
            print(f"Final hasInterpolation for {metadata['tree_name']}: {has_interpolation}")
        
        # Count expected results
        print("\n=== EXPECTED RESULTS SUMMARY ===")
        interpolated_count = 0
        original_count = 0
        
        for metadata in tree_metadata:
            if simulate_has_actual_interpolation(metadata, tree_pair_solutions):
                interpolated_count += 1
            else:
                original_count += 1
                
        print(f"Total trees: {len(tree_metadata)}")
        print(f"Expected interpolated trees: {interpolated_count}")
        print(f"Expected original trees: {original_count}")

if __name__ == "__main__":
    test_with_backend_data()