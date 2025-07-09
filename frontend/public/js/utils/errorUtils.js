/**
 * Unified error handling utilities for PhyloMovies
 * Consolidates error handling patterns across the application
 */

/**
 * Standard error handler with consistent logging and user feedback
 */
export class ErrorHandler {
  /**
   * Handle errors with consistent logging and optional user notification
   * @param {Error} error - The error to handle
   * @param {Object} options - Options for error handling
   * @param {string} options.context - Context where the error occurred
   * @param {boolean} options.showAlert - Whether to show user alert (default: false)
   * @param {boolean} options.logToConsole - Whether to log to console (default: true)
   * @param {string} options.fallbackMessage - Fallback message if error.message is empty
   */
  static handle(error, options = {}) {
    const {
      context = 'Unknown',
      showAlert = false,
      logToConsole = true,
      fallbackMessage = 'An unexpected error occurred'
    } = options;

    const errorMessage = error?.message || fallbackMessage;
    const fullMessage = `[${context}] ${errorMessage}`;

    if (logToConsole) {
      console.error(fullMessage, error);
    }

    if (showAlert) {
      alert(`Error: ${errorMessage}`);
    }

    return { handled: true, message: fullMessage };
  }

  /**
   * Handle async operations with automatic error handling
   * @param {Function} asyncFn - Async function to execute
   * @param {Object} options - Error handling options
   * @returns {Promise<{success: boolean, result?: any, error?: Error}>}
   */
  static async tryAsync(asyncFn, options = {}) {
    try {
      const result = await asyncFn();
      return { success: true, result };
    } catch (error) {
      this.handle(error, options);
      return { success: false, error };
    }
  }

  /**
   * Handle sync operations with automatic error handling
   * @param {Function} syncFn - Sync function to execute
   * @param {Object} options - Error handling options
   * @returns {{success: boolean, result?: any, error?: Error}}
   */
  static try(syncFn, options = {}) {
    try {
      const result = syncFn();
      return { success: true, result };
    } catch (error) {
      this.handle(error, options);
      return { success: false, error };
    }
  }
}

/**
 * Validation utilities with consistent error handling
 */
export class ValidationError extends Error {
  constructor(field, value, expectedType) {
    super(`Invalid ${field}: expected ${expectedType}, got ${typeof value}`);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
    this.expectedType = expectedType;
  }
}

export class Validator {
  /**
   * Validate required fields in an object
   * @param {Object} obj - Object to validate
   * @param {string[]} requiredFields - Array of required field names
   * @param {string} context - Context for error messages
   * @throws {ValidationError} If validation fails
   */
  static validateRequired(obj, requiredFields, context = 'Object') {
    if (!obj || typeof obj !== 'object') {
      throw new ValidationError(context, obj, 'object');
    }

    const missingFields = requiredFields.filter(field => !(field in obj));
    if (missingFields.length > 0) {
      throw new Error(`${context} missing required fields: ${missingFields.join(', ')}`);
    }
  }

  /**
   * Validate that a value is of expected type
   * @param {any} value - Value to validate
   * @param {string} expectedType - Expected type
   * @param {string} fieldName - Field name for error message
   * @throws {ValidationError} If validation fails
   */
  static validateType(value, expectedType, fieldName) {
    if (typeof value !== expectedType) {
      throw new ValidationError(fieldName, value, expectedType);
    }
  }
}

/**
 * Common async patterns with error handling
 */
export class AsyncUtils {
  /**
   * Retry an async operation with exponential backoff
   * @param {Function} asyncFn - Async function to retry
   * @param {Object} options - Retry options
   * @returns {Promise<any>} Result of successful operation
   */
  static async retry(asyncFn, options = {}) {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      backoffFactor = 2,
      context = 'Operation'
    } = options;

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await asyncFn();
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries) {
          ErrorHandler.handle(error, {
            context: `${context} (final attempt ${attempt}/${maxRetries})`,
            logToConsole: true
          });
          throw error;
        }

        const delay = initialDelay * Math.pow(backoffFactor, attempt - 1);
        console.warn(`[${context}] Attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Execute multiple async operations with error collection
   * @param {Array<Function>} asyncFns - Array of async functions
   * @param {Object} options - Execution options
   * @returns {Promise<{results: any[], errors: Error[]}>}
   */
  static async allWithErrors(asyncFns, options = {}) {
    const { context = 'Batch operation' } = options;
    const results = [];
    const errors = [];

    for (const [index, asyncFn] of asyncFns.entries()) {
      try {
        const result = await asyncFn();
        results.push(result);
      } catch (error) {
        ErrorHandler.handle(error, {
          context: `${context} [${index}]`,
          logToConsole: true
        });
        errors.push(error);
        results.push(null);
      }
    }

    return { results, errors };
  }
}

/**
 * Safe DOM operations with error handling
 */
export class DOMUtils {
  /**
   * Safely get element by ID with error handling
   * @param {string} id - Element ID
   * @param {Object} options - Options
   * @returns {Element|null} Element or null if not found
   */
  static safeGetById(id, options = {}) {
    const { required = false, context = 'DOM' } = options;

    try {
      const element = document.getElementById(id);

      if (!element && required) {
        throw new Error(`Required element not found: ${id}`);
      }

      return element;
    } catch (error) {
      ErrorHandler.handle(error, {
        context: `${context} - getElementById(${id})`,
        logToConsole: true
      });
      return null;
    }
  }

  /**
   * Safely add event listener with error handling
   * @param {Element|Window} element - Element to attach to
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   * @param {Object} options - Event listener options
   */
  static safeAddEventListener(element, event, handler, options = {}) {
    const { context = 'Event listener' } = options;

    try {
      if (!element || typeof handler !== 'function') {
        throw new Error(`Invalid element or handler for ${event} event`);
      }

      element.addEventListener(event, handler, options);
      return true;
    } catch (error) {
      ErrorHandler.handle(error, {
        context: `${context} - ${event}`,
        logToConsole: true
      });
      return false;
    }
  }
}

// Export for convenient access
export { ErrorHandler as default };
