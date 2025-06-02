import { EventHandlerRegistry } from './eventHandlerRegistry.js';
import { EventHandlerIterator } from './eventHandlerIterator.js';
import { notifications } from './notificationSystem.js';

/**
 * Manages the attachment and detachment of GUI event handlers.
 * It uses an `EventHandlerRegistry` to define and manage handler configurations
 * and an `EventHandlerIterator` (though its usage seems to have been replaced by direct registry calls).
 * @export
 * @class GuiEventHandlers
 */
export class GuiEventHandlers {
  /**
   * Creates an instance of GuiEventHandlers.
   * @param {Gui} gui - The main GUI instance that handlers will interact with.
   */
  constructor(gui) {
    this.gui = gui;
    this.registry = new EventHandlerRegistry(gui);
    // iterator might be deprecated or its role changed, as attachAll directly uses registry.
    this.iterator = new EventHandlerIterator(this.registry);
    this.attachmentStats = null; // Stores statistics from the last attachAll call.
  }

  /**
   * Attaches all configured GUI event handlers defined in the `EventHandlerRegistry`.
   * It delegates the attachment logic to `this.registry.attachAll()`.
   * @async
   * @returns {Promise<Object>} A promise that resolves to an object containing statistics about the attachment process.
   * @throws {Error} If there's a critical failure during the handler attachment process.
   */
  async attachAll() {
    console.log('🎮 Initializing GUI event handler system...');
    
    try {
      // Use the registry to attach all handlers
      this.attachmentStats = await this.registry.attachAll();
      
      
      return this.attachmentStats;
    } catch (error) {
      console.error('❌ Failed to attach GUI event handlers:', error);
      notifications.show('Failed to initialize interface controls: ' + error.message, 'error');
      throw error; // Re-throw the error to be handled by the caller if necessary.
    }
  }

  /**
   * Retrieves detailed statistics about the attached event handlers.
   * This includes stats from the registry, the last attachment operation, and the iterator.
   * @returns {Object} An object containing various statistics.
   * Example: { registry: {...}, attachment: {...}, iterator: {...} }
   */
  getDetailedStats() {
    return {
      registry: this.registry.getStats(),
      attachment: this.attachmentStats,
      iterator: { // Iterator stats might be less relevant if not directly used by attachAll
        totalHandlers: this.iterator.getTotalCount(),
        groupCount: this.iterator.groupNames.length
      }
    };
  }

  /**
   * Attaches a specific group of event handlers by its name.
   * Handler groups are defined in `EventHandlerRegistry.getEventHandlerConfigs()`.
   * @async
   * @param {string} groupName - The name of the handler group to attach.
   * @returns {Promise<Object>} A promise that resolves to statistics about the attachment of this group.
   * @throws {Error} If the specified group name is not found in the configurations.
   */
  async attachGroup(groupName) {
    const configs = this.registry.getEventHandlerConfigs();
    if (!configs[groupName]) {
      throw new Error(`Handler group '${groupName}' not found`);
    }    
    return await this.registry.attachHandlerGroup(groupName, configs[groupName]);
  }

  /**
   * Attempts to re-attach event handlers that may have failed during a previous `attachAll` or `attachGroup` call.
   * It identifies failed handlers by checking which configured handlers are not currently marked as attached in the registry.
   * @async
   * @returns {Promise<Object>} A promise that resolves to an object with `attempted` and `successful` retry counts.
   */
  async retryFailedHandlers() {
    console.log('🔄 Retrying failed handler attachments...');
    // Find handlers that should exist but weren't attached
    const configs = this.registry.getEventHandlerConfigs();
    const failedHandlers = [];
    
    for (const [groupName, config] of Object.entries(configs)) {
      for (const handler of config.handlers) {
        if (handler.id && !this.registry.attachedHandlers.has(`${handler.id}-${handler.type || config.type || 'click'}`)) {
          failedHandlers.push({ groupName, config, handler });
        }
      }
    }
        
    let retrySuccessCount = 0;
    for (const { config, handler } of failedHandlers) {
      const success = await this.registry.attachSingleHandler(handler, config);
      if (success) retrySuccessCount++;
    }
    
    console.log(`✅ Retry results: ${retrySuccessCount}/${failedHandlers.length} successful`);
    return { attempted: failedHandlers.length, successful: retrySuccessCount };
  }

  /**
   * Detaches all event handlers that were previously attached by this instance
   * through the `EventHandlerRegistry`.
   * This is crucial for preventing memory leaks when the GUI is re-initialized or destroyed.
   * @returns {void}
   */
  cleanup() {
    console.log('🧹 GuiEventHandlers: Cleaning up attached GUI handlers...');
    this.registry.detachAll();
    console.log('✅ GuiEventHandlers: Cleanup complete.');
  }

}