// GroupingUtils.js - Core grouping logic for taxa names

/**
 * Get the group for a taxon based on separator and strategy
 * @param {string} taxon - The taxon name
 * @param {string} separator - The separator character or 'first-letter'
 * @param {string} strategyType - The grouping strategy
 * @returns {string|null} The group name or null if no group found
 */
export function getGroupForTaxon(taxon, separator, strategyType) {
  if (!taxon) return null;

  // Handle first-letter grouping
  if (separator === "first-letter" || strategyType === "first-letter") {
    return taxon.charAt(0).toUpperCase();
  }

  return getGroupForStrategy(taxon, separator, strategyType);
}

/**
 * Extract group name using specific strategy
 * @param {string} taxonName - The taxon name
 * @param {string} separator - The separator character
 * @param {string} strategyType - The grouping strategy (first, last, nth-N, between-X-N-Y-M)
 * @param {number} nthOccurrence - Default occurrence number for nth strategy
 * @returns {string|null} The group name or null if no group found
 */
export function getGroupForStrategy(taxonName, separator, strategyType, nthOccurrence = 1) {
  // Handle new 'between' strategy type
  if (strategyType && strategyType.startsWith('between-')) {
    // Parse between strategy: 'between-_-1---1' means between 1st '_' and 1st '-'
    const parts = strategyType.split('-');
    if (parts.length >= 6) {
      const startSep = parts[1];
      const startOcc = parseInt(parts[2]) || 1;
      const endSep = parts[4];
      const endOcc = parseInt(parts[5]) || 1;
      return getGroupBetweenSeparators(taxonName, startSep, startOcc, endSep, endOcc);
    }
    return null;
  }

  const parts = taxonName.split(separator);
  if (parts.length <= 1) {
    return null; // No group if separator not present or only one part
  }

  if (strategyType === 'first') {
    return parts[0]; // e.g., "A" from "A.B.C"
  } else if (strategyType === 'last') {
    return parts.slice(0, -1).join(separator); // e.g., "A.B" from "A.B.C"
  } else if (strategyType && strategyType.startsWith('nth-')) {
    const occurrenceNum = parseInt(strategyType.split('-')[1]) || nthOccurrence;
    if (occurrenceNum === 1) {
      return parts[0]; // First occurrence: text before first separator
    } else if (occurrenceNum >= 2 && occurrenceNum <= parts.length) {
      return parts[occurrenceNum - 1]; // nth occurrence: text between (nth-1) and nth separator
    }
    return null; // Invalid occurrence number
  }

  return null; // Should not happen if strategyType is validated
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
 * Generate groups from taxa names using a separator and strategy
 * @param {Array} taxaNames - Array of taxa names
 * @param {string} separator - The separator character
 * @param {string} strategy - The grouping strategy
 * @returns {Array} Array of group objects with name, count, and members
 */
export function generateGroups(taxaNames, separator, strategy) {
  const groups = new Map();

  taxaNames.forEach(taxon => {
    const groupName = getGroupForTaxon(taxon, separator, strategy);
    if (groupName) {
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      groups.get(groupName).push(taxon);
    }
  });

  return Array.from(groups.entries()).map(([name, members]) => ({
    name,
    count: members.length,
    members
  }));
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
    // Group-based coloring
    leaveOrder.forEach((taxon) => {
      const group = getGroupForTaxon(taxon, colorData.separator, colorData.strategyType);
      const groupColor = colorData.groupColorMap.get(group);
      if (groupColor) {
        newColorMap[taxon] = groupColor;
      } else {
        newColorMap[taxon] = defaultColorMap[taxon] || defaultColorMap.defaultColor || "#000000";
      }
    });
  }

  return newColorMap;
}