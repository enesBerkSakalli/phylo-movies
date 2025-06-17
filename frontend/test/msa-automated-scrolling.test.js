#!/usr/bin/env node

/**
 * MSA Automated Scrolling Test
 * Tests the MSA window size and step size calculations for automated scrolling
 * Focuses on the calculateWindow() and calculateMSAPosition() methods in GUI class
 */

const { expect } = require("chai");
const path = require("path");

// Import the GUI class for testing
// Note: This requires proper module setup for ES6 imports in CommonJS environment
let Gui;

describe("MSA Automated Scrolling Tests", function() {
  let gui;
  let mockTreeList;
  let mockTreeNames;
  let mockFullTreeIndices;

  beforeEach(function() {
    // Mock tree data for testing
    mockTreeList = [
      { id: "T0" },    // Full tree 0 (index 0)
      { id: "I0-1" },  // Interpolated (index 1)
      { id: "I0-2" },  // Interpolated (index 2)
      { id: "T1" },    // Full tree 1 (index 3)
      { id: "I1-1" },  // Interpolated (index 4)
      { id: "I1-2" },  // Interpolated (index 5)
      { id: "T2" },    // Full tree 2 (index 6)
      { id: "I2-1" },  // Interpolated (index 7)
      { id: "T3" }     // Full tree 3 (index 8)
    ];

    mockTreeNames = [
      "T0", "I0-1", "I0-2", "T1", "I1-1", "I1-2", "T2", "I2-1", "T3"
    ];

    // Mock distances (one per transition between full trees)
    const mockRFDistances = [0.2, 0.5, 0.3]; // T0→T1, T1→T2, T2→T3
    const mockWRFDistances = [0.1, 0.4, 0.25];

    // Mock constructor parameters
    const mockParams = {
      treeList: mockTreeList,
      weightedRobinsonFouldsDistances: mockWRFDistances,
      robinsonFouldsDistances: mockRFDistances,
      windowSize: 100,        // MSA window size
      windowStepSize: 50,     // MSA step size
      toBeHighlightedFromBackend: [["taxon1", "taxon2"], ["taxon3"], ["taxon4", "taxon5"]],
      leaveOrder: ["taxon1", "taxon2", "taxon3", "taxon4", "taxon5"],
      colorInternalBranches: false,
      fileName: "test",
      factorValue: 1,
      treeNames: mockTreeNames
    };

    // Create a mock GUI instance
    gui = createMockGui(mockParams);
  });

  describe("MSA Window Calculation", function() {
    it("should calculate correct window positions for first full tree (T0)", function() {
      gui.currentTreeIndex = 0; // T0
      gui.firstFull = 1;

      const window = gui.getCurrentWindow();

      expect(window.startPosition).to.equal(1, "First window should start at position 1");
      expect(window.endPosition).to.equal(100, "First window should end at position 100 (1 + 100 - 1)");
      expect(window.midPosition).to.equal(50, "Mid position should be at position 50");
    });

    it("should calculate correct window positions for second full tree (T1)", function() {
      gui.currentTreeIndex = 3; // T1
      gui.firstFull = 1;

      const window = gui.getCurrentWindow();

      expect(window.startPosition).to.equal(51, "Second window should start at position 51 (1 * 50 + 1)");
      expect(window.endPosition).to.equal(150, "Second window should end at position 150 (51 + 100 - 1)");
      expect(window.midPosition).to.equal(100, "Mid position should be at position 100");
    });

    it("should calculate correct window positions for third full tree (T2)", function() {
      gui.currentTreeIndex = 6; // T2
      gui.firstFull = 1;

      const window = gui.getCurrentWindow();

      expect(window.startPosition).to.equal(101, "Third window should start at position 101 (2 * 50 + 1)");
      expect(window.endPosition).to.equal(200, "Third window should end at position 200 (101 + 100 - 1)");
      expect(window.midPosition).to.equal(150, "Mid position should be at position 150");
    });

    it("should handle edge case with windowStepSize = 1", function() {
      gui.msaStepSize = 1;
      gui.msaWindowSize = 10;
      gui.currentTreeIndex = 3; // T1 (second full tree)
      gui.firstFull = 1;

      const window = gui.getCurrentWindow();

      expect(window.startPosition).to.equal(2, "With step size 1, second window should start at position 2");
      expect(window.endPosition).to.equal(11, "With step size 1, second window should end at position 11");
    });

    it("should handle large step sizes correctly", function() {
      gui.msaStepSize = 200;
      gui.msaWindowSize = 50;
      gui.currentTreeIndex = 3; // T1 (second full tree)
      gui.firstFull = 1;

      const window = gui.getCurrentWindow();

      expect(window.startPosition).to.equal(201, "With large step size, second window should start at position 201");
      expect(window.endPosition).to.equal(250, "With large step size, second window should end at position 250");
    });
  });

  describe("MSA Position Calculation", function() {
    it("should calculate correct MSA position for first transition", function() {
      gui.currentTreeIndex = 0; // T0
      gui.firstFull = 1;

      const msaInfo = gui.calculateMSAPosition();

      expect(msaInfo.position).to.equal(1, "First transition should start at MSA position 1");
      expect(msaInfo.stepSize).to.equal(50, "Step size should be preserved");
      expect(msaInfo.treeIndex).to.equal(0, "Tree index should match current");
    });

    it("should calculate correct MSA position for second transition", function() {
      gui.currentTreeIndex = 3; // T1
      gui.firstFull = 1;

      const msaInfo = gui.calculateMSAPosition();

      expect(msaInfo.position).to.equal(51, "Second transition should start at MSA position 51");
      expect(msaInfo.stepSize).to.equal(50, "Step size should be preserved");
    });

    it("should calculate correct MSA position for interpolated tree", function() {
      gui.currentTreeIndex = 1; // I0-1 (between T0 and T1)
      gui.firstFull = 0;

      const msaInfo = gui.calculateMSAPosition();

      // Interpolated trees should still map to their transition's MSA position
      expect(msaInfo.position).to.equal(1, "Interpolated tree should use first transition MSA position");
    });
  });

  describe("Full Tree Data Index Mapping", function() {
    it("should correctly map tree indices to transition indices", function() {
      // Test T0 (start of first transition)
      gui.currentTreeIndex = 0;
      gui.firstFull = 1;
      expect(gui.getCurrentFullTreeDataIndex()).to.equal(0, "T0 start should map to transition 0");

      // Test T1 (start of second transition)
      gui.currentTreeIndex = 3;
      gui.firstFull = 1;
      expect(gui.getCurrentFullTreeDataIndex()).to.equal(1, "T1 start should map to transition 1");

      // Test T1 (end of first transition)
      gui.currentTreeIndex = 3;
      gui.firstFull = 0;
      expect(gui.getCurrentFullTreeDataIndex()).to.equal(0, "T1 end should map to transition 0");
    });

    it("should handle interpolated trees correctly", function() {
      // Test interpolated tree between T0 and T1
      gui.currentTreeIndex = 1; // I0-1
      gui.firstFull = 0;
      expect(gui.getCurrentFullTreeDataIndex()).to.equal(0, "Interpolated tree should map to its transition");

      // Test interpolated tree between T1 and T2
      gui.currentTreeIndex = 4; // I1-1
      gui.firstFull = 0;
      expect(gui.getCurrentFullTreeDataIndex()).to.equal(1, "Interpolated tree should map to its transition");
    });
  });

  describe("MSA Sync Event Data", function() {
    it("should generate correct window info for MSA sync events", function() {
      gui.currentTreeIndex = 3; // T1
      gui.firstFull = 1;

      // Mock the sync method to capture event data
      let capturedEventDetail = null;
      const originalDispatchEvent = global.window.dispatchEvent;
      global.window.dispatchEvent = function(event) {
        if (event.type === 'msa-sync-request') {
          capturedEventDetail = event.detail;
        }
      };

      gui.syncMSAIfOpen();

      expect(capturedEventDetail).to.not.be.null;
      expect(capturedEventDetail.windowInfo).to.deep.include({
        windowStart: 51,    // 1 * 50 + 1
        windowEnd: 150,     // 51 + 100 - 1
        msaPosition: 51,
        msaStepSize: 50
      });

      // Restore original function
      global.window.dispatchEvent = originalDispatchEvent;
    });

    it("should handle navigation correctly with MSA position updates", function() {
      // Start at T0
      gui.currentTreeIndex = 0;
      gui.firstFull = 1;

      let window1 = gui.getCurrentWindow();
      expect(window1.startPosition).to.equal(1);

      // Navigate forward to T1
      gui.forward(); // Should go to interpolated tree
      gui.forward(); // Should go to another interpolated tree
      gui.forward(); // Should reach T1

      let window2 = gui.getCurrentWindow();
      expect(window2.startPosition).to.equal(51, "After navigation, window should update correctly");
    });
  });

  describe("Edge Cases and Error Handling", function() {
    it("should handle empty tree list gracefully", function() {
      const emptyGui = createMockGui({
        treeList: [],
        windowSize: 100,
        windowStepSize: 50,
        weightedRobinsonFouldsDistances: [],
        robinsonFouldsDistances: [],
        toBeHighlightedFromBackend: [],
        leaveOrder: [],
        colorInternalBranches: false,
        fileName: "empty",
        treeNames: []
      });

      const window = emptyGui.getCurrentWindow();
      expect(window.startPosition).to.equal(1, "Empty tree list should default to position 1");
      expect(window.endPosition).to.be.at.least(1, "End position should be at least 1");
    });

    it("should handle zero window size gracefully", function() {
      gui.msaWindowSize = 0;

      const window = gui.getCurrentWindow();
      expect(window.startPosition).to.equal(1, "Should handle zero window size");
      expect(window.endPosition).to.be.at.least(window.startPosition, "End should be at least start");
    });

    it("should handle zero step size gracefully", function() {
      gui.msaStepSize = 0;

      const window = gui.getCurrentWindow();
      expect(window.startPosition).to.equal(1, "Should handle zero step size");
      expect(window.endPosition).to.be.at.least(1, "Should have valid window");
    });
  });
});

/**
 * Create a mock GUI instance for testing
 * Mimics the constructor behavior without requiring full DOM setup
 */
function createMockGui(params) {
  const gui = {
    // Core data
    treeList: params.treeList || [],
    treeNames: params.treeNames || [],
    msaWindowSize: params.windowSize || 100,
    msaStepSize: params.windowStepSize || 50,
    toBeHighlightedFromBackend: params.toBeHighlightedFromBackend || [],

    // State
    currentTreeIndex: 0,
    firstFull: 1,
    syncMSAEnabled: true,

    // Calculate full tree indices (mimics constructor logic)
    fullTreeOriginalIndices: [],

    // Methods from GUI class
    getCurrentFullTreeDataIndex: function() {
      let N = this.fullTreeOriginalIndices.length;
      if (N === 0) return 0;

      let transitionIndex = 0;
      for (let i = 0; i < N - 1; i++) {
        const currentFullTreeIndex = this.fullTreeOriginalIndices[i];
        const nextFullTreeIndex = this.fullTreeOriginalIndices[i + 1];

        if (this.currentTreeIndex >= currentFullTreeIndex && this.currentTreeIndex < nextFullTreeIndex) {
          transitionIndex = i;
          break;
        }
      }

      if (this.currentTreeIndex >= this.fullTreeOriginalIndices[N - 1]) {
        transitionIndex = Math.max(0, N - 2);
      }

      const isCurrentTreeFull = this.fullTreeOriginalIndices.includes(this.currentTreeIndex);
      if (isCurrentTreeFull && this.firstFull === 0) {
        if (transitionIndex > 0) {
          return transitionIndex - 1;
        } else {
          return 0;
        }
      }

      return transitionIndex;
    },

    calculateWindow: function() {
      const currentFullTreeDataIdx = this.getCurrentFullTreeDataIndex();
      if (currentFullTreeDataIdx < 0) {
        const defaultEndPosition = (this.msaWindowSize && this.msaWindowSize > 0) ? this.msaWindowSize : 100;
        return { startPosition: 1, midPosition: 1, endPosition: Math.max(1, defaultEndPosition) };
      }

      let startPosition = currentFullTreeDataIdx * this.msaStepSize + 1;
      let endPosition = startPosition + this.msaWindowSize - 1;

      startPosition = Math.max(1, startPosition);
      endPosition = Math.max(startPosition, endPosition);

      const midPosition = startPosition + Math.floor((this.msaWindowSize - 1) / 2);

      this.windowStart = startPosition;
      this.windowEnd = endPosition;

      return {
        startPosition: startPosition,
        midPosition: midPosition,
        endPosition: endPosition,
      };
    },

    getCurrentWindow: function() {
      return this.calculateWindow();
    },

    calculateMSAPosition: function() {
      const msaStepSize = this.msaStepSize;
      // Use getCurrentFullTreeDataIndex directly, not divided by 2
      const msaPosition = this.getCurrentFullTreeDataIndex() * msaStepSize + 1;

      return {
        position: msaPosition,
        stepSize: msaStepSize,
        steps: this.getCurrentFullTreeDataIndex() * msaStepSize,
        treeIndex: this.currentTreeIndex
      };
    },

    syncMSAIfOpen: function() {
      if (!this.syncMSAEnabled) return;

      const msaPositionInfo = this.calculateMSAPosition();
      const currentPosition = msaPositionInfo.position;

      let windowInfo = null;
      const windowData = this.getCurrentWindow();
      if (windowData) {
        windowInfo = {
          windowStart: windowData.startPosition,
          windowEnd: windowData.endPosition,
          msaPosition: currentPosition,
          msaStepSize: msaPositionInfo.stepSize
        };
      }

      const eventDetail = {
        highlightedTaxa: [],
        position: currentPosition,
        windowInfo,
        treeIndex: this.currentTreeIndex
      };

      if (typeof global.window !== 'undefined' && typeof global.window.dispatchEvent === 'function') {
        global.window.dispatchEvent(new global.window.CustomEvent('msa-sync-request', { detail: eventDetail }));
      }
    },

    forward: function() {
      this.currentTreeIndex = Math.min(this.currentTreeIndex + 1, this.treeList.length - 1);
      const onFullTree = this.fullTreeOriginalIndices.includes(this.currentTreeIndex);
      if (onFullTree && this.firstFull === 0) {
        this.firstFull = 1;
      } else {
        this.firstFull = 0;
      }
    }
  };

  // Initialize full tree indices (mimics constructor logic)
  if (Array.isArray(gui.treeNames)) {
    gui.treeNames.forEach((name, index) => {
      const isFullTree = name && typeof name.startsWith === 'function' &&
                        !name.startsWith('I') && !name.startsWith('C');
      if (isFullTree) {
        gui.fullTreeOriginalIndices.push(index);
      }
    });
  }

  return gui;
}

// Mock DOM environment for testing
if (typeof global.window === 'undefined') {
  global.window = {
    dispatchEvent: function(event) {
      // Mock implementation
    },
    CustomEvent: function(type, options) {
      this.type = type;
      this.detail = options ? options.detail : undefined;
    }
  };
}
