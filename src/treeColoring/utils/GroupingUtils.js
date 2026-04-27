// GroupingUtils.js - Core grouping logic for taxa names

/**
 * Escape special regex characters in a string
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Split taxon name using multiple separators
 * @param {string} taxon - The taxon name
 * @param {Array<string>|string} separators - Array of separator characters or single separator
 * @returns {Array<string>} Array of parts
 */
function splitByMultipleSeparators(taxon, separators) {
  if (!separators || (Array.isArray(separators) && separators.length === 0)) {
    return [taxon];
  }

  const sepsArray = Array.isArray(separators) ? separators : [separators];
  const pattern = sepsArray.map(escapeRegex).join('|');
  return taxon.split(new RegExp(pattern));
}

/**
 * Get the group for a taxon based on separator(s) and strategy
 * @param {string} taxon - The taxon name
 * @param {Array<string>|string|null} separators - Separator character(s), array of separators, or null for auto-detect
 * @param {string} strategyType - The grouping strategy
 * @param {Object} options - Additional options (segmentIndex, useRegex, regexPattern)
 * @returns {string|null} The group name or null if no group found
 */
export function getGroupForTaxon(taxon, separators, strategyType, options = {}) {
  if (!taxon) return null;

  // Handle first-letter grouping
  if (strategyType === "first-letter") {
    return taxon.charAt(0).toUpperCase();
  }

  // Handle custom regex mode
  if (options.useRegex && options.regexPattern) {
    try {
      const regex = new RegExp(options.regexPattern);
      const match = taxon.match(regex);
      return match && match[1] ? match[1] : null;
    } catch (e) {
      return null;
    }
  }

  // Auto-detect separator if not provided
  let usedSeparators = separators;
  if (!separators && strategyType !== "first-letter") {
    const detectedList = detectBestSeparators([taxon]);
    const bestSeparator = detectedList.length > 0 ? detectedList[0].separator : null;
    usedSeparators = bestSeparator ? [bestSeparator] : null;
    if (!usedSeparators) {
      return null;
    }
  }

  return getGroupForStrategy(taxon, usedSeparators, strategyType, options);
}

/**
 * Extract group name using specific strategy
 * @param {string} taxonName - The taxon name
 * @param {Array<string>|string} separators - Separator character(s)
 * @param {string} strategyType - The grouping strategy (prefix, suffix, middle, segment)
 * @param {Object} options - Additional options (segmentIndex for segment selection)
 * @returns {string|null} The group name or null if no group found
 */
export function getGroupForStrategy(taxonName, separators, strategyType, options = {}) {
  const parts = splitByMultipleSeparators(taxonName, separators);

  if (parts.length <= 1) {
    return null; // No group if separator not present or only one part
  }

  let groupName = null;

  if (strategyType === 'prefix') {
    groupName = parts[0]; // e.g., "A" from "A_B_C"
  } else if (strategyType === 'suffix') {
    groupName = parts[parts.length - 1]; // e.g., "C" from "A_B_C"
  } else if (strategyType === 'middle') {
    if (parts.length < 3) return null;
    groupName = parts[Math.floor(parts.length / 2)]; // Middle segment
  } else if (strategyType === 'segment') {
    const segmentIndex = options.segmentIndex ?? 0;
    if (segmentIndex < 0) {
      // Negative index: count from end
      const idx = parts.length + segmentIndex;
      groupName = idx >= 0 ? parts[idx] : null;
    } else {
      groupName = segmentIndex < parts.length ? parts[segmentIndex] : null;
    }
  }

  // Trim whitespace and return null for empty strings
  if (groupName != null) {
    groupName = String(groupName).trim();
    if (groupName === '') return null;
  }

  return groupName;
}

/**
 * Detect best separators for a set of taxa names with ranking
 * @param {Array} taxaNames - Array of taxa names
 * @returns {Array<{separator: string, usage: number, score: number}>} Ranked separators
 */
export function detectBestSeparators(taxaNames) {
  const separatorChars = ['_', '-', '.', ' ', '|', ':', '@', '#'];
  const results = [];

  separatorChars.forEach(char => {
    const withSeparator = taxaNames.filter(name => name.includes(char));
    const usage = (withSeparator.length / taxaNames.length) * 100;

    if (usage >= 10 && withSeparator.length >= 2) {
      // Calculate score based on usage and group balance
      const avgOccurrences = withSeparator.reduce((sum, name) =>
        sum + (name.match(new RegExp(escapeRegex(char), 'g')) || []).length, 0) / withSeparator.length;

      const score = usage * (1 + avgOccurrences / 10);
      results.push({ separator: char, usage, avgOccurrences, score });
    }
  });

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Generate groups from taxa names with enhanced multi-separator support
 * @param {Array} taxaNames - Array of taxa names
 * @param {Array<string>|string|null} separators - Separator character(s) or null for auto-detect
 * @param {string} strategy - The grouping strategy
 * @param {Object} options - Additional options (segmentIndex, useRegex, regexPattern)
 * @returns {Object} Result with groups array, separators used, and analysis data
 */
export function generateGroups(taxaNames, separators, strategy, options = {}) {
  const groups = new Map();
  const ungrouped = [];
  let usedSeparators = separators;

  // Auto-detect separators if not provided and not first-letter strategy
  if ((!separators || (Array.isArray(separators) && separators.length === 0)) &&
      strategy !== "first-letter" && !options.useRegex) {
    const detected = detectBestSeparators(taxaNames);
    usedSeparators = detected.length > 0 ? [detected[0].separator] : null;
    if (!usedSeparators) {
      return {
        groups: [],
        separators: null,
        analyzed: true,
        ungroupedCount: taxaNames.length,
        ungroupedPercent: 100,
        detectedSeparators: detected
      };
    }
  }

  // Normalize to array
  const separatorsArray = Array.isArray(usedSeparators) ? usedSeparators :
                         usedSeparators ? [usedSeparators] : null;

  taxaNames.forEach(taxon => {
    const groupName = getGroupForTaxon(taxon, separatorsArray, strategy, options);
    if (groupName) {
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      groups.get(groupName).push(taxon);
    } else {
      ungrouped.push(taxon);
    }
  });

  const groupArray = Array.from(groups.entries())
    .map(([name, members]) => ({
      name,
      count: members.length,
      members
    }))
    .sort((a, b) => b.count - a.count); // Sort by count descending

  const ungroupedCount = ungrouped.length;
  const ungroupedPercent = (ungroupedCount / taxaNames.length) * 100;

  return {
    groups: groupArray,
    separators: separatorsArray,
    analyzed: !separators, // indicates if separators were auto-detected
    ungroupedCount,
    ungroupedPercent: Math.round(ungroupedPercent * 10) / 10,
    totalTaxa: taxaNames.length,
    detectedSeparators: !separators ? detectBestSeparators(taxaNames) : []
  };
}

/**
 * Apply coloring data to create a new color map
 * @param {Object} colorData - The coloring data from TaxaColoring modal
 * @param {Array} leaveOrder - Array of taxa names
 * @param {Object} defaultColorMap - Default color map to fall back on
 * @returns {Object} New color map with taxon names as keys and colors as values
 */
export function applyColoringData(colorData, leaveOrder, defaultColorMap) {
  const newColorMap = {};
  const safeDefaultColorMap = defaultColorMap || {};
  const fallbackColor = safeDefaultColorMap.defaultColor || "#000000";

  if (colorData.mode === "taxa") {
    // Direct taxa coloring
    for (const [taxon, color] of Object.entries(colorData.taxaColorMap || {})) {
      newColorMap[taxon] = color;
    }
  } else if (colorData.mode === "groups") {
    // Group-based coloring from pattern detection
    const separators = colorData.separators || colorData.separator;
    const groupColorMap = colorData.groupColorMap || {};
    const options = {
      segmentIndex: colorData.segmentIndex,
      useRegex: colorData.useRegex,
      regexPattern: colorData.regexPattern
    };

    leaveOrder.forEach((taxon) => {
      const group = getGroupForTaxon(taxon, separators, colorData.strategyType, options);
      // Ensure string lookup for group color (handles numeric-like group names)
      const groupKey = group != null ? String(group) : null;
      const groupColor = groupKey != null ? groupColorMap[groupKey] : null;

      if (groupColor) {
        newColorMap[taxon] = groupColor;
      } else {
        newColorMap[taxon] = safeDefaultColorMap[taxon] || fallbackColor;
      }
    });
  } else if (colorData.mode === "csv") {
    // CSV-based group coloring
    // Handle csvTaxaMap as either Map or Object (from serialized state)
    const csvMap = colorData.csvTaxaMap;
    const groupColorMap = colorData.groupColorMap || {};
    const getGroup = (taxon) => {
      if (csvMap instanceof Map) {
        return csvMap.get(taxon);
      } else if (csvMap && typeof csvMap === 'object') {
        return csvMap[taxon];
      }
      return null;
    };

    leaveOrder.forEach((taxon) => {
      // Get group from CSV mapping
      const group = getGroup(taxon);
      // Ensure string lookup for group color
      const groupKey = group != null ? String(group) : null;
      const groupColor = groupKey != null ? groupColorMap[groupKey] : null;

      if (groupColor) {
        newColorMap[taxon] = groupColor;
      } else {
        newColorMap[taxon] = safeDefaultColorMap[taxon] || fallbackColor;
      }
    });
  }

  return newColorMap;
}

/**
 * Get the color for a single taxon based on taxaGrouping config
 * This is the single source of truth for taxon color resolution.
 * 
 * @param {string} taxonName - The taxon name to get color for
 * @param {Object} taxaGrouping - The taxaGrouping object from store (mode, groupColorMap, etc.)
 * @param {string} defaultColor - Default color if no group/taxa color found
 * @returns {string|null} The color for the taxon, or null if no specific color
 */
export function getTaxonColor(taxonName, taxaGrouping, defaultColor = null) {
  if (!taxonName || !taxaGrouping) {
    return defaultColor;
  }

  const { mode, groupColorMap, taxaColorMap, csvTaxaMap, separators, separator, strategyType, segmentIndex, useRegex, regexPattern } = taxaGrouping;

  if (mode === 'taxa') {
    // Direct taxa coloring
    const color = taxaColorMap?.[taxonName];
    return color || defaultColor;
  }

  if (mode === 'groups') {
    // Pattern-based grouping
    const seps = separators || separator;
    const options = { segmentIndex, useRegex, regexPattern };
    const group = getGroupForTaxon(taxonName, seps, strategyType, options);
    const groupKey = group != null ? String(group) : null;
    const groupColor = groupKey != null ? groupColorMap?.[groupKey] : null;
    return groupColor || defaultColor;
  }

  if (mode === 'csv') {
    // CSV-based group coloring
    let group = null;
    if (csvTaxaMap instanceof Map) {
      group = csvTaxaMap.get(taxonName);
    } else if (csvTaxaMap && typeof csvTaxaMap === 'object') {
      group = csvTaxaMap[taxonName];
    }
    const groupKey = group != null ? String(group) : null;
    const groupColor = groupKey != null ? groupColorMap?.[groupKey] : null;
    return groupColor || defaultColor;
  }

  return defaultColor;
}
