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

  // Ensure map is a valid Map instance
  let map = csvData.allGroupings[colName];
  if (!(map instanceof Map)) {
    map = new Map();
  }

  const groups = csvData.columnGroups?.[colName] || [];
  const validation = validateCSVTaxa(map, taxaNames);
  return { map, groups, validation };
}
