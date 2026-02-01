import { describe, it, expect } from 'vitest';
import { Tree, RawNode } from '../../src/js/domain/model/Tree';
import { TreeList } from '../../src/js/domain/model/TreeList';
import * as d3 from 'd3';

describe('Tree Model', () => {
  // Mock Data
  const mockRawNode: RawNode = {
    name: 'root',
    length: 0.1,
    children: [
      { name: 'child1', length: 0.2, children: [] },
      { name: 'child2', length: 0.3, children: [] }
    ],
    values: { bootstrap: 100 }
  };

  it('should initialize correctly from a RawNode', () => {
    const tree = new Tree(mockRawNode);
    expect(tree).toBeDefined();
    expect(tree.name).toBe('root');
    expect(tree.root).toBeInstanceOf(d3.hierarchy);
  });

  it('should wrap d3.hierarchy and access topological properties', () => {
    const tree = new Tree(mockRawNode);
    // D3 properties
    expect(tree.root.depth).toBe(0);
    expect(tree.root.height).toBe(1); // height of tree (longest path to leaf)
    expect(tree.root.children).toHaveLength(2);
  });

  it('should retrieve all leaves via D3 integration', () => {
    const tree = new Tree(mockRawNode);
    const leaves = tree.getLeaves();
    expect(leaves).toHaveLength(2);
    const leafNames = leaves.map(l => l.data.name).sort();
    expect(leafNames).toEqual(['child1', 'child2']);
  });

  it('should calculate node count correctly', () => {
    const tree = new Tree(mockRawNode);
    // Root + 2 children = 3 nodes
    expect(tree.getNodeCount()).toBe(3);
  });

  it('should access custom metadata (values)', () => {
    const tree = new Tree(mockRawNode);
    expect(tree.root.data.values).toEqual({ bootstrap: 100 });
  });

  it('should expose basic D3 methods (descendants, links)', () => {
    const tree = new Tree(mockRawNode);
    expect(tree.descendants().length).toBe(3);
    // 2 children connected to root = 2 links
    expect(tree.links().length).toBe(2);
  });

  it('should support sorting via facade', () => {
    const tree = new Tree(mockRawNode);
    // Sort by name descending
    tree.sort((a, b) => b.data.name.localeCompare(a.data.name));
    const sortedChildren = tree.root.children?.map(c => c.data.name);
    expect(sortedChildren).toEqual(['child2', 'child1']);
  });

  it('should support traversal via facade (each)', () => {
    const tree = new Tree(mockRawNode);
    const visited: string[] = [];
    tree.each(node => visited.push(node.data.name));
    expect(visited.length).toBe(3);
    expect(visited).toContain('root');
  });
});

describe('TreeList Model', () => {
  const tree1: RawNode = { name: 't1', length: 1, children: [] };
  const tree2: RawNode = { name: 't2', length: 1, children: [] };
  const mockTaxa = ['t1', 't2'];

  it('should initialize with an array of RawNodes', () => {
    const list = new TreeList([tree1, tree2], mockTaxa);
    expect(list.length).toBe(2);
    expect(list.taxa).toEqual(mockTaxa);
  });

  it('should wrap elements in Tree instances', () => {
    const list = new TreeList([tree1, tree2]);
    const firstTree = list.get(0);
    expect(firstTree).toBeInstanceOf(Tree);
    expect(firstTree?.name).toBe('t1');
    expect(firstTree?.index).toBe(0);
  });

  it('should be iterable', () => {
    const list = new TreeList([tree1, tree2]);
    const names: string[] = [];
    for (const tree of list) {
      names.push(tree.name);
    }
    expect(names).toEqual(['t1', 't2']);
  });

  it('should support array methods like map', () => {
    const list = new TreeList([tree1, tree2]);
    const indices = list.map(t => t.index);
    expect(indices).toEqual([0, 1]);
  });

  it('should serialize back to JSON', () => {
    const list = new TreeList([tree1, tree2]);
    const json = list.toJSON();
    expect(json).toHaveLength(2);
    expect(json[0].name).toBe('t1');
  });
});
