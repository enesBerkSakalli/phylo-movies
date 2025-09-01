/**
 * Utilities for attaching/detaching event handlers for EventHandlerRegistry
 */

/**
 * Attach a single event handler with error handling
 */
export async function attachSingleHandler(registry, handler, config) {
  const {
    id,
    event, // Specific event type for this handler
    type = config.type, // Default event type from group config (e.g., "click", "change")
    action,
    fallbackCreation,
    description,
  } = handler;

  try {
    let element = null;
    const isWindowHandler = type === "window" || id === "window";

    if (id && !isWindowHandler) {
      element = document.getElementById(id);
      if (!element) {
        // Element not found - this is expected during initialization
      }
      if (!element && fallbackCreation) {
        element = fallbackCreation();
      }
    } else if (isWindowHandler) {
      element = window;
    }

    if (element) {
      const eventTypeToListen = event || type || "click";

      // Create a bound action that includes error handling
      const boundAction = async (e) => {
        try {
          const result = action(e);
          if (result && typeof result.then === 'function') {
            await result;
          }
        } catch (error) {
          registry.handleError(error, config, handler);
        }
      };

      element.addEventListener(eventTypeToListen, boundAction);
      // Reduced console noise: omit success logs per handler

      // Store details needed for detachment
      registry.attachedHandlers.push({
        elementId: id || "window",
        element: element,
        type: eventTypeToListen,
        handler: boundAction,
        description: description || `Handler for ${id || "window"} on ${eventTypeToListen}`
      });

      return true;
    } else {
      return false;
    }
  } catch (error) {
    registry.handleError(error, config, handler);
    return false;
  }
}

/**
 * Attach handlers for a specific configuration group
 */
export async function attachHandlerGroup(registry, config) {
  const results = await Promise.allSettled(
    config.handlers.map((handler) =>
      attachSingleHandler(registry, handler, config)
    )
  );

  const successful = results.filter(
    (r) => r.status === "fulfilled" && r.value
  ).length;
  const total = config.handlers.length;

  return { successful, total, results };
}

/**
 * Main method to attach all event handlers
 */
export async function attachAll(registry) {
  const configs = registry.getEventHandlerConfigs();
  const summary = {
    totalGroups: 0,
    successfulGroups: 0,
    totalHandlers: 0,
    successfulHandlers: 0,
  };

  // Use for...of to iterate through configurations
  for (const [, config] of Object.entries(configs)) {
    summary.totalGroups++;

    const result = await attachHandlerGroup(registry, config);
    summary.totalHandlers += result.total;
    summary.successfulHandlers += result.successful;

    if (result.successful === result.total) {
      summary.successfulGroups++;
    }
  }

  return summary;
}

/**
 * Detach all attached handlers (cleanup)
 */
export function detachAll(registry) {
  registry.attachedHandlers.forEach(handlerInfo => {
    try {
      handlerInfo.element.removeEventListener(handlerInfo.type, handlerInfo.handler);
    } catch (error) {
      console.error(`Error detaching handler ${handlerInfo.description}:`, error);
    }
  });
  registry.attachedHandlers = [];
}
