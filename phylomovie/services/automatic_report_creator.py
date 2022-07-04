from ete3 import Tree, TextFace, TreeStyle, NodeStyle
import datetime
import os.path
import traceback
from os.path import join
from phylomovie.services.test_tree_coloring import _test_highlighting_algorithm, algorithms, test_data_list
import sys

TEXT = """

## {title}

<span>
    ![{fig1desc}]({figure1})
    ![{fig2desc}]({figure2})
</span>

{description}

"""

TEXT_WITHOUT_FIGURE = """

## {title}

{newick1}

{newick2}

{description}
"""

PREAMBLE=f"""
---
title: "Report"
author: "Enes Sakalli"
date: "`{datetime.datetime.now()}"
headers-includes: |
    \\usepackage{{float}}
    \\floatplacement{{figure}}{{H}}
header-includes: |
  <style>
  body{{ max-width: 75%; }}
  </style>

---
"""


PATH = "phylomovie/services/reports/auto"
PATH_PICTURES = "phylomovie/services/reports/auto/tree_pictures"


sys.path.append(".")

# converting command pandoc report.md -o report.html --standalone

def make_test_algo(path, description, algorithm, expected_results, generate_figures):
    r = _test_highlighting_algorithm(
        path, description, algorithm, expected_results, strict=False, output=False)

    worked, highlighted_taxa = r

    try:
        newicks = (read_file(path))

        newick1, newick2, *_ = newicks

        l = os.path.basename(path)
        title = l + "_" + algorithm.__name__
        desc = f"{description} \n\n works: {worked}"
        desc = desc + f" Expected: {expected_results}\n Algorithm: {highlighted_taxa}\n"

        print(title)

        if generate_figures:
            path1 = generate_figure(newick1, l+"1", PATH_PICTURES,
                                highlighted_taxa, expected_results, algorithm.__name__, text="FT1")
            path2 = generate_figure(newick2, l+"2", PATH_PICTURES, highlighted_taxa,  expected_results, algorithm.__name__, "FT2")

            section = (make_section_with_figure(title, f"./tree_pictures/{os.path.basename(path1)}",
                                  f"./tree_pictures/{os.path.basename(path2)}", desc, "Tree1", "Tree2"))
        else:
            section = make_section_without_figure(title, desc, newick1, newick2)

        result = ([algorithm.__name__, f"{path}", worked, title])

        return section, result

    except Exception as e:
        print(f"File didnt work: {path}")
        traceback.print_exc()


def generate_figure(s, prefix, tmpdir, highlighted_taxa, results, algorithm_name, text=""):
    t = Tree(s, format=1)

    for node in t.traverse("levelorder"):

        # Hide node circles

        node.img_style['size'] = 0

        algorithm_worked = highlighted_taxa[0] in results[0]

        nst1 = NodeStyle()

        nst1["bgcolor"] = "LightSteelBlue"

        if node.is_leaf():

            if(len(highlighted_taxa[0]) > 0):

                if node.name in highlighted_taxa[0] and any(node.name in r for r in results[0]):

                    name_face = TextFace(
                        node.name, fgcolor="green", fsize=4, bold=True)

                    name_face.rotation = -90

                    node.add_face(name_face, column=0, position='aligned')

                elif node.name in highlighted_taxa[0] and all(node.name not in r for r in results[0]):

                    name_face = TextFace(
                        node.name, fgcolor="red", fsize=4, bold=True)

                    name_face.rotation = - 90

                    node.add_face(name_face, column=0,
                                  position='aligned')

                elif node.name not in highlighted_taxa[0] and not algorithm_worked and any(node.name in r for r in results[0]):
                    name_face = TextFace(
                        node.name, fgcolor="blue", fsize=4, bold=True)

                    name_face.rotation = - 90

                    node.add_face(name_face, column=0,
                                  position='aligned')

                elif node.name not in highlighted_taxa[0] and all(node.name not in r for r in results[0]):
                    name_face = TextFace(
                        node.name, fgcolor="black", fsize=4, bold=True)

                    name_face.rotation = - 90

                    node.add_face(name_face, column=0,
                                  position='aligned')
                else:
                    name_face = TextFace(
                        node.name, fgcolor="black", fsize=4, bold=True)

                    name_face.rotation = - 90

                    node.add_face(name_face, column=0,
                                  position='aligned')

            else:
                name_face = TextFace(
                    node.name, fgcolor="black", fsize=4, bold=True)
                node.add_face(name_face, column=0, position='aligned')

    ts = TreeStyle()

    ts.mode = "c"

    ts.scale = 10

    ts.layout_fn

    ts.rotation = 90

    ts.root_opening_factor = 1

    ts.show_leaf_name = False

    ts.show_scale = False

    ts.draw_guiding_lines = True

    style = NodeStyle()
    style["fgcolor"] = "#ffffff"
    style["size"] = 0
    style["vt_line_color"] = "#000000"
    style["hz_line_color"] = "#000000"
    style["vt_line_width"] = 1
    style["hz_line_width"] = 1
    style["vt_line_type"] = 0  # 0 solid, 1 dashed, 2 dotted
    style["hz_line_type"] = 0

    for n in t.traverse():
        n.set_style(style)

    path = join(f"{tmpdir}", f"{prefix}-{algorithm_name}-tree.svg")

    t.render(path, h=100, units="mm", tree_style=ts)

    return path


def read_file(path):
    with open(path, mode="r") as f:
        l = f.readlines()
    l = [s.strip() for s in l]
    return l


def make_table(ll, make_links=True):

    ll = [(algorithm, path.replace("./phylomovie/services/test-data/", ""), worked, anchor)
          for algorithm, path, worked, anchor in ll]

    algorithms = []
    paths = []
    for x in ll:
        algorithm, p, worked, anchor = x
        if algorithm not in algorithms:
            algorithms.append(algorithm)
        if p not in paths:
            paths.append(p)

    algorithms_per_example = {path: [] for path in paths}

    for algorithm, p, worked, anchor in ll:
        algorithms_per_example[p].append((worked, anchor))

    header_line = "|Example|" + "|".join(algorithms)
    second_line = "|---" * (len(algorithms)+1) + "|"

    lines = [header_line, second_line]

    for path in paths:
        algo_line = []
        algo_line.append(path)
        for worked, anchor in algorithms_per_example[path]:
            wo = '<span style="color:green">Worked</span>'
            if not worked:
                wo = '<span style="color:red">Fail</span>'
            if make_links:
                wo = f"[{wo}](#{anchor})"
            algo_line.append(wo)

        lines.append("|".join(algo_line))

    return "\n".join(lines)


def make_section_with_figure(title, figure1, figure2, description, fig1desc, fig2desc):
    return TEXT.format(title=title, figure1=figure1, figure2=figure2,
                       description=description,
                       fig1desc=fig1desc, fig2desc=fig2desc)

def make_section_without_figure(title, description, newick1, newick2):
    return TEXT_WITHOUT_FIGURE.format(title=title, 
                       description=description,
                       newick1=newick1, newick2=newick2)


def generate_data(generate_figures=True, algorithm_filter=lambda x: True, path_filter=lambda x: True):

    results_for_table = []
    list_of_things = []

    for algorithm in algorithms:

        if not algorithm_filter(algorithm.__name__):
            continue

        list_of_things.append(f"# {algorithm.__name__}")

        for path, description, _, expected_results in test_data_list:

            if not path_filter(path):
                continue

            r =  make_test_algo(path, description, algorithm, expected_results, generate_figures)
            if r:
                section, result = r

                list_of_things.append(section)
                results_for_table.append(result)

    return results_for_table, list_of_things

def main(make_figures=True, outpath=None, algorithm_filter=lambda x: True, path_filter=lambda x: True):
    if outpath is None:
        outpath = join(PATH, "report.md")

    results_for_table, list_of_things = generate_data(make_figures, algorithm_filter=algorithm_filter, path_filter=path_filter)
    list_of_things.insert(0, PREAMBLE)

    table = make_table(results_for_table)
    list_of_things.insert(1, table)

    with open(outpath, mode="w") as f:
        f.write("\n\n".join(list_of_things))

if __name__ == "__main__":
    main()
