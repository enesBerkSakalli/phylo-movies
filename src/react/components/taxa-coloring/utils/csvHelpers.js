import { validateCSVTaxa } from "@/js/treeColoring/utils/CSVParser.js";

// Load and validate CSV column data
export function loadCSVColumn(csvData, colName, taxaNames) {
  const map = csvData.allGroupings[colName] || new Map();
  const groups = csvData.columnGroups[colName] || [];
  const validation = validateCSVTaxa(map, taxaNames);
  return { map, groups, validation };
}
