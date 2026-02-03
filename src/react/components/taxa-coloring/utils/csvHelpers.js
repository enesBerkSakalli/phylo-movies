import { validateCSVTaxa } from "@/js/treeColoring/utils/CSVParser.js";

// Load and validate CSV column data
export function loadCSVColumn(csvData, colName, taxaNames) {
  // Ensure we have valid csvData with allGroupings
  if (!csvData || !csvData.allGroupings) {
    return {
      map: new Map(),
      groups: [],
      validation: { isValid: false, matched: [], unmatched: [], matchPercentage: 0 }
    };
  }

  // Ensure map is a valid Map instance (contains CSV_NAME -> GROUP_VALUE)
  let rawMap = csvData.allGroupings[colName];
  if (!(rawMap instanceof Map)) {
    rawMap = new Map();
  }

  const groups = csvData.columnGroups?.[colName] || [];
  const validation = validateCSVTaxa(rawMap, taxaNames);

  // Transform raw map (CSV names) into canonical map (Tree names)
  const canonicalMap = new Map();
  if (validation.canonicalMapping) {
    for (const [csvName, treeName] of validation.canonicalMapping.entries()) {
      if (rawMap.has(csvName)) {
        canonicalMap.set(treeName, rawMap.get(csvName));
      }
    }
  }

  return { 
    map: canonicalMap, 
    groups, 
    validation 
  };
}
