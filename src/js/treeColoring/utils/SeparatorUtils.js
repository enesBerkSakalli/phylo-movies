// SeparatorUtils.js - Separator analysis and detection utilities

/**
 * Analyze separator usage in taxa names
 * @param {Array} taxaNames - Array of taxa names
 * @param {string} separator - The separator character to analyze
 * @returns {Object} Analysis results with isUseful, percentage, and examples
 */
export function analyzeSeparatorUsage(taxaNames, separator) {
  if (!taxaNames.length) return { isUseful: false, percentage: 0, examples: [] };

  const withSeparator = taxaNames.filter(name => name.includes(separator));
  const percentage = (withSeparator.length / taxaNames.length) * 100;

  return {
    isUseful: percentage >= 20 && withSeparator.length >= 2,
    percentage: Math.round(percentage),
    examples: withSeparator.slice(0, 3)
  };
}

/**
 * Detect useful separators in taxa names
 * @param {Array} taxaNames - Array of taxa names
 * @returns {Array} Array of separator objects with char, displayName, usage, and examples
 */
export function detectUsefulSeparators(taxaNames) {
  const separatorChars = ['-', '_', '.', ' ', '|', ':'];
  const results = [];

  separatorChars.forEach(char => {
    const usage = analyzeSeparatorUsage(taxaNames, char);
    if (usage.isUseful) {
      results.push({
        char: char,
        displayName: char === ' ' ? 'Space' : char,
        usage: usage.percentage,
        examples: usage.examples
      });
    }
  });

  return results.sort((a, b) => b.usage - a.usage);
}