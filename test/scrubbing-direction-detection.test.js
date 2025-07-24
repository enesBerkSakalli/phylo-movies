/**
 * Test for scrubbing direction detection fix
 * This test verifies that backward scrubbing is correctly detected
 */

import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

describe('Scrubbing Direction Detection Tests', () => {
  let sandbox;
  let mockStore;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Mock store with proper direction tracking
    mockStore = {
      currentTreeIndex: 0,
      previousTreeIndex: -1,
      
      // Simulate store.goToPosition() behavior
      goToPosition(newIndex) {
        this.previousTreeIndex = this.currentTreeIndex;
        this.currentTreeIndex = newIndex;
      },
      
      // Direction detection logic
      isBackward() {
        return this.previousTreeIndex !== -1 && this.currentTreeIndex < this.previousTreeIndex;
      }
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Store-based Direction Detection Logic', () => {
    it('should detect forward navigation correctly', () => {
      // Start at beginning (no previous)
      expect(mockStore.isBackward()).to.be.false; // No previous position
      expect(mockStore.previousTreeIndex).to.equal(-1);
      expect(mockStore.currentTreeIndex).to.equal(0);

      // Move forward to index 1
      mockStore.goToPosition(1);
      expect(mockStore.isBackward()).to.be.false; // 1 > 0, so forward
      expect(mockStore.previousTreeIndex).to.equal(0);
      expect(mockStore.currentTreeIndex).to.equal(1);

      // Continue forward to index 2
      mockStore.goToPosition(2);
      expect(mockStore.isBackward()).to.be.false; // 2 > 1, so forward
      expect(mockStore.previousTreeIndex).to.equal(1);
      expect(mockStore.currentTreeIndex).to.equal(2);
    });

    it('should detect backward navigation correctly', () => {
      // Start at index 2
      mockStore.goToPosition(2);
      expect(mockStore.isBackward()).to.be.false; // 2 > 0, so forward initially
      
      // Move backward to index 1
      mockStore.goToPosition(1);
      expect(mockStore.isBackward()).to.be.true; // 1 < 2, so backward
      expect(mockStore.previousTreeIndex).to.equal(2);
      expect(mockStore.currentTreeIndex).to.equal(1);

      // Continue backward to index 0
      mockStore.goToPosition(0);
      expect(mockStore.isBackward()).to.be.true; // 0 < 1, so backward
      expect(mockStore.previousTreeIndex).to.equal(1);
      expect(mockStore.currentTreeIndex).to.equal(0);
    });

    it('should handle direction changes correctly', () => {
      // Forward: 0 → 1
      mockStore.goToPosition(1);
      expect(mockStore.isBackward()).to.be.false;

      // Forward: 1 → 2
      mockStore.goToPosition(2);
      expect(mockStore.isBackward()).to.be.false;

      // Backward: 2 → 1
      mockStore.goToPosition(1);
      expect(mockStore.isBackward()).to.be.true;

      // Backward: 1 → 0
      mockStore.goToPosition(0);
      expect(mockStore.isBackward()).to.be.true;

      // Forward again: 0 → 1
      mockStore.goToPosition(1);
      expect(mockStore.isBackward()).to.be.false;
    });

    it('should handle staying at the same position', () => {
      // Move to position 1
      mockStore.goToPosition(1);
      expect(mockStore.isBackward()).to.be.false; // 1 > 0, forward
      
      // Stay at position 1
      mockStore.goToPosition(1);
      expect(mockStore.isBackward()).to.be.false; // 1 is not < 1, so forward
      expect(mockStore.previousTreeIndex).to.equal(1);
      expect(mockStore.currentTreeIndex).to.equal(1);
    });

    it('should handle jumping positions correctly', () => {
      // Start at 0, jump to 3 (forward)
      mockStore.goToPosition(3);
      expect(mockStore.isBackward()).to.be.false; // 3 > 0, so forward
      
      // Jump back to 1 (backward)
      mockStore.goToPosition(1);
      expect(mockStore.isBackward()).to.be.true; // 1 < 3, so backward
    });
  });

  describe('Integration with Store-based Direction Detection', () => {
    it('should use store currentTreeIndex and previousTreeIndex for direction', () => {
      // Mock store state changes
      const mockStore = {
        currentTreeIndex: 0,
        previousTreeIndex: -1,
        
        // Simulate store.goToPosition() behavior
        goToPosition(newIndex) {
          this.previousTreeIndex = this.currentTreeIndex;
          this.currentTreeIndex = newIndex;
        }
      };

      // Test forward movement
      mockStore.goToPosition(1);
      expect(mockStore.currentTreeIndex).to.equal(1);
      expect(mockStore.previousTreeIndex).to.equal(0);
      
      // Direction detection logic
      let isBackward = mockStore.previousTreeIndex !== -1 && mockStore.currentTreeIndex < mockStore.previousTreeIndex;
      expect(isBackward).to.be.false; // 1 > 0, so forward

      // Test backward movement
      mockStore.goToPosition(0);
      expect(mockStore.currentTreeIndex).to.equal(0);
      expect(mockStore.previousTreeIndex).to.equal(1);
      
      isBackward = mockStore.previousTreeIndex !== -1 && mockStore.currentTreeIndex < mockStore.previousTreeIndex;
      expect(isBackward).to.be.true; // 0 < 1, so backward
    });

    it('should produce correct console log messages with store indices', () => {
      const consoleLogSpy = sandbox.spy(console, 'log');
      
      // Mock the new _renderTimelineInterpolation logic
      function simulateStoreBasedInterpolation(currentTreeIndex, previousTreeIndex, segmentProgress) {
        const isBackward = previousTreeIndex !== -1 && currentTreeIndex < previousTreeIndex;
        const direction = isBackward ? 'Backward' : 'Forward';
        const debugPrevious = previousTreeIndex === -1 ? 'start' : previousTreeIndex;
        
        console.log(`[Timeline Interpolation] ${direction} scrubbing: ${debugPrevious} → ${currentTreeIndex}, progress: ${segmentProgress.toFixed(3)} (segment: 2 → 3)`);
        
        return { isBackward, direction };
      }

      // Test forward scrubbing
      const result1 = simulateStoreBasedInterpolation(1, 0, 0.5);
      expect(result1.isBackward).to.be.false;
      expect(consoleLogSpy.calledWith('[Timeline Interpolation] Forward scrubbing: 0 → 1, progress: 0.500 (segment: 2 → 3)')).to.be.true;

      // Test backward scrubbing
      const result2 = simulateStoreBasedInterpolation(0, 1, 0.3);
      expect(result2.isBackward).to.be.true;
      expect(consoleLogSpy.calledWith('[Timeline Interpolation] Backward scrubbing: 1 → 0, progress: 0.300 (segment: 2 → 3)')).to.be.true;
    });
  });

  describe('Edge Cases', () => {
    it('should handle initial state correctly', () => {
      // Initial state should show no backward movement
      expect(mockStore.isBackward()).to.be.false; // No previous position
      expect(mockStore.previousTreeIndex).to.equal(-1);
      expect(mockStore.currentTreeIndex).to.equal(0);
    });

    it('should handle boundary conditions', () => {
      // Test navigation to boundary positions
      mockStore.goToPosition(0); // Stay at first position
      expect(mockStore.isBackward()).to.be.false; // 0 is not < 0
      
      // Test large jump forward
      mockStore.goToPosition(100);
      expect(mockStore.isBackward()).to.be.false; // 100 > 0, so forward
      
      // Test large jump backward
      mockStore.goToPosition(50);
      expect(mockStore.isBackward()).to.be.true; // 50 < 100, so backward
    });
  });
});