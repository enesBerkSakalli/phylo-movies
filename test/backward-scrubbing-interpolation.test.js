/**
 * Test suite for backward scrubbing interpolation logic
 * Tests the complete flow from MovieTimelineManager through InterpolationEngine
 */

import { describe, it as test, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

// Note: These imports may need to be adjusted based on module system
// For testing, we'll create simplified mock objects

// Mock WebGL context and Three.js
vi.mock('three', () => ({
  Scene: vi.fn(() => ({ add: vi.fn(), remove: vi.fn() })),
  Group: vi.fn(() => ({ add: vi.fn(), remove: vi.fn(), children: [] })),
  Mesh: vi.fn(() => ({ 
    userData: {},
    updateMatrix: vi.fn(),
    position: { set: vi.fn() },
    material: { opacity: 1, transparent: false }
  })),
  WebGLRenderer: vi.fn(() => ({
    domElement: { getBoundingClientRect: () => ({ width: 800, height: 600 }) },
    render: vi.fn(),
    setSize: vi.fn()
  })),
  PerspectiveCamera: vi.fn(),
  OrthographicCamera: vi.fn()
}));

// Mock D3
vi.mock('d3', () => ({
  select: vi.fn(() => ({ node: () => document.createElement('div') })),
  hierarchy: vi.fn((data) => ({
    links: () => data.links || [],
    descendants: () => data.nodes || [],
    leaves: () => data.leaves || []
  }))
}));

describe('Backward Scrubbing Interpolation Tests', () => {
  let controller;
  let mockStore;
  let mockLinkRenderer;
  let mockNodeRenderer;

  // Sample tree data for testing
  const createSampleTreeData = (treeId, linkIds = [], nodeIds = []) => ({
    name: `tree_${treeId}`,
    links: linkIds.map(id => ({
      source: { angle: Math.random(), radius: Math.random(), id: `source_${id}` },
      target: { angle: Math.random(), radius: Math.random(), id: `target_${id}` },
      id: `link_${treeId}_${id}`
    })),
    nodes: nodeIds.map(id => ({
      angle: Math.random(),
      radius: Math.random(),
      id: `node_${treeId}_${id}`,
      data: { name: `Node ${id}` }
    })),
    leaves: nodeIds.slice(0, 2).map(id => ({
      angle: Math.random(),
      radius: Math.random(),
      id: `leaf_${treeId}_${id}`,
      data: { name: `Leaf ${id}` }
    }))
  });

  beforeEach(() => {
    // Mock store
    mockStore = {
      getState: vi.fn(() => ({
        strokeWidth: 2,
        fontSize: '1.8em',
        getColorManager: () => ({
          getNodeColor: () => '#000000',
          updateMarkedComponents: vi.fn()
        })
      }))
    };
    vi.mocked(useAppStore).mockReturnValue(mockStore);

    // Mock link renderer
    mockLinkRenderer = {
      linkMeshes: new Map(),
      createAndAddLink: vi.fn((link) => {
        const mesh = { userData: { link }, updateMatrix: vi.fn() };
        mockLinkRenderer.linkMeshes.set(`link_key_${link.id}`, mesh);
        return mesh;
      }),
      updateMeshes: vi.fn(),
      removeLinkByKey: vi.fn((key) => {
        mockLinkRenderer.linkMeshes.delete(key);
      }),
      destroy: vi.fn()
    };

    // Mock node renderer  
    mockNodeRenderer = {
      leafMeshes: new Map(),
      internalMeshes: new Map(),
      createAndAddNode: vi.fn((node) => {
        const mesh = { userData: { node }, updateMatrix: vi.fn() };
        const isLeaf = node.id.includes('leaf');
        if (isLeaf) {
          mockNodeRenderer.leafMeshes.set(`node_key_${node.id}`, mesh);
        } else {
          mockNodeRenderer.internalMeshes.set(`node_key_${node.id}`, mesh);
        }
        return mesh;
      }),
      updateNodeMeshes: vi.fn(),
      removeNodeByKey: vi.fn(),
      destroy: vi.fn()
    };

    // Create controller with mocked renderers
    controller = new WebGLTreeAnimationController(null);
    controller.linkRenderer = mockLinkRenderer;
    controller.nodeRenderer = mockNodeRenderer;
    controller.extensionRenderer = { destroy: vi.fn() };
    controller.labelRenderer = { destroy: vi.fn() };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Tree Order and Element Classification', () => {
    test('should correctly identify entering elements during backward scrubbing', async () => {
      // Setup: Tree 5 has links [1,2,3], Tree 4 has links [2,3,4]
      // When going backward from Tree 5 to Tree 4:
      // - Link 4 should ENTER (exists in tree 4 but not tree 5)
      // - Links 2,3 should UPDATE (exist in both)
      // - Link 1 should EXIT (exists in tree 5 but not tree 4)
      
      const tree5Data = createSampleTreeData(5, [1, 2, 3], [1, 2, 3]);
      const tree4Data = createSampleTreeData(4, [2, 3, 4], [2, 3, 4]);

      // Pre-populate renderer with tree 5 elements (current state)
      tree5Data.links.forEach(link => {
        mockLinkRenderer.createAndAddLink(link);
      });

      const result = await controller.renderInterpolatedFrame(
        tree5Data, // fromTree (current position)
        tree4Data, // toTree (target position)  
        0.5,       // timeFactor
        { isBackward: true }
      );

      expect(result.success).toBe(true);

      // Verify that createAndAddLink was called for entering elements
      // Should be called for link 4 (new in tree 4)
      const createCalls = mockLinkRenderer.createAndAddLink.mock.calls;
      const enteringLinkIds = createCalls.map(call => call[0].id);
      expect(enteringLinkIds).toContain('link_4_4');

      // Verify updateMeshes was called with correct parameters
      expect(mockLinkRenderer.updateMeshes).toHaveBeenCalled();
      const updateCall = mockLinkRenderer.updateMeshes.mock.calls[0];
      expect(updateCall[4]).toBe(true); // isBackward flag
    });

    test('should handle element diffing correctly for backward interpolation', () => {
      const updatePattern = new IndependentUpdatePattern();
      
      // Create hierarchical tree structures
      const currentTree = {
        links: () => [
          { source: { id: 'A' }, target: { id: 'B' }, id: 'AB' },
          { source: { id: 'B' }, target: { id: 'C' }, id: 'BC' }
        ],
        descendants: () => [
          { id: 'A', angle: 0, radius: 1 },
          { id: 'B', angle: 1, radius: 1 },
          { id: 'C', angle: 2, radius: 1 }
        ],
        leaves: () => [
          { id: 'A', angle: 0, radius: 1 },
          { id: 'C', angle: 2, radius: 1 }
        ]
      };

      const previousTree = {
        links: () => [
          { source: { id: 'A' }, target: { id: 'B' }, id: 'AB' },
          { source: { id: 'B' }, target: { id: 'D' }, id: 'BD' } // Different link
        ],
        descendants: () => [
          { id: 'A', angle: 0, radius: 1 },
          { id: 'B', angle: 1, radius: 1 },
          { id: 'D', angle: 3, radius: 1 } // Different node
        ],
        leaves: () => [
          { id: 'A', angle: 0, radius: 1 },
          { id: 'D', angle: 3, radius: 1 }
        ]
      };

      const allUpdates = updatePattern.diffAllElements(currentTree, previousTree);

      // Verify correct classification
      expect(allUpdates.links.enter).toHaveLength(1); // BC enters (in current, not in previous)
      expect(allUpdates.links.exit).toHaveLength(1);  // BD exits (in previous, not in current)
      expect(allUpdates.links.update).toHaveLength(1); // AB updates (in both)

      expect(allUpdates.nodes.enter).toHaveLength(1); // C enters
      expect(allUpdates.nodes.exit).toHaveLength(1);  // D exits
      expect(allUpdates.nodes.update).toHaveLength(2); // A, B update
    });
  });

  describe('InterpolationEngine Execution Order', () => {
    test('should execute stages in correct order for backward scrubbing', async () => {
      const engine = new InterpolationEngine(controller);
      const executionOrder = [];

      // Mock stage methods to track execution order
      engine.executeInterpolationEnterStage = vi.fn(async () => {
        executionOrder.push('enter');
        // Simulate creating meshes
        mockLinkRenderer.createAndAddLink({ id: 'new_link' });
      });

      engine.executeInterpolationUpdateStage = vi.fn(async () => {
        executionOrder.push('update');
      });

      engine.executeInterpolationExitStage = vi.fn(async () => {
        executionOrder.push('exit');
      });

      const filteredData = {
        links: { enter: [{ id: 'link1' }], update: [{ id: 'link2' }], exit: [{ id: 'link3' }] },
        nodes: { enter: [], update: [], exit: [] },
        leaves: { enter: [], update: [], exit: [] }
      };

      const interpolationContext = {
        timeFactor: 0.5,
        isBackward: true,
        fromTreeData: { links: () => [], descendants: () => [], leaves: () => [] },
        toTreeData: { links: () => [], descendants: () => [], leaves: () => [] }
      };

      await engine.executeInterpolationStaging(filteredData, interpolationContext);

      // Verify execution order: enter → update → (exit at high timeFactor)
      expect(executionOrder).toEqual(['enter', 'update']);
      expect(engine.executeInterpolationEnterStage).toHaveBeenCalled();
      expect(engine.executeInterpolationUpdateStage).toHaveBeenCalled();
      expect(engine.executeInterpolationExitStage).not.toHaveBeenCalled(); // timeFactor < 0.8
    });

    test('should execute exit stage at correct timing for backward scrubbing', async () => {
      const engine = new InterpolationEngine(controller);
      
      engine.executeInterpolationEnterStage = vi.fn();
      engine.executeInterpolationUpdateStage = vi.fn();
      engine.executeInterpolationExitStage = vi.fn();
      engine._trackExitOperationsCompletion = vi.fn();

      const filteredData = {
        links: { enter: [], update: [], exit: [{ id: 'link1' }] },
        nodes: { enter: [], update: [], exit: [] },
        leaves: { enter: [], update: [], exit: [] }
      };

      // Test with timeFactor = 0.9 (should trigger exit)
      const interpolationContext = {
        timeFactor: 0.9,
        isBackward: true,
        fromTreeData: { links: () => [], descendants: () => [], leaves: () => [] },
        toTreeData: { links: () => [], descendants: () => [], leaves: () => [] }
      };

      await engine.executeInterpolationStaging(filteredData, interpolationContext);

      expect(engine.executeInterpolationExitStage).toHaveBeenCalled();
      expect(engine._trackExitOperationsCompletion).toHaveBeenCalled();
    });
  });

  describe('Update Stage Link Processing', () => {
    test('should process newly created links in update stage', async () => {
      const engine = new InterpolationEngine(controller);
      
      // Setup: Create some initial links
      const existingLink = { id: 'existing_link', source: { angle: 0, radius: 1 }, target: { angle: 1, radius: 1 } };
      mockLinkRenderer.createAndAddLink(existingLink);

      // Setup tree data
      const fromTreeData = {
        links: () => [existingLink],
        descendants: () => [],
        leaves: () => []
      };

      const newLink = { id: 'new_link', source: { angle: 2, radius: 1 }, target: { angle: 3, radius: 1 } };  
      const toTreeData = {
        links: () => [existingLink, newLink],
        descendants: () => [],
        leaves: () => []
      };

      // Simulate enter stage creating the new link
      mockLinkRenderer.createAndAddLink(newLink);

      const interpolationContext = {
        fromTreeData,
        toTreeData,
        timeFactor: 0.5,
        isBackward: true,
        highlightEdges: []
      };

      await engine.executeInterpolationUpdateStage(interpolationContext);

      // Verify that updateMeshes was called with both existing and newly created links
      expect(mockLinkRenderer.updateMeshes).toHaveBeenCalled();
      const updateCall = mockLinkRenderer.updateMeshes.mock.calls[0];
      const processedLinks = updateCall[0];
      
      expect(processedLinks).toHaveLength(2); // Both existing and new link
      expect(processedLinks.map(l => l.id)).toEqual(['existing_link', 'new_link']);
    });

    test('should log missing meshes correctly during backward interpolation', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const engine = new InterpolationEngine(controller);

      const fromTreeData = {
        links: () => [],
        descendants: () => [],
        leaves: () => []
      };

      // toTreeData has a link that doesn't exist in renderer
      const missingLink = { id: 'missing_link', source: { angle: 0, radius: 1 }, target: { angle: 1, radius: 1 } };
      const toTreeData = {
        links: () => [missingLink],
        descendants: () => [],
        leaves: () => []
      };

      const interpolationContext = {
        fromTreeData,
        toTreeData,
        timeFactor: 0.5,
        isBackward: true,
        highlightEdges: []
      };

      await engine.executeInterpolationUpdateStage(interpolationContext);

      // Verify debug logging
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[UpdateStage] Processing 0/1 links for backward interpolation')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[UpdateStage] Missing 1 link meshes:'),
        expect.arrayContaining(['link_key_missing_link'])
      );

      consoleSpy.mockRestore();
      logSpy.mockRestore();
    });
  });

  describe('Integration Test: Complete Backward Scrubbing Flow', () => {
    test('should handle complete backward scrubbing scenario', async () => {
      // Scenario: User scrubs backward from tree index 5 to tree index 4
      // Tree 5: links [A-B, B-C], Tree 4: links [A-B, B-D] 
      
      const tree5Data = createSampleTreeData(5, ['AB', 'BC'], ['A', 'B', 'C']);
      const tree4Data = createSampleTreeData(4, ['AB', 'BD'], ['A', 'B', 'D']);

      // Simulate current state: renderer has tree 5 elements
      tree5Data.links.forEach(link => {
        mockLinkRenderer.createAndAddLink(link);
      });
      tree5Data.nodes.forEach(node => {
        mockNodeRenderer.createAndAddNode(node);
      });

      // Execute backward interpolation
      const result = await controller.renderInterpolatedFrame(
        tree5Data, // fromTree (current)
        tree4Data, // toTree (target)
        0.3,       // timeFactor (early in backward scrubbing)
        { isBackward: true }
      );

      expect(result.success).toBe(true);

      // Verify the complete flow:
      
      // 1. Enter stage should create missing elements (BD link, D node)
      const createLinkCalls = mockLinkRenderer.createAndAddLink.mock.calls;
      const createNodeCalls = mockNodeRenderer.createAndAddNode.mock.calls;
      
      // Should create BD link and D node
      expect(createLinkCalls.some(call => call[0].id.includes('BD'))).toBe(true);
      expect(createNodeCalls.some(call => call[0].id.includes('D'))).toBe(true);

      // 2. Update stage should process all elements for interpolation
      expect(mockLinkRenderer.updateMeshes).toHaveBeenCalled();
      expect(mockNodeRenderer.updateNodeMeshes).toHaveBeenCalled();

      // 3. Exit stage should NOT run yet (timeFactor < 0.8)
      expect(mockLinkRenderer.removeLinkByKey).not.toHaveBeenCalled();

      // Verify backward flag was passed correctly
      const linkUpdateCall = mockLinkRenderer.updateMeshes.mock.calls[0];
      expect(linkUpdateCall[4]).toBe(true); // isBackward

      const nodeUpdateCall = mockNodeRenderer.updateNodeMeshes.mock.calls[0];
      expect(nodeUpdateCall[4]).toBe(true); // isBackward
    });

    test('should handle exit stage timing correctly in backward scrubbing', async () => {
      const tree5Data = createSampleTreeData(5, ['AB', 'BC'], ['A', 'B', 'C']);
      const tree4Data = createSampleTreeData(4, ['AB', 'BD'], ['A', 'B', 'D']);

      // Pre-populate renderer
      tree5Data.links.forEach(link => {
        mockLinkRenderer.createAndAddLink(link);
      });

      // Test with high timeFactor (should trigger exit)
      const result = await controller.renderInterpolatedFrame(
        tree5Data,
        tree4Data,
        0.9, // High timeFactor should trigger exit
        { isBackward: true }
      );

      expect(result.success).toBe(true);

      // Exit stage should have run and removed BC link
      expect(mockLinkRenderer.removeLinkByKey).toHaveBeenCalled();
      const removeCall = mockLinkRenderer.removeLinkByKey.mock.calls[0];
      expect(removeCall[0]).toContain('BC');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty trees gracefully', async () => {
      const emptyTree = createSampleTreeData(0, [], []);
      
      const result = await controller.renderInterpolatedFrame(
        emptyTree,
        emptyTree,
        0.5,
        { isBackward: true }
      );

      expect(result.success).toBe(true);
      expect(mockLinkRenderer.createAndAddLink).not.toHaveBeenCalled();
      expect(mockLinkRenderer.updateMeshes).not.toHaveBeenCalled();
    });

    test('should handle identical trees correctly', async () => {
      const treeData = createSampleTreeData(1, ['AB'], ['A', 'B']);
      
      const result = await controller.renderInterpolatedFrame(
        treeData,
        treeData, // Same tree
        0.5,
        { isBackward: true }
      );

      expect(result.success).toBe(true);
      expect(result.timeFactor).toBe(0); // Should be set to 0 for identical trees
    });

    test('should handle missing renderer gracefully', async () => {
      controller.linkRenderer = null;
      
      const tree1 = createSampleTreeData(1, ['AB'], ['A', 'B']);
      const tree2 = createSampleTreeData(2, ['BC'], ['B', 'C']);

      // Should not throw error even with missing renderer
      await expect(
        controller.renderInterpolatedFrame(tree1, tree2, 0.5, { isBackward: true })
      ).resolves.toEqual({ success: true, timeFactor: 0.5 });
    });
  });
});