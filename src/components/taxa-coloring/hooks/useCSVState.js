import { useCallback, useState, useEffect } from "react";
import { parseGroupCSV } from "../../../treeColoring/utils/CSVParser.js";
import { loadCSVColumn } from "../utils/csvHelpers.js";

export function useCSVState(taxaNames, initialState = {}) {
  const safeState = initialState || {};

  const [csvData, setCsvData] = useState(safeState.csvData || null);
  const [csvFileName, setCsvFileName] = useState(safeState.csvFileName || null);
  const [csvGroups, setCsvGroups] = useState(Array.isArray(safeState.csvGroups) ? safeState.csvGroups : []);
  const [csvTaxaMap, setCsvTaxaMap] = useState(() => {
    const saved = safeState.csvTaxaMap;
    if (saved instanceof Map) return saved;
    if (saved && typeof saved === 'object') return new Map(Object.entries(saved));
    return null;
  });
  const [csvColumn, setCsvColumn] = useState(safeState.csvColumn || null);
  const [csvValidation, setCsvValidation] = useState(null);
  const [csvError, setCsvError] = useState(null);

  useEffect(() => {
    if (safeState.csvData && safeState.csvColumn && taxaNames.length > 0) {
      const { validation } = loadCSVColumn(safeState.csvData, safeState.csvColumn, taxaNames);
      setCsvValidation(validation);
    }
  }, []);

  const onFile = useCallback(async (file) => {
    try {
      const text = await file.text();
      const parsed = parseGroupCSV(text);
      if (!parsed.success) {
        setCsvError(parsed.error);
        return;
      }

      const firstCol = parsed.data.groupingColumns[0].name;
      const { map, groups, validation } = loadCSVColumn(parsed.data, firstCol, taxaNames);

      if (!validation.isValid) {
        setCsvError("No matching taxa found in the CSV file.");
        return;
      }

      setCsvError(null);
      setCsvData(parsed.data);
      setCsvFileName(file.name);
      setCsvColumn(firstCol);
      setCsvTaxaMap(map);
      setCsvGroups(groups);
      setCsvValidation(validation);
    } catch (e) {
      setCsvError(`Failed to read CSV file: ${e.message}`);
    }
  }, [taxaNames]);

  const onColumnChange = useCallback((colName) => {
    if (!csvData) return;
    const { map, groups, validation } = loadCSVColumn(csvData, colName, taxaNames);
    setCsvError(null);
    setCsvColumn(colName);
    setCsvTaxaMap(map);
    setCsvGroups(groups);
    setCsvValidation(validation);
  }, [csvData, taxaNames]);

  const resetCSV = useCallback(() => {
    setCsvData(null);
    setCsvFileName(null);
    setCsvGroups([]);
    setCsvTaxaMap(null);
    setCsvColumn(null);
    setCsvValidation(null);
    setCsvError(null);
  }, []);

  return {
    csvData,
    csvFileName,
    csvGroups,
    csvTaxaMap,
    csvColumn,
    csvValidation,
    csvError,
    onFile,
    onColumnChange,
    resetCSV
  };
}
