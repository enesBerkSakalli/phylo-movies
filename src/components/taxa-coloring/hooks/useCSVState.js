import { useCallback, useState, useEffect } from 'react';
import { parseGroupCSV } from '../../../treeColoring/utils/CSVParser.js';
import { chooseInitialCSVColumn, loadCSVColumn } from '../utils/csvHelpers.js';

export function useCSVState(taxaNames, initialState = {}) {
  const safeState = initialState || {};

  const [csvData, setCsvData] = useState(safeState.csvData || null);
  const [csvFileName, setCsvFileName] = useState(safeState.csvFileName || null);
  const [csvGroups, setCsvGroups] = useState(
    Array.isArray(safeState.csvGroups) ? safeState.csvGroups : []
  );
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

  const loadTableText = useCallback(
    (text, fileName, preferredColumn = null) => {
      const parsed = parseGroupCSV(text);
      if (!parsed.success) {
        setCsvError(parsed.error);
        return false;
      }

      const initialColumn = chooseInitialCSVColumn(parsed.data, preferredColumn);
      const { map, groups, validation } = loadCSVColumn(parsed.data, initialColumn, taxaNames);

      if (!validation.isValid) {
        setCsvError('No matching taxa found in the metadata table.');
        return false;
      }

      setCsvError(null);
      setCsvData(parsed.data);
      setCsvFileName(fileName);
      setCsvColumn(initialColumn);
      setCsvTaxaMap(map);
      setCsvGroups(groups);
      setCsvValidation(validation);
      return true;
    },
    [taxaNames]
  );

  const onFile = useCallback(
    async (file) => {
      try {
        const text = await file.text();
        loadTableText(text, file.name);
      } catch (e) {
        setCsvError(`Failed to read metadata table: ${e.message}`);
      }
    },
    [loadTableText]
  );

  const onMetadataSource = useCallback(
    async (source) => {
      if (!source?.filePath) return;
      try {
        const response = await fetch(source.filePath);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const text = await response.text();
        loadTableText(
          text,
          source.fileName || source.label || 'metadata table',
          source.preferredColumn
        );
      } catch (e) {
        setCsvError(`Failed to load bundled metadata table: ${e.message}`);
      }
    },
    [loadTableText]
  );

  const onColumnChange = useCallback(
    (colName) => {
      if (!csvData) return;
      const { map, groups, validation } = loadCSVColumn(csvData, colName, taxaNames);
      setCsvError(null);
      setCsvColumn(colName);
      setCsvTaxaMap(map);
      setCsvGroups(groups);
      setCsvValidation(validation);
    },
    [csvData, taxaNames]
  );

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
    onMetadataSource,
    onColumnChange,
    resetCSV,
  };
}
