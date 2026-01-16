
import json

try:
    with open('data/small_example/small_example.response.json', 'r') as f:
        data = json.load(f)
    
    if 'tree_pair_solutions' in data:
        print("tree_pair_solutions keys:", list(data['tree_pair_solutions'].keys()))
        first_key = list(data['tree_pair_solutions'].keys())[0]
        first_sol = data['tree_pair_solutions'][first_key]
        print(f"\nStructure for {first_key}:")
        print("jumping_subtree_solutions:", json.dumps(first_sol.get('jumping_subtree_solutions'), indent=2))
    else:
        print("tree_pair_solutions NOT found in JSON")

except Exception as e:
    print(f"Error: {e}")
