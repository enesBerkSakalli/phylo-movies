import { validateCSVTaxa } from '../../../treeColoring/utils/CSVParser.js';

// Load and validate CSV column data
export function loadCSVColumn(csvData, colName, taxaNames) {
  // Ensure we have valid csvData with allGroupings
  if (!csvData || !csvData.allGroupings) {
    return {
      map: new Map(),
      groups: [],
      validation: { isValid: false, matched: [], unmatched: [], matchPercentage: 0 },
    };
  }

  // Ensure map is a valid Map instance (contains CSV_NAME -> GROUP_VALUE)
  let rawMap = csvData.allGroupings[colName];
  if (!(rawMap instanceof Map)) {
    rawMap = rawMap && typeof rawMap === 'object' ? new Map(Object.entries(rawMap)) : new Map();
  }

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
  const groupMembers = new Map();
  for (const [treeName, groupName] of canonicalMap.entries()) {
    if (!groupMembers.has(groupName)) {
      groupMembers.set(groupName, []);
    }
    groupMembers.get(groupName).push(treeName);
  }
  const groups = Array.from(groupMembers.entries()).map(([name, members]) => ({
    name,
    count: members.length,
    members,
  }));

  return {
    map: canonicalMap,
    groups,
    validation,
  };
}

export function chooseInitialCSVColumn(csvData, preferredColumn = null) {
  const columns = csvData?.groupingColumns ?? [];
  if (preferredColumn && columns.some((column) => column.name === preferredColumn)) {
    return preferredColumn;
  }
  return columns[0]?.name ?? null;
}
