import { useAppStore } from '../core/store.js';

/**
 * NavigationCommands - Command pattern implementation for tree navigation operations.
 *
 * This module defines a set of command classes that encapsulate specific navigation logic.
 * Each command implements the Command pattern, allowing for:
 * - Consistent execution interface
 * - Shared pre/post-processing logic
 * - Easy extension with new navigation behaviors
 * - Better testing and maintainability
 */

/**
 * Base class for navigation commands.
 * Provides common functionality and enforces the command interface.
 */
class NavigationCommand {
  constructor() {
    // No longer needs gui
  }

  /**
   * Execute the navigation command. Must be implemented by subclasses.
   * @returns {Promise<void>}
   */
  async execute() {
    throw new Error("Execute method must be implemented by subclasses.");
  }

  /**
   * Common pre-navigation logic shared by most commands
   */
  _prepare() {
    useAppStore.getState().clearStickyChartPosition();
  }

  
}

/**
 * Command to navigate forward in the tree sequence
 */
export class ForwardCommand extends NavigationCommand {
  async execute() {
    this._prepare();
    useAppStore.getState().forward();
  }
}

/**
 * Command to navigate backward in the tree sequence
 */
export class BackwardCommand extends NavigationCommand {
  async execute() {
    this._prepare();
    
    // CRITICAL FIX: Clear caches before backward navigation
    // This ensures clean state restoration during backward navigation
    const { backward, clearPositionCache, clearLayoutCache } = useAppStore.getState();
    clearPositionCache();
    clearLayoutCache();
    
    backward();
  }
}

/**
 * Command to navigate to the next full tree
 */
export class NextTreeCommand extends NavigationCommand {
  async execute() {
    this._prepare();
    const { transitionResolver, currentTreeIndex, goToPosition } = useAppStore.getState();
    if (!transitionResolver) return;

    const nextSequenceIndex = transitionResolver.getNextFullTreeSequenceIndex(currentTreeIndex);
    if (nextSequenceIndex !== currentTreeIndex) {
      goToPosition(nextSequenceIndex);
    }
  }
}

/**
 * Command to navigate to the previous full tree
 */
export class PrevTreeCommand extends NavigationCommand {
  async execute() {
    this._prepare();
    const { transitionResolver, currentTreeIndex, goToPosition, clearPositionCache, clearLayoutCache } = useAppStore.getState();
    if (!transitionResolver) return;

    const prevSequenceIndex = transitionResolver.getPreviousFullTreeSequenceIndex(currentTreeIndex);
    if (prevSequenceIndex !== currentTreeIndex && prevSequenceIndex < currentTreeIndex) {
      // CRITICAL FIX: Clear caches for backward navigation
      clearPositionCache();
      clearLayoutCache();
      goToPosition(prevSequenceIndex);
    } else if (prevSequenceIndex !== currentTreeIndex) {
      // Forward navigation - no cache clear needed
      goToPosition(prevSequenceIndex);
    }
  }
}

/**
 * Command to manually navigate to the next tree in sequence (simple increment)
 */
export class ManualNextTreeCommand extends NavigationCommand {
  async execute() {
    const { currentTreeIndex, treeList, goToPosition, stop } = useAppStore.getState();
    goToPosition(currentTreeIndex + 1);
    stop();
  }
}

/**
 * Command to manually navigate to the previous tree in sequence (simple decrement)
 */
export class ManualPrevTreeCommand extends NavigationCommand {
  async execute() {
    const { currentTreeIndex, goToPosition, stop, clearPositionCache, clearLayoutCache } = useAppStore.getState();
    
    // CRITICAL FIX: Clear caches for backward navigation
    clearPositionCache();
    clearLayoutCache();
    
    goToPosition(currentTreeIndex - 1);
    stop();
  }
}

/**
 * Command to navigate to a specific position in the tree sequence
 */
export class GoToPositionCommand extends NavigationCommand {
  constructor(position) {
    super();
    this.position = position;
  }

  async execute() {
    useAppStore.getState().clearStickyChartPosition();
    useAppStore.getState().goToPosition(this.position);
  }
}

/**
 * Command to handle drag navigation events
 */
export class HandleDragCommand extends NavigationCommand {
  constructor(position) {
    super();
    this.position = position;
  }

  async execute() {
    useAppStore.getState().clearStickyChartPosition();
    useAppStore.getState().goToPosition(this.position);
  }
}

/**
 * Command to navigate to a specific full tree data index
 */
export class GoToFullTreeDataIndexCommand extends NavigationCommand {
  constructor(transitionIndex) {
    super();
    this.transitionIndex = transitionIndex;
  }

  async execute() {
    const { transitionResolver, goToPosition } = useAppStore.getState();
    if (!transitionResolver) return;

    const fullTreeIndices = transitionResolver.fullTreeIndices;
    const numTransitions = Math.max(0, fullTreeIndices.length - 1);

    if (this.transitionIndex < 0 || this.transitionIndex >= numTransitions) {
      return;
    }

    if (this.transitionIndex < fullTreeIndices.length) {
      goToPosition(fullTreeIndices[this.transitionIndex]);
    }
  }
}
