/**
 * Iterator pattern implementation for event handler processing
 */
export class EventHandlerIterator {
  constructor(eventHandlerRegistry) {
    this.registry = eventHandlerRegistry;
    this.configs = eventHandlerRegistry.getEventHandlerConfigs();
    this.currentGroupIndex = 0;
    this.currentHandlerIndex = 0;
    this.groupNames = Object.keys(this.configs);
  }

  /**
   * Check if there are more handlers to process
   */
  hasNext() {
    if (this.currentGroupIndex >= this.groupNames.length) {
      return false;
    }

    const currentGroup = this.groupNames[this.currentGroupIndex];
    const currentConfig = this.configs[currentGroup];
    
    return this.currentHandlerIndex < currentConfig.handlers.length;
  }

  /**
   * Get the next handler to process
   */
  next() {
    if (!this.hasNext()) {
      return { done: true };
    }

    const currentGroup = this.groupNames[this.currentGroupIndex];
    const currentConfig = this.configs[currentGroup];
    const handler = currentConfig.handlers[this.currentHandlerIndex];

    const result = {
      done: false,
      value: {
        groupName: currentGroup,
        config: currentConfig,
        handler: handler,
        index: {
          group: this.currentGroupIndex,
          handler: this.currentHandlerIndex
        }
      }
    };

    // Move to next handler
    this.currentHandlerIndex++;
    
    // If we've processed all handlers in current group, move to next group
    if (this.currentHandlerIndex >= currentConfig.handlers.length) {
      this.currentGroupIndex++;
      this.currentHandlerIndex = 0;
    }

    return result;
  }

  /**
   * Reset iterator to beginning
   */
  reset() {
    this.currentGroupIndex = 0;
    this.currentHandlerIndex = 0;
  }

  /**
   * Make this object iterable
   */
  [Symbol.iterator]() {
    return this;
  }

  /**
   * Get total count of handlers across all groups
   */
  getTotalCount() {
    return this.groupNames.reduce((total, groupName) => {
      return total + this.configs[groupName].handlers.length;
    }, 0);
  }

  /**
   * Process handlers with a custom callback
   */
  async processWithCallback(callback) {
    const results = [];
    
    for (const item of this) {
      try {
        const result = await callback(item);
        results.push({ success: true, item, result });
      } catch (error) {
        results.push({ success: false, item, error });
      }
    }
    
    return results;
  }

  /**
   * Filter handlers by criteria
   */
  *filter(predicate) {
    this.reset();
    for (const item of this) {
      if (predicate(item)) {
        yield item;
      }
    }
  }

  /**
   * Map handlers to new format
   */
  *map(transformer) {
    this.reset();
    for (const item of this) {
      yield transformer(item);
    }
  }
}
