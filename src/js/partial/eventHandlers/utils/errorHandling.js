import { notifications } from "../notificationSystem.js";

/**
 * Centralized error handling utility for event handlers.
 * @param {object} registry - The EventHandlerRegistry instance (for context/logging if needed)
 * @param {Error} error - The error caught
 * @param {object} config - The config object containing errorHandling strategy
 * @param {object} handlerInfo - Information about the handler (for messaging)
 */
export function handleError(registry, error, config, handlerInfo) {
  const errorMessage = `Error in ${handlerInfo.description}: ${error.message}`;

  switch (config.errorHandling) {
    case "notify":
      console.error(errorMessage, error);
      notifications.show(errorMessage, "error");
      break;
    case "log":
      console.error(errorMessage, error);
      break;
    case "silent":
      // Silent error handling
      break;
    default:
      console.error(errorMessage, error);
  }
}

