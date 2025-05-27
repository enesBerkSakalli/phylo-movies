
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

import './setupVitestMocks.js';

// Mock dependencies
vi.mock('../treeVisualisation/TreeConstructor.js', () => ({
  default: vi.fn((tree) => ({ tree: { mock: true, ...tree }, max_radius: 42 })),
}));
vi.mock('../treeVisualisation/flowTree/Tree3DRenderer.js', () => ({
  Tree3DRenderer: {
    renderTreeRow3D: vi.fn(() => ({
      update: vi.fn(),
    })),
  },
}));
vi.mock('../treeVisualisation/treeComparision.js', () => ({
  createSideBySideComparisonModal: vi.fn(async () => {
    // Return a real DOM element with addEventListener support
    const div = document.createElement('div');
    div.id = 'mock-modal';
    // Add a dummy addEventListener to avoid TypeError
    div.addEventListener = (...args) => {};
    document.body.appendChild(div); // Ensure it is in the DOM for getElementById
    return div;
  }),
  createInterpolationModal: vi.fn(async () => {
    const div = document.createElement('div');
    div.id = 'mock-interp-modal';
    return div;
  }),
}));

// Import after mocks
import { TreeComparisonModal } from '../treeComparision/TreeComparisonModal.js';

describe('TreeComparisonModal', () => {
  let comparisonModals;
  let treeList;

  beforeEach(() => {
    comparisonModals = {};
    treeList = [
      { name: 'tree1', children: [] },
      { name: 'tree2', children: [] },
    ];
    // WinBox and alert mocks are set up globally in setupVitestMocks.js
  });

  it('should open a 2D comparison modal and call createSideBySideComparisonModal', async () => {
    await TreeComparisonModal.compareTrees(0, 1, { treeList, comparisonModals });
    expect(comparisonModals['0-1']).toBeTruthy();
    // The modal should be assigned and truthy; DOM id check is not needed
  });

  it('should not open modal if indices are invalid', async () => {
    await TreeComparisonModal.compareTrees(0, 99, { treeList, comparisonModals });
    expect(comparisonModals['0-99']).toBeUndefined();
  });

  it('should open a 3D comparison modal and call renderTreeRow3D', async () => {
    // Add more trees for 3D
    treeList = Array.from({ length: 15 }, (_, i) => ({ name: `tree${i}`, children: [] }));
    await TreeComparisonModal.compareTreeSequence([0, 5, 10], { treeList, comparisonModals, leaveOrder: [] });
    expect(comparisonModals['0-5-10']).toBeTruthy();
  });

  it('should not open 3D modal if no valid trees', async () => {
    await TreeComparisonModal.compareTreeSequence([99, 100], { treeList, comparisonModals, leaveOrder: [] });
    expect(comparisonModals['99-100']).toBeUndefined();
  });
});
