// CSVParser.js - CSV parsing utilities for taxa group import

/**
 * Parse CSV content into taxa-group mappings with support for multiple grouping columns
 * Expected format:
 * taxon,group1,group2,group3
 * Species_001,GroupA,TypeX,Family1
 * Species_002,GroupB,TypeY,Family1
 *
 * @param {string} csvContent - Raw CSV string
 * @returns {Object} Result object with success status and data/error
 */
export function parseGroupCSV(csvContent) {
  try {
    if (!csvContent || csvContent.trim() === '') {
      return {
        success: false,
        error: 'CSV file is empty'
      };
    }

    // Split into lines and filter empty lines
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim());

    if (lines.length < 2) {
      return {
        success: false,
        error: 'CSV must contain header and at least one data row'
      };
    }

    // Parse header
    const headerRaw = parseCSVLine(lines[0]);
    const header = headerRaw.map(h => h.trim());
    const headerLower = header.map(h => h.toLowerCase());

    // Find taxon column
    const taxonIndex = headerLower.findIndex(h =>
      h === 'taxon' || h === 'taxa' || h === 'name' || h === 'species' || h === 'id'
    );

    if (taxonIndex === -1) {
      return {
        success: false,
        error: 'CSV must have a taxon/taxa/name/species/id column'
      };
    }

    // Find all potential grouping columns (all columns except taxon column)
    const groupingColumns = [];
    header.forEach((col, index) => {
      if (index !== taxonIndex && col.trim() !== '') {
        groupingColumns.push({
          index,
          name: col,
          displayName: col.charAt(0).toUpperCase() + col.slice(1)
        });
      }
    });

    if (groupingColumns.length === 0) {
      return {
        success: false,
        error: 'CSV must have at least one grouping column besides the taxon column'
      };
    }

    // Parse data rows and store all groupings
    const taxaData = new Map(); // Map: taxon -> {col1: value1, col2: value2, ...}
    const allGroupings = {}; // Object: {columnName: Map(taxon -> group)}
    const errors = [];

    // Initialize grouping maps for each column
    groupingColumns.forEach(col => {
      allGroupings[col.name] = new Map();
    });

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle quoted values
      const values = parseCSVLine(line);

      if (values.length <= taxonIndex) {
        errors.push(`Line ${i + 1}: Missing taxon value`);
        continue;
      }

      const taxon = values[taxonIndex]?.trim();
      if (!taxon) {
        errors.push(`Line ${i + 1}: Empty taxon value`);
        continue;
      }

      // Store all column values for this taxon
      const taxonGroups = {};
      groupingColumns.forEach(col => {
        if (values.length > col.index) {
          const groupValue = values[col.index]?.trim() || 'Unassigned';
          taxonGroups[col.name] = groupValue;
          allGroupings[col.name].set(taxon, groupValue);
        }
      });

      taxaData.set(taxon, taxonGroups);
    }

    if (taxaData.size === 0) {
      return {
        success: false,
        error: 'No valid taxa data found in CSV'
      };
    }

    // Create groups array for each column
    const columnGroups = {};
    groupingColumns.forEach(col => {
      const groupMap = new Map();
      for (const [taxon, group] of allGroupings[col.name]) {
        if (!groupMap.has(group)) {
          groupMap.set(group, []);
        }
        groupMap.get(group).push(taxon);
      }

      columnGroups[col.name] = Array.from(groupMap.entries()).map(([name, members]) => ({
        name,
        count: members.length,
        members
      }));
    });

    return {
      success: true,
      data: {
        taxaData, // Map: taxon -> {col1: val1, col2: val2, ...}
        groupingColumns, // Array of available grouping columns
        allGroupings, // Object with Maps for each column
        columnGroups, // Object with groups array for each column
        totalTaxa: taxaData.size,
        warnings: errors.length > 0 ? errors : null
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse CSV: ${error.message}`
    };
  }
}

/**
 * Parse a single CSV line handling quoted values
 * @param {string} line - CSV line
 * @returns {Array} Array of values
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  values.push(current);

  return values;
}

/**
 * Validate if taxa in CSV match available taxa names (case-insensitive)
 * @param {Map} csvTaxaGroups - Map of taxon to group from CSV
 * @param {Array} availableTaxa - Array of available taxa names
 * @returns {Object} Validation result with canonical mapping
 */
export function validateCSVTaxa(csvTaxaGroups, availableTaxa) {
  // Create lowercase lookup map: lowercase -> original_canonical_name
  const availableLowerMap = new Map();
  availableTaxa.forEach(name => {
    const lower = name.toLowerCase();
    // Only store first occurrence if there are duplicates (unlikely in tree)
    if (!availableLowerMap.has(lower)) {
      availableLowerMap.set(lower, name);
    }
  });

  const matched = [];
  const unmatched = [];
  const canonicalMapping = new Map(); // CSV name -> Tree official name

  for (const [csvTaxon] of csvTaxaGroups) {
    const csvTaxonLower = csvTaxon.toLowerCase();
    
    if (availableLowerMap.has(csvTaxonLower)) {
      const treeOfficialName = availableLowerMap.get(csvTaxonLower);
      matched.push(treeOfficialName);
      canonicalMapping.set(csvTaxon, treeOfficialName);
    } else {
      unmatched.push(csvTaxon);
    }
  }

  return {
    isValid: matched.length > 0,
    matched,
    unmatched,
    canonicalMapping,
    matchPercentage: Math.round((matched.length / csvTaxaGroups.size) * 100)
  };
}

