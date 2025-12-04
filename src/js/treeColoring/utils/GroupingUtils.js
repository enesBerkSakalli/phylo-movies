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
    const bestSeparator = detectBestSeparator([taxon]);
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

  // Map old strategy names to new ones
  const strategy = strategyType === 'first' ? 'prefix' :
                  strategyType === 'last' ? 'suffix' :
                  strategyType;

  if (strategy === 'prefix') {
    return parts[0]; // e.g., "A" from "A_B_C"
  } else if (strategy === 'suffix') {
    return parts[parts.length - 1]; // e.g., "C" from "A_B_C"
  } else if (strategy === 'middle') {
    if (parts.length < 3) return null;
    return parts[Math.floor(parts.length / 2)]; // Middle segment
  } else if (strategy === 'segment') {
    const segmentIndex = options.segmentIndex ?? 0;
    if (segmentIndex < 0) {
      // Negative index: count from end
      const idx = parts.length + segmentIndex;
      return idx >= 0 ? parts[idx] : null;
    }
    return segmentIndex < parts.length ? parts[segmentIndex] : null;
  }

  return null;
}

/**
 * Get text between two different separators at specific occurrences
 * @param {string} taxonName - The taxon name
 * @param {string} startSeparator - The starting separator character
 * @param {number} startOccurrence - Which occurrence of start separator to use
 * @param {string} endSeparator - The ending separator character
 * @param {number} endOccurrence - Which occurrence of end separator to use
 * @returns {string|null} The text between separators or null if not found
 */
export function getGroupBetweenSeparators(taxonName, startSeparator, startOccurrence, endSeparator, endOccurrence) {
  // Find the position of the start separator (nth occurrence)
  let startPos = -1;
  let currentOccurrence = 0;
  for (let i = 0; i < taxonName.length; i++) {
    if (taxonName[i] === startSeparator) {
      currentOccurrence++;
      if (currentOccurrence === startOccurrence) {
        startPos = i;
        break;
      }
    }
  }

  if (startPos === -1) {
    return null; // Start separator not found at specified occurrence
  }

  // Find the position of the end separator (nth occurrence) after the start position
  let endPos = -1;
  currentOccurrence = 0;
  for (let i = startPos + 1; i < taxonName.length; i++) {
    if (taxonName[i] === endSeparator) {
      currentOccurrence++;
      if (currentOccurrence === endOccurrence) {
        endPos = i;
        break;
      }
    }
  }

  if (endPos === -1) {
    // If end separator not found, take until the end of string
    return taxonName.substring(startPos + 1);
  }

  return taxonName.substring(startPos + 1, endPos);
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
 * Detect best separator for a set of taxa names (backward compatible)
 * @param {Array} taxaNames - Array of taxa names
 * @returns {string|null} Best separator character or null if none found
 */
export function detectBestSeparator(taxaNames) {
  const ranked = detectBestSeparators(taxaNames);
  return ranked.length > 0 ? ranked[0].separator : null;
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

  if (colorData.mode === "taxa") {
    // Direct taxa coloring
    for (const [taxon, color] of colorData.taxaColorMap) {
      newColorMap[taxon] = color;
    }
  } else if (colorData.mode === "groups") {
    // Group-based coloring from pattern detection
    const separators = colorData.separators || colorData.separator;
    const options = {
      segmentIndex: colorData.segmentIndex,
      useRegex: colorData.useRegex,
      regexPattern: colorData.regexPattern
    };

    leaveOrder.forEach((taxon) => {
      const group = getGroupForTaxon(taxon, separators, colorData.strategyType, options);
      const groupColor = colorData.groupColorMap.get(group);

      if (groupColor) {
        newColorMap[taxon] = groupColor;
      } else {
        newColorMap[taxon] = defaultColorMap[taxon] || defaultColorMap.defaultColor || "#000000";
      }
    });
  } else if (colorData.mode === "csv") {
    // CSV-based group coloring
    leaveOrder.forEach((taxon) => {
      // Get group from CSV mapping
      const group = colorData.csvTaxaMap?.get(taxon);
      const groupColor = group ? colorData.groupColorMap.get(group) : null;

      if (groupColor) {
        newColorMap[taxon] = groupColor;
      } else {
        newColorMap[taxon] = defaultColorMap[taxon] || defaultColorMap.defaultColor || "#000000";
      }
    });
  }

  return newColorMap;
}
