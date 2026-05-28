// CSVParser.js - CSV parsing utilities for taxa group import

/**
 * Parse CSV/TSV content into taxa-group mappings with support for multiple grouping columns
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
        error: 'CSV file is empty',
      };
    }

    // Split into lines and filter empty lines
    const lines = csvContent.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length < 2) {
      return {
        success: false,
        error: 'CSV must contain header and at least one data row',
      };
    }

    const delimiter = detectDelimiter(lines[0]);

    // Parse header
    const headerRaw = parseDelimitedLine(lines[0], delimiter);
    const header = headerRaw.map((h) => h.trim());
    const headerLower = header.map((h) => h.toLowerCase());

    // Find taxon column
    const taxonIndex = headerLower.findIndex(
      (h) =>
        h === 'taxon' ||
        h === 'taxa' ||
        h === 'name' ||
        h === 'species' ||
        h === 'id' ||
        h === 'accession' ||
        h === 'accession_version'
    );

    if (taxonIndex === -1) {
      return {
        success: false,
        error: 'CSV/TSV must have a taxon/taxa/name/species/id/accession column',
      };
    }

    // Find all potential grouping columns (all columns except taxon column)
    const groupingColumns = [];
    header.forEach((col, index) => {
      if (index !== taxonIndex && col.trim() !== '') {
        groupingColumns.push({
          index,
          name: col,
          displayName: col.charAt(0).toUpperCase() + col.slice(1),
        });
      }
    });

    if (groupingColumns.length === 0) {
      return {
        success: false,
        error: 'CSV must have at least one grouping column besides the taxon column',
      };
    }

    // Parse data rows and store all groupings
    const taxaData = new Map(); // Map: taxon -> {col1: value1, col2: value2, ...}
    const allGroupings = {}; // Object: {columnName: Map(taxon -> group)}
    const errors = [];

    // Initialize grouping maps for each column
    groupingColumns.forEach((col) => {
      allGroupings[col.name] = new Map();
    });

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle quoted values
      const values = parseDelimitedLine(line, delimiter);

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
      groupingColumns.forEach((col) => {
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
        error: 'No valid taxa data found in CSV',
      };
    }

    // Create groups array for each column
    const columnGroups = {};
    groupingColumns.forEach((col) => {
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
        members,
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
        warnings: errors.length > 0 ? errors : null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse CSV: ${error.message}`,
    };
  }
}

/**
 * Detect the table delimiter from the header row.
 * @param {string} headerLine - Header line
 * @returns {string} Delimiter
 */
function detectDelimiter(headerLine) {
  const tabCount = (headerLine.match(/\t/g) || []).length;
  const commaCount = (headerLine.match(/,/g) || []).length;
  return tabCount > commaCount ? '\t' : ',';
}

/**
 * Parse a single delimited line handling quoted values
 * @param {string} line - CSV line
 * @param {string} delimiter - Field delimiter
 * @returns {Array} Array of values
 */
function parseDelimitedLine(line, delimiter) {
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
    } else if (char === delimiter && !inQuotes) {
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
  // Create alias lookup map: normalized tree labels and accession prefixes map
  // to the canonical tree label. This lets Augur metadata keyed by accession
  // match tree taxa such as "PV588655_P17_GII-17".
  const availableLowerMap = new Map();
  const ambiguousAliases = new Set();
  const addAlias = (alias, canonicalName) => {
    const normalizedAlias = normalizeTaxonAlias(alias);
    if (!normalizedAlias) return;
    const previous = availableLowerMap.get(normalizedAlias);
    if (previous && previous !== canonicalName) {
      ambiguousAliases.add(normalizedAlias);
      availableLowerMap.delete(normalizedAlias);
      return;
    }
    if (!ambiguousAliases.has(normalizedAlias)) {
      availableLowerMap.set(normalizedAlias, canonicalName);
    }
  };

  availableTaxa.forEach((name) => {
    getTaxonAliases(name).forEach((alias) => addAlias(alias, name));
  });

  const matched = [];
  const unmatched = [];
  const canonicalMapping = new Map(); // CSV name -> Tree official name

  for (const [csvTaxon] of csvTaxaGroups) {
    const csvTaxonLower = normalizeTaxonAlias(csvTaxon);

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
    matchPercentage: Math.round((matched.length / csvTaxaGroups.size) * 100),
  };
}

function getTaxonAliases(name) {
  const aliases = new Set([name]);
  const pipePrefix = String(name).split('|')[0];
  aliases.add(pipePrefix);
  aliases.add(pipePrefix.split('_')[0]);
  aliases.add(pipePrefix.split('.')[0]);
  return Array.from(aliases);
}

function normalizeTaxonAlias(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/\.\d+$/, '').toLowerCase();
}
