import { parseGroupCSV, validateCSVTaxa } from '../utils/CSVParser.js';

/**
 * Handles the processing of an uploaded CSV file.
 * @param {File} file - The CSV file to process.
 * @param {object} context - The TaxaColoring instance (`this`).
 */
export async function handleCSVFile(file, context) {
  try {
    const text = await file.text();
    const parseResult = parseGroupCSV(text);

    if (!parseResult.success) {
      alert(`Failed to parse CSV: ${parseResult.error}`);
      return;
    }

    // Store full CSV data
    context.csvData = parseResult.data;

    // Select first column by default
    const firstColumnName = parseResult.data.groupingColumns[0].name;
    context.selectedCSVColumn = firstColumnName;

    // Validate against available taxa using first column
    const firstColumnMap = parseResult.data.allGroupings[firstColumnName];
    const validation = validateCSVTaxa(firstColumnMap, context.taxaNames);

    if (!validation.isValid) {
      alert('No matching taxa found in CSV file');
      return;
    }

    // Set up initial groups from first column
    updateCSVGroups(firstColumnName, context);
    context.csvValidation = validation;

    // Show warnings if any
    if (parseResult.data.warnings) {
      console.warn('CSV parsing warnings:', parseResult.data.warnings);
    }

    // Re-render to show preview
    context.updateContent();
  } catch (error) {
    alert(`Failed to read CSV file: ${error.message}`);
  }
}

/**
 * Updates the active groups based on the selected CSV column.
 * @param {string} columnName - The name of the column to use for grouping.
 * @param {object} context - The TaxaColoring instance (`this`).
 */
export function updateCSVGroups(columnName, context) {
  if (!context.csvData) return;

  // Update selected column
  context.selectedCSVColumn = columnName;

  // Get groups for selected column
  context.csvGroups = context.csvData.columnGroups[columnName] || [];
  context.csvTaxaMap = context.csvData.allGroupings[columnName] || new Map();

  // Revalidate with current taxa
  context.csvValidation = validateCSVTaxa(context.csvTaxaMap, context.taxaNames);
}
