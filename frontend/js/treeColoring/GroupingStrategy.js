// File: GroupingStrategy.js
// Handles strategies for grouping taxa (pure logic, no UI)

export const GroupingStrategy = {
  /**
   * Group taxa based on a separator or first letter
   * @param {Array<string>} taxaNames - Array of taxa names
   * @param {string} separator - The separator character or "firstLetter"
   * @returns {Array<string>} Array of group names
   */
  groupTaxa(taxaNames, separator) {
    const groups = new Set();
    taxaNames.forEach((name) => {
      let group;
      if (separator === "firstLetter") {
        group = name.charAt(0).toUpperCase();
        if (group.trim() !== "") {
          groups.add(group);
        }
      } else {
        const parts = name.split(separator);
        if (parts.length > 1 && parts[0].trim() !== "") {
          group = parts[0].trim();
          groups.add(group);
        }
      }
    });
    return Array.from(groups);
  }
};
