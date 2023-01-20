from ete3 import Tree, TreeNode
import numpy 

tree = Tree("(A,(C,(E,F)));")
tree_list = []
leaf_names = set(tree.get_leaf_names())


def conditional_function(node ,name):
    if(node.is_leaf()):
        return False
    else:
        for i in node.traverse():
            if i.name != name and not i.is_root():
                return True
            else:
                return False

for detach_leaf_name in leaf_names:
     tree_copy_1 = tree.copy()
     for node in filter(lambda node : conditional_function(node, detach_leaf_name), tree_copy_1.traverse()):
        print("Tree before")
        print(tree)
        print("\n")
        tree_copy_1.copy()
        tree_copy_1.prune([detach_leaf_name])

        print("Detach",detach_leaf_name,"\n", tree_copy_1, "\n")
        print("The node where the nodes is going to be attached",node)
        # node.add_child(detach_leaf)
        print("new Tree")
        # print(prune_stuff) 
        print("------------------------------------------------")
        