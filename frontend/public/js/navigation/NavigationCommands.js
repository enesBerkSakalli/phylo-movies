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
  constructor(gui) {
    this.gui = gui;
    this.resolver = gui.transitionResolver;
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
    this.gui.navigationController.clearStickyPosition();
  }

  /**
   * Common post-navigation logic shared by most commands
   * @param {boolean} skipAutoCenter - Whether to skip auto-centering during update
   */
  async _finish(skipAutoCenter = true) {
    await this.gui.update(skipAutoCenter);
    if (this.gui.syncMSAEnabled && this.gui.isMSAViewerOpen()) {
      this.gui.syncMSAIfOpen();
    }
  }
}

/**
 * Command to navigate forward in the tree sequence
 */
export class ForwardCommand extends NavigationCommand {
  async execute() {
    this._prepare();
    if (!this.resolver) return;

    const nextPosition = this.resolver.getNextPosition(this.gui.currentTreeIndex);
    if (nextPosition !== this.gui.currentTreeIndex) {
      this.gui.currentTreeIndex = nextPosition;
    }

    await this._finish();
  }
}

/**
 * Command to navigate backward in the tree sequence
 */
export class BackwardCommand extends NavigationCommand {
  async execute() {
    this._prepare();
    if (!this.resolver) return;

    const prevPosition = this.resolver.getPreviousPosition(this.gui.currentTreeIndex);
    if (prevPosition !== this.gui.currentTreeIndex) {
      this.gui.currentTreeIndex = prevPosition;
    }

    await this._finish();
  }
}

/**
 * Command to navigate to the next full tree
 */
export class NextTreeCommand extends NavigationCommand {
  async execute() {
    this._prepare();
    if (!this.resolver) return;

    const nextSequenceIndex = this.resolver.getNextFullTreeSequenceIndex(this.gui.currentTreeIndex);
    if (nextSequenceIndex !== this.gui.currentTreeIndex) {
      this.gui.currentTreeIndex = nextSequenceIndex;
    }

    await this._finish();
  }
}

/**
 * Command to navigate to the previous full tree
 */
export class PrevTreeCommand extends NavigationCommand {
  async execute() {
    this._prepare();
    if (!this.resolver) return;

    const prevSequenceIndex = this.resolver.getPreviousFullTreeSequenceIndex(this.gui.currentTreeIndex);
    if (prevSequenceIndex !== this.gui.currentTreeIndex) {
      this.gui.currentTreeIndex = prevSequenceIndex;
    }

    await this._finish();
  }
}

/**
 * Command to manually navigate to the next tree in sequence (simple increment)
 */
export class ManualNextTreeCommand extends NavigationCommand {
  async execute() {
    this.gui.currentTreeIndex = Math.min(this.gui.currentTreeIndex + 1, this.gui.treeList.length - 1);
    this.gui.stop();
    await this.gui.update();
  }
}

/**
 * Command to manually navigate to the previous tree in sequence (simple decrement)
 */
export class ManualPrevTreeCommand extends NavigationCommand {
  async execute() {
    this.gui.currentTreeIndex = Math.max(this.gui.currentTreeIndex - 1, 0);
    this.gui.stop();
    await this.gui.update();
  }
}

/**
 * Command to navigate to a specific position in the tree sequence
 */
export class GoToPositionCommand extends NavigationCommand {
  constructor(gui, position) {
    super(gui);
    this.position = position;
  }

  async execute() {
    this.gui.navigationController.clearStickyPosition();

    if (isNaN(this.position) || this.position < 0 || this.position >= this.gui.treeList.length) {
      return;
    }

    this.gui.currentTreeIndex = this.position;
    await this.gui.update();
  }
}

/**
 * Command to handle drag navigation events
 */
export class HandleDragCommand extends NavigationCommand {
  constructor(gui, position) {
    super(gui);
    this.position = position;
  }

  async execute() {
    this.gui.navigationController.clearStickyPosition();
    this.gui.currentTreeIndex = Math.max(0, Math.min(this.position, this.gui.treeList.length - 1));
    await this.gui.update();
  }
}

/**
 * Command to navigate to a specific full tree data index
 */
export class GoToFullTreeDataIndexCommand extends NavigationCommand {
  constructor(gui, transitionIndex) {
    super(gui);
    this.transitionIndex = transitionIndex;
  }

  async execute() {
    if (!this.resolver) return;

    const fullTreeIndices = this.resolver.fullTreeIndices;
    const numTransitions = Math.max(0, fullTreeIndices.length - 1);

    if (this.transitionIndex < 0 || this.transitionIndex >= numTransitions) {
      return;
    }

    // Note: The sticky position is already set by the chart callback in NavigationController
    // We don't clear it here because this command is specifically for chart navigation

    if (this.transitionIndex < fullTreeIndices.length) {
      this.gui.currentTreeIndex = fullTreeIndices[this.transitionIndex];
    }

    await this.gui.update();
  }
}
