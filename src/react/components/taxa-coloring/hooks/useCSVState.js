import { useCallback, useState, useEffect } from "react";
import { parseGroupCSV } from "@/js/treeColoring/utils/CSVParser.js";
import { loadCSVColumn } from "../utils/csvHelpers.js";

export function useCSVState(taxaNames, initialState = {}) {
  const [csvData, setCsvData] = useState(initialState.csvData || null);
  const [csvFileName, setCsvFileName] = useState(initialState.csvFileName || null);
  const [csvGroups, setCsvGroups] = useState(initialState.csvGroups || []);
  const [csvTaxaMap, setCsvTaxaMap] = useState(() => {
    // Convert object back to Map if restored from persistence
    const saved = initialState.csvTaxaMap;
    if (saved instanceof Map) return saved;
    if (saved && typeof saved === 'object') return new Map(Object.entries(saved));
    return null;
  });
  const [csvColumn, setCsvColumn] = useState(initialState.csvColumn || null);
  const [csvValidation, setCsvValidation] = useState(null);

  // Recalculate validation when restoring from initial state
  useEffect(() => {
    if (initialState.csvData && initialState.csvColumn && taxaNames.length > 0) {
      const { validation } = loadCSVColumn(initialState.csvData, initialState.csvColumn, taxaNames);
      setCsvValidation(validation);
    }
  }, []); // Run once on mount


  const onFile = useCallback(async (file) => {
    try {
      const text = await file.text();
      const parsed = parseGroupCSV(text);
      if (!parsed.success) {
        alert(parsed.error);
        return;
      }

      const firstCol = parsed.data.groupingColumns[0].name;
      const { map, groups, validation } = loadCSVColumn(parsed.data, firstCol, taxaNames);

      if (!validation.isValid) {
        alert("No matching taxa found in CSV file");
        return;
      }

      setCsvData(parsed.data);
      setCsvFileName(file.name);
      setCsvColumn(firstCol);
      setCsvTaxaMap(map);
      setCsvGroups(groups);
      setCsvValidation(validation);
    } catch (e) {
      alert(`Failed to read CSV file: ${e.message}`);
    }
  }, [taxaNames]);

  const onColumnChange = useCallback((colName) => {
    if (!csvData) return;
    const { map, groups, validation } = loadCSVColumn(csvData, colName, taxaNames);
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
  }, []);

  return {
    csvData,
    csvFileName,
    csvGroups,
    csvTaxaMap,
    csvColumn,
    csvValidation,
    onFile,
    onColumnChange,
    resetCSV
  };
}
