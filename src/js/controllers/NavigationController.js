import { useAppStore } from '../core/store.js'; // <-- IMPORT THE STORE

/**
 * NavigationController - Manages all tree navigation logic, state, and race condition prevention.
 *
 * This class implements the Facade pattern to provide a simplified interface to the navigation
 * system, while using the Strategy pattern internally to execute different navigation commands.
 *
 * Key responsibilities:
 * - Prevent race conditions during navigation using the isNavigating lock
 * - Orchestrate execution of navigation commands
 * - Provide error handling and logging for navigation operations
 * - Maintain separation of concerns between GUI rendering and navigation logic
 * - Manage navigation integration
 */
export class NavigationController {
  constructor() {
    this.isNavigating = false;
  }

  /**
   * Executes a navigation command, ensuring only one navigation action runs at a time.
   * This method implements the core race condition prevention logic.
   *
   * @param {Object} command - An object with an `execute` method that performs the navigation logic.
   * @returns {Promise<void>}
   */
  async execute(command) {
    if (this.isNavigating) {
      console.log("[NavigationController] Navigation locked, ignoring request.");
      return;
    }

    this.isNavigating = true;

    try {
      await command.execute();
    } catch (error) {
      console.error("[NavigationController] Error during navigation execution:", error);
      throw error;
    } finally {
      this.isNavigating = false;
    }
  }
  isLocked() {
    return this.isNavigating;
  }

  /**
   * Emergency method to unlock navigation if something goes wrong
   * Should only be used in exceptional circumstances
   */
  forceUnlock() {
    console.warn("[NavigationController] Force unlocking navigation - this should only be used in emergencies");
    this.isNavigating = false;
  }

  // Sticky chart position features removed

  // Chart tree index helpers removed; React chart derives index directly

  // Chart-specific callbacks removed (React chart calls store directly)
}
