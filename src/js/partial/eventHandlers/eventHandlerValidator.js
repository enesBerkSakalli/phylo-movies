/**
 * Validation system for event handler configurations
 */
export class EventHandlerValidator {
  static validateHandlerConfig(handler, config) {
    const errors = [];
    const warnings = [];

    // Required fields validation
    if (!handler.description) {
      errors.push('Handler missing description');
    }

    if (!handler.action || typeof handler.action !== 'function') {
      errors.push('Handler missing or invalid action function');
    }

    // Type validation
    const validTypes = ['click', 'change', 'input', 'focus', 'blur', 'submit', 'window', 'mixed', 'special'];
    const handlerType = handler.type || config.type;
    if (handlerType && !validTypes.includes(handlerType)) {
      warnings.push(`Unknown handler type: ${handlerType}`);
    }

    // Error handling validation
    const validErrorHandling = ['log', 'notify', 'silent'];
    if (config.errorHandling && !validErrorHandling.includes(config.errorHandling)) {
      warnings.push(`Unknown error handling mode: ${config.errorHandling}`);
    }

    // Element existence validation (for non-window handlers)
    if (handler.id && handlerType !== 'window') {
      const element = document.getElementById(handler.id);
      if (!element && !handler.fallbackCreation) {
        warnings.push(`Element not found: ${handler.id} (no fallback provided)`);
      }
    }

    return { errors, warnings, isValid: errors.length === 0 };
  }

  static validateAllConfigs(configs) {
    const results = {};
    let totalErrors = 0;
    let totalWarnings = 0;

    for (const [groupName, config] of Object.entries(configs)) {
      results[groupName] = {
        handlers: [],
        groupErrors: [],
        groupWarnings: []
      };

      // Validate group-level config
      if (!config.handlers || !Array.isArray(config.handlers)) {
        results[groupName].groupErrors.push('Config missing or invalid handlers array');
        totalErrors++;
        continue;
      }

      // Validate each handler in the group
      for (const [index, handler] of config.handlers.entries()) {
        const validation = this.validateHandlerConfig(handler, config);
        results[groupName].handlers.push({
          index,
          handler: handler.id || `handler-${index}`,
          ...validation
        });

        totalErrors += validation.errors.length;
        totalWarnings += validation.warnings.length;
      }
    }

    return {
      results,
      summary: {
        totalErrors,
        totalWarnings,
        isValid: totalErrors === 0
      }
    };
  }

  static logValidationResults(validationResults) {
    const { results, summary } = validationResults;

    console.log('🔍 Event Handler Configuration Validation Results:');
    console.log(`   Total Errors: ${summary.totalErrors}`);
    console.log(`   Total Warnings: ${summary.totalWarnings}`);
    console.log(`   Overall Status: ${summary.isValid ? '✅ Valid' : '❌ Invalid'}`);

    for (const [groupName, groupResult] of Object.entries(results)) {
      const groupErrors = groupResult.handlers.reduce((sum, h) => sum + h.errors.length, 0) + groupResult.groupErrors.length;
      const groupWarnings = groupResult.handlers.reduce((sum, h) => sum + h.warnings.length, 0) + groupResult.groupWarnings.length;
      
      if (groupErrors > 0 || groupWarnings > 0) {
        console.log(`📋 ${groupName}:`);
        
        if (groupResult.groupErrors.length > 0) {
          console.log(`   Group Errors: ${groupResult.groupErrors.join(', ')}`);
        }
        
        for (const handlerResult of groupResult.handlers) {
          if (handlerResult.errors.length > 0) {
            console.log(`   ❌ ${handlerResult.handler}: ${handlerResult.errors.join(', ')}`);
          }
          if (handlerResult.warnings.length > 0) {
            console.log(`   ⚠ ${handlerResult.handler}: ${handlerResult.warnings.join(', ')}`);
          }
        }
      }
    }
  }
}
