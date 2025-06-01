import { EventHandlerRegistry } from './eventHandlerRegistry.js';
import { EventHandlerIterator } from './eventHandlerIterator.js';
import { notifications } from './notificationSystem.js';

/**
 * Modern GUI event handler system using data-driven approach
 */
export class GuiEventHandlers {
  constructor(gui) {
    this.gui = gui;
    this.registry = new EventHandlerRegistry(gui);
    this.iterator = new EventHandlerIterator(this.registry);
    this.attachmentStats = null;
  }

  /**
   * Attach all GUI event handlers using the iterator pattern
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
      throw error;
    }
  }

  /**
   * Get detailed statistics about attached handlers
   */
  getDetailedStats() {
    return {
      registry: this.registry.getStats(),
      attachment: this.attachmentStats,
      iterator: {
        totalHandlers: this.iterator.getTotalCount(),
        groupCount: this.iterator.groupNames.length
      }
    };
  }

  /**
   * Attach specific handler group only
   */
  async attachGroup(groupName) {
    const configs = this.registry.getEventHandlerConfigs();
    if (!configs[groupName]) {
      throw new Error(`Handler group '${groupName}' not found`);
    }    
    return await this.registry.attachHandlerGroup(groupName, configs[groupName]);
  }

  /**
   * Re-attach handlers that failed
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
   * Cleanup all handlers
   */
  cleanup() {
    this.registry.detachAll();
  }

}