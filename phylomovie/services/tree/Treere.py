"""Main data management file by Maximilian Christian von der Linde, 29.02.2020"""
import io
# import Bio
# from Bio import Phylo
# import Bio.Nexus.Nexus
import re
import copy
from typing import List
import operator


class Treere:
    """treere holds all methods necessary to process the input data and build the additional trees needed for visualisation.

    Attributes:
        sorted_nodes: empty list for the nodes of the first tree.
        given_leaforder: List with user-specified order of leafs, or has value None if nothing was specified.
        step: optional integer if the user wants to specify a step size for the tree comparison.
        start: optional integer if the user wants to specify a starting point in the tree list (counting without 0).
        splitlist1: empty list for the splitlist of the first tree from the pair of trees that are being compared at that moment.
        splitlist2: empty list for the splitlist of the second tree from the pair of trees that are being compared at that moment.
        splitdict1: empty dictionary for the splitlist of the first tree, here the length of every node is documented.
        splitdict2: empty dictionary for the splitlist of the second tree, here the length of every node is documented.
    """

    def __init__(self, given_leaforder=None, step=1, start=1):
        """Inits the class treere"""
        self.given_leaforder = given_leaforder
        self.step = step
        self.start = start

        self.sorted_nodes = []  # empty list for the nodes of the first tree.

        self.splitlist1 = []
        self.splitlist2 = []
        self.splitdict1 = {}
        self.splitdict2 = {}

    def nexus_parser(self, nexus_input):
        """Parses a nexus input file.

        Only gets called if the input file is in the nexus format.
        Uses the convert() function from Biopython.Phylo to convert it into a newick file.
        Calls newick_purification with the newick file.

        Args:
            nexus_input: string representing the filename of the nexus file
        """
        input = io.StringIO(nexus_input)
        output = io.StringIO("")
        Bio.Phylo.convert(input, "nexus", output, "newick")
        txt = self.newick_purification(output.read())
        return txt

    def newick_purification(self, newick_txt: str) -> str:
        """Strips all unwanted data from a newick file.

        Deletes squared brackets and their content. Strips all empty newlines and spaces from the end of the file.
        Writes a new file called "pure_newick.nwk".

        Args:
            newick_input: string representing the filename of the newick file

        returns:
            cleaned newick string
        """
        result = re.sub("(\[).*?(\])+", "", newick_txt)        # delete all squared brackets with their content
        result = result.rstrip()                               # delete all empty newlines at the end of the file
        return result

    # --------------------------------------------------------------------------------
    # code from the internet
    # --------------------------------------------------------------------------------
    # Name:        Python Newick to JSON Parser
    # Purpose:     Reads the Newick-Topology/-Phylogeny Format into a JSON Structure
    #              JSON = { "name":node_label, "length":distance, "children":[{ "name":leaf_label, "length":distance }] }
    # Author:      aboes (few modification on code by Damian Kao - http://www.biostars.org/p/48424/#48442)
    #
    # Created:     03.06.2013
    # Licence:     CC-BY 3.0
    # --------------------------------------------------------------------------------
    # --------------------------------------------------------------------------------
    def parseNode(self, nwString):
        parenCount = 0

        tree = ''
        processed = ''
        index = 0
        for char in nwString:
            if char == "(":
                parenCount += 1
                if parenCount == 1:
                    continue
            elif char == ")":
                parenCount -= 1
                if parenCount == 0:
                    if index + 2 > len(nwString):
                        break
                    else:
                        tree = nwString[index + 2:]
                        break

            if char == ",":
                if parenCount != 1:
                    processed += "|"
                else:
                    processed += ","
            else:
                processed += char

            index += 1

        data = processed.split(',')

        for i in range(len(data)):
            data[i] = data[i].replace('|', ',')

        t = tree.strip()
        if t.find(":") == -1:
            label = t
            
            label = label.replace(".","-")                    

            print(label)
            
            dist = ""
        else:            
            label = t[:t.find(":")]
            
            label = label.replace(".","-")                    

            
            dist = t[t.find(":") + 1:]

        return (label, dist, data)

    def recurseBuild(self, nwString):
        nwString = nwString.replace(";", "")
        if nwString.find('(') == -1:
            if len(nwString.split(',')) == 1:
                if nwString.find(":") == -1:
                    label = nwString
                    dist = ""
                else:
                    
                    label = nwString[:nwString.find(":")]
                    
                    label = label.replace(".","-")                    
                                        
                    dist = float(nwString[nwString.find(":") + 1:])
                    
                return {"name": label, "length": dist}
            else:
                return nwString.split(',')
        else:
            label, dist, data = self.parseNode(nwString)

            label = label.replace(".","-")                    

            dataArray = []
            for item in data:
                dataArray.append(self.recurseBuild(item))

            return {"name": label, "length": dist, "children": dataArray}

    # --------------------------------------------------------------------------------
    # end of code from the internet
    # --------------------------------------------------------------------------------
    # recursion: listing all trees as json strings

    def json_list(self, purified_newick_string: str):
        """Builds the json-formatted treelist.
        Formats and adds only those trees to the json_treelist, that are either included in the interval with the step size
        or if it is the last tree of the tree list.
        Args:
            purified_newick_string: String generated by newick_purifier.

        Returns:
            json_treelist: List of json-formatted trees, that are supposed to be visualised according to the user-specified step size.
        """

        json_treelist = []  # Empty list where the json dict of each tree will be saved
        lines = purified_newick_string.splitlines()

        for i in range(self.start - 1, len(lines)):
            # iterate over only the trees that are in the step or if it is the last tree
            if (((i - self.start - 1) % (self.step) == 0) or (i == len(lines) - 1)):
                tree = lines[i]
                result = self.recurseBuild(tree)  # call the function that parses a newick tree and gives a json tree
                if len(result["children"]) == 1:
                    result = result["children"][0]
                json_treelist.append(result)
        return json_treelist

    def get_nodes(self, split):
        """Retrieves all leaf names from a json-formatted tree and saves them in sorted_nodes.

        Args:
            split: Python Dict with a json-formatted tree
        """
        for node in split:
            try:
                self.get_nodes(node["children"])  # We are at an inner node. Jump into the next split if possible
            except KeyError:  # if there is no next split, we are at an outer node and can add a nodelabel to the list.

                label = node["name"].replace(".","-")                            
                
                self.sorted_nodes.append(label)

    def check_order_validity(self, given_leaforder, sorted_nodes):
        """Function for checking whether the leaf order that was specified fits with the existing leafs.
        Args:
            given_leaforder: List of the user-specified leaf order.
            sorted_nodes: List of the existing leafs generated by get_nodes.
        Returns:
            sorted_nodes: see above. OR.
            given_leaforder: see above.
        """

        given = set(given_leaforder)
        sorted_nod = set(sorted_nodes)

        if given != sorted_nod:
            difference = given.symmetric_difference(
                sorted_nod)
            print("Unvalid leaf order. Check leaf(s): ", difference)  # temp, needs better way of displaying the error
            return sorted_nodes
        else:
            return given_leaforder

    # called by jsonTreelist_to_sortedConsensusTreelist. Does the iteration through the trees and the splits of each tree.
    # returns tuple with two entries: [0] = list, [1] = list
    def tree_traversal(self, split):
        """Recursive walking through the list of trees and through each tree itself.

        First, this function is called with the tree list as input. It iterates over each entry of split.
        When arriving at one element, tree_traversal is called with the branchset of said item as input.
        Once again, tree_traversal has a list of trees as input, this time those trees are subtrees of a inner node.
        If an element of the list is not an inner node but a leaf, several things happen:
        1) The name of the leaf gets changed to a integer according to its index in the attribute sorted_nodes.
        2) This integer gets appended to a list called leaflist.
        After looking through everything inside the branchset of a inner node, its name gets changed to a list of all leaf names occurring in its branchset.
        With the help of this the nodes inside a branchset can easily be sorted according to the integer value in their names.

        The other (consensus code) part is happening every time after the function arrives back at the root.
        By then it aready traversed through the current tree and saved each split in a splitlist.
        The consensus code now calls build_constree12 and build_constree34, where the consensus trees between the previous and the current tree are computed.
        Furthermore it is here where the leaf names get changed back to the original names.

        Args:
            split: List of dicts (json-formatted trees or subtrees).

        Returns:
            split: List of dicts (json-formatted trees or subtrees).
            leaflist: List of leafnames occurring in the list of trees that were given.
        """
        count = 0  # for orientation in the split list iteration
        leaflist = []  # list for all leafes that occur in any child of a inner node
        # check whether we are iterating through the list of all trees (if we are, no sorting is wanted at the end)
        not_listoftrees = True

        while count < len(split):
            item = split[count]

            # fault in the newick to json parser: sometimes length are saved as strings.
            if (type(item["length"] == str and item["length"]) != ''):
                try:
                    item["length"] = float(item["length"])  # this is fixed here.
                except ValueError:  # if no length is given, it is set to 1 (not sure if that's correct!)
                    item["length"] = 1

            if "children" in item:
                # look into each item of the split list. If the item has a "children", first sort the split inside that key.
                tmp = self.tree_traversal(item["children"])
                split[count]["children"] = tmp[0]  # update the key (branchset) to the sorted version of itself.
                child_leaflist = tmp[1]  # get the leaf names included in that child
                child_leaflist.sort()  # key = lambda i : sorted_nodes.index(i)
                split[count]["name"] = child_leaflist  # rename the inner node to a collection of its leafes
                leaflist.extend(child_leaflist)  # extend the leaflist by all collected leafes
                self.splitlist2.append(split[count]["name"])
                # save the name and length of the current node in the dict
                self.splitdict2[f'{item["name"]}'] = item["length"]
            else:
                # append the index of the name to the leaflist if it is a leaf
                leaflist.append(self.sorted_nodes.index(item["name"]))
                # change the leaf name to its index number for sorting
                item["name"] = self.sorted_nodes.index(item["name"])
                self.splitlist2.append([split[count]["name"]])  # append the nodename in the splitlist as list obj
                # save the name and length of the current node in the dict
                self.splitdict2[f'{[item["name"]]}'] = item["length"]

            # Consensus code
            if type(
                    item["name"]) != int and len(
                    item["name"]) == len(
                    self.sorted_nodes):  # if we are at the ROOT NODE (after the tree traversal took place)
                if self.splitlist1 != []:  # if we already have a old splitlist (= if we are not at the very first tree)
                    self.compare_splitlists(self.splitlist1, self.splitlist2, self.splitdict1, self.splitdict2)

                    previous_tree = split[count - 1]  # = the previous tree, where the the transition starts
                    # build the input for build_constree12 (needs branchset lists as input)
                    tree1 = previous_tree["children"]
                    constree1 = copy.deepcopy(tree1)  # deepcopies are time consuming, but have to be made
                    constree2 = copy.deepcopy(tree1)
                    new_trees = self.build_constree12(tree1, constree1, constree2)[1:3]  # get the two constrees

                    current_tree = split[count]
                    tree2 = current_tree["children"]
                    constree3 = copy.deepcopy(tree2)
                    constree4 = copy.deepcopy(tree2)
                    if count == len(split)-1:  # if we are at the last tree of the tree list, the leaf names of that tree need to be renamed now
                        new_trees.extend(self.build_constree34(tree2, constree3, constree4, lasttree=True)[1:3])
                    else:
                        new_trees.extend(self.build_constree34(tree2, constree3, constree4)[1:3])

                    for i in range(
                            len(new_trees)):  # assign each constree their root, to obtain the same data structure as before the build_constree
                        new_trees[i] = {"name": item["name"], "length": item["length"], "children": new_trees[i]}
                    
                    split[count:count] = new_trees  # add the two consesus trees derived from tree 1
                    count += len(new_trees)

                    not_listoftrees = False  # we want no sorting after the iteration

                self.splitlist1 = self.splitlist2  # make the new list to the old list
                self.splitdict1 = self.splitdict2  # make the new dict to the old dict

                # reset the list and dict for the next tree
                self.splitlist2 = []
                self.splitdict2 = {}
            # except TypeError:
            #   pass

            count += 1

        if not_listoftrees:
            # sorts a list of dicts by the list "sorted_nodes" so that all subtrees have the same node order.
            split.sort(key=lambda i: i["name"][0] if ("children" in i) else i["name"])

        return split, leaflist

    def compare_splitlists(self, splitlist1, splitlist2, splitdict1, splitdict2):
        """Compares the splitlists of the current tree pair and produces plans for the consensus tree construction.

        The plans for the consensus trees are in the form of dictionaries and contain the node names as key and lengths as values for each node.
        Consensus tree 2 and 3 are the ones that have the constructed multifurcations, so some of their inner nodes can have the value None.
        This happens when that inner node is not present in the other tree.

        Args:
            splitlist1: List of splits from the previous tree (tree 1 of the tree pair).
            splitlist2: List of splits from the current tree (tree 2 of the tree pair).
            splitdict1: Dict with all node labels of tree 1 as keys and their respective lengths as value.
            splitdict2: Dict with all node labels of tree 2 as keys and their respective lengths as value.
        """

        splitlist2.sort()  # sort by the integers included in the item
        splitlist2.sort(key=len, reverse=True)  # sort by length of the item (has priority)
        splitlist1.sort()  # sort by the integers included in the item
        splitlist1.sort(key=len, reverse=True)  # sort by length of the item (has priority)

        self.consdict1 = {}
        self.consdict2 = {}
        self.consdict3 = {}
        self.consdict4 = {}
        for i in splitlist1:
            i_str = f'{i}'
            if i in splitlist2:
                self.consdict1[i_str] = (splitdict1[i_str] + splitdict2[i_str]) / 2
                self.consdict2[i_str] = (splitdict1[i_str] + splitdict2[i_str]) / 2
            else:
                self.consdict1[i_str] = 0
                self.consdict2[i_str] = False

        for i in splitlist2:
            i_str = f'{i}'
            if i in splitlist1:
                self.consdict4[i_str] = (splitdict1[i_str] + splitdict2[i_str]) / 2
                self.consdict3[i_str] = (splitdict1[i_str] + splitdict2[i_str]) / 2
            else:
                self.consdict4[i_str] = 0
                self.consdict3[i_str] = False

    def build_constree12(self, tree1, constree1, constree2):  # rename leafs of tree1, build constree1 and constree2
        """Goes through tree 1, constree 1 and constree 2 recursively and adapts the consensus trees according to the cons dicts.

        This function works similar to tree_traversal, but it traverses through tree 1 and the two intermediate trees derived from tree 1 at the same time.
        For tree 1 only the leafnames get changed.
        The intermediate trees (constree1 and constree2) get changed according to consdict1 and consdict2.

        If the algorithm lands at a inner node, constree1 only adapts the node length (if it is a node not present in tree 2, the length will be 0).
        For constree2, the algorithm checks whether the node has a length or "None" in consdict2. If "None", the node gets deleted and its branchset added to the last node.

        If the algorithm lands at a leaf, only lengths get adapted.

        Args:
            tree1: List of json-formatted trees (dicts) from a branchset of tree 1.
            constree1: List of json-formatted trees (dicts) from a branchset of the first intermediate tree.
            constree2: List of json-formatted trees (dicts) from a branchset of the second intermediate tree.

        Returns:
            tree1: List of json-formatted trees (dicts) from a branchset of tree 1, now with renamed leaf labels (the actual names).
            constree1: List of json-formatted trees (dicts) from a branchset of the first intermediate tree, now with adapted lengths.
            constree2: List of json-formatted trees (dicts) from a branchset of the second intermediate tree, now with adapted lengths and multifurcations.
        """
        count_constree2 = 0
        for i in range(0, len(tree1)):
            if "children" in tree1[i]:
                temp_subtreelist = self.build_constree12(
                    tree1[i]["children"],
                    constree1[i]["children"],
                    constree2[count_constree2]["children"])
                tree1[i]["children"] = temp_subtreelist[0]
                constree1[i]["children"] = temp_subtreelist[1]
                constree2[count_constree2]["children"] = temp_subtreelist[2]

                # adapt the length of the innner node according to consdict1
                constree1[i]["length"] = self.consdict1[f'{tree1[i]["name"]}']
                # if consdict2 says the inner node has to be deleted
                if self.consdict2[f'{constree2[count_constree2]["name"]}'] == False:
                    insert_nodes = len(constree2[count_constree2]["children"])
                    # insert the branchset behind the position where the inner node will be deleted
                    constree2[count_constree2 + 1: count_constree2 + 1] = constree2[count_constree2]["children"]
                    del constree2[count_constree2]  # delete the inner node

                    # adapt the count of constree2 so that it does not iterate over the inserted nodes
                    count_constree2 = count_constree2 + insert_nodes - 1
                else:
                    # if the inner node is still there, get the consensus length
                    constree2[count_constree2]["length"] = self.consdict1[f'{tree1[i]["name"]}']

            else:

                # adapt the length of the consensus nodes
                constree1[i]["length"] = self.consdict1[f'[{constree1[i]["name"]}]']
                constree2[count_constree2]["length"] = self.consdict1[f'[{constree2[count_constree2]["name"]}]']

                tree1[i]["name"] = self.sorted_nodes[tree1[i]["name"]]  # give the leaf its proper name back
                constree1[i]["name"] = self.sorted_nodes[constree1[i]["name"]]
                constree2[count_constree2]["name"] = self.sorted_nodes[constree2[count_constree2]["name"]]
                # print("leaf END", tree1[i]["name"], constree2[count_constree2]["name"]) # temp

            count_constree2 += 1

        return [tree1, constree1, constree2]

    # do NOT rename leafs of tree2 (exept if we are at the last tree), build constree3 and constree4
    def build_constree34(self, tree2, constree3, constree4, lasttree=False):
        """Goes through tree 2, constree 3 and constree 4 recursively and adapts the consensus trees according to the cons dicts.

        This function works similar to tree_traversal, but it traverses through tree 2 and the two intermediate trees derived from tree 2 at the same time.
        For tree 2 the leafnames do NOT get changed as long as it is not the last tree of the whole tree list.
        The intermediate trees (constree3 and constree4) get changed according to consdict3 and consdict4.

        If the algorithm lands at an inner node, constree4 only adapts the node length (if it is a node not present in tree 1, the length will be 0).
        For constree3, the algorithm checks whether the node has a length or "None" in consdict3. If "None", the node gets deleted and its branchset added to the last node.

        If the algorithm lands at a leaf, only lengths get adapted.

        Args:
            tree2: List of json-formatted trees (dicts) from a branchset of tree 2.
            constree3: List of json-formatted trees (dicts) from a branchset of the third intermediate tree.
            constree4: List of json-formatted trees (dicts) from a branchset of the fourth intermediate tree.

        Returns:
            tree2: List of json-formatted trees (dicts) from a branchset of tree 2.
            constree3: List of json-formatted trees (dicts) from a branchset of the third intermediate tree, now with adapted lengths and multifurcations.
            constree4: List of json-formatted trees (dicts) from a branchset of the fourth intermediate tree, now with adapted lengths.
        """
        count_constree3 = 0
        for i in range(0, len(tree2)):
            if "children" in tree2[i]:
                temp_subtreelist = self.build_constree34(
                    tree2[i]["children"],
                    constree4[i]["children"],
                    constree3[count_constree3]["children"],
                    lasttree=lasttree)
                tree2[i]["children"] = temp_subtreelist[0]
                constree3[count_constree3]["children"] = temp_subtreelist[1]
                constree4[i]["children"] = temp_subtreelist[2]

                # adapt the length of the innner node according to consdict4
                constree4[i]["length"] = self.consdict4[f'{tree2[i]["name"]}']
                # if consdict3 says the inner node has to be deleted
                if self.consdict3[f'{constree3[count_constree3]["name"]}'] == False:
                    insert_nodes = len(constree3[count_constree3]["children"])
                    # insert the branchset behind the position where the inner node will be deleted
                    constree3[count_constree3+1:count_constree3+1] = constree3[count_constree3]["children"]
                    del constree3[count_constree3]  # delete the inner node

                    # adapt the count of constree3 so that it does not iterate over the inserted nodes
                    count_constree3 = count_constree3 + insert_nodes - 1
                else:
                    # if the inner node is still there, get the consensus length
                    constree3[count_constree3]["length"] = self.consdict4[f'{tree2[i]["name"]}']

            else:

                # adapt the length of the consensus nodes
                constree4[i]["length"] = self.consdict4[f'[{constree4[i]["name"]}]']
                constree3[count_constree3]["length"] = self.consdict4[f'[{constree3[count_constree3]["name"]}]']

                if lasttree:
                    # give the leaf of the last tree in the tree list its proper name back
                    tree2[i]["name"] = self.sorted_nodes[tree2[i]["name"]]
                constree4[i]["name"] = self.sorted_nodes[constree4[i]["name"]]
                constree3[count_constree3]["name"] = self.sorted_nodes[constree3[count_constree3]["name"]]
                # print("leaf END", tree2[i]["name"], constree3[count_constree3]["name"])

            count_constree3 += 1

        return [tree2, constree3, constree4]

    def jsonTreelist_to_sortedConsensusTreelist(self, json_treelist):
        """Calls methods to convert the json_treelist from newick_parser to the completed list of trees with sorted nodes and consensus trees.
        Args:
            json_treelist: List of json-formatted trees (dicts) acquired from newick_parser.
        Returns:
            sorted_consensus_json_treelist: List of json-formatted trees (dicts) with sorted nodes and all consensus trees.
        """
        # root node
        firsttree = json_treelist[0]["children"]

        self.get_nodes(firsttree)

        if self.given_leaforder:
            self.sorted_nodes = self.check_order_validity(self.given_leaforder, self.sorted_nodes)
        sorted_consensus_json_treelist = self.tree_traversal(json_treelist)[0]
        return sorted_consensus_json_treelist


    def from_nexus_to_sorted_treelist(self, txt: str) -> List[dict]:
        """Transforms a nexus string list to a list of json objects"""
        purified_newick_strings = self.nexus_parser(txt)

        json_tree_list = self.json_list(purified_newick_strings)

        interpolated_tree_list = self.jsonTreelist_to_sortedConsensusTreelist(json_tree_list)

        return interpolated_tree_list


    def from_newick_to_sorted_treelist(self, newick_string):
        
        """Transforms a newline delimited newick string list to a list of json objects"""
        purified_newick_strings = self.newick_purification(newick_string)

        json_tree_list = self.json_list(purified_newick_strings)
        interpolated_tree_list = self.jsonTreelist_to_sortedConsensusTreelist(json_tree_list)

        return interpolated_tree_list

    def initiate_leave_order(self, node):
        if('children' in node.keys()):
            for child in node['children']:
                self.denote_leaves_with_order(child)
            node['children'].sort(key=operator.itemgetter('leave_order_index'))

    def denote_leaves_with_order(self, node, i=0):
        if('children' in node.keys()):
            for child in node['children']:
                self.denote_leaves_with_order(child, i )
            node['leave_order_index'] = 99999
            node['tree_order_index'] = 99999
        else:
            node['leave_order_index'] = self.sorted_nodes.index(node['name'])
            node['tree_order_index'] = i
            i = i + 1


    def input_manager(self, text, filename):
        """Transforms a tree as an input string (newick or nexus) to json tree"""
        if filename.endswith("nex"):
            return self.from_nexus_to_sorted_treelist(text)
        else:
            return self.from_newick_to_sorted_treelist(text)


# for backend testing purposes: enables one to execute code when calling the script directly
# if __name__ == "__main__":
#    pass
    # f = open("alltrees-order.txt", "r")
    # orderFileText = f.read()
    # orderFileList = orderFileText.split(",")

    # with open("./test-data/tree_reconstructed_test_3.txt") as f:
    #    txt = f.read()
    #
    #treeRe = Treere()
    #
    #tree_list = treeRe.input_manager(txt, "tree_reconstructed_test_3.txt")
    #
    #to_be_highlighted_leaves = find_to_be_highlighted_leaves(tree_list, treeRe.sorted_nodes, find_tree_highlights_test_3)
