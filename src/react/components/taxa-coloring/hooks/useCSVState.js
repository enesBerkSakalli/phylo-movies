import { useCallback, useState } from "react";
import { parseGroupCSV } from "@/js/treeColoring/utils/CSVParser.js";
import { loadCSVColumn } from "../utils/csvHelpers.js";

export function useCSVState(taxaNames) {
  const [csvData, setCsvData] = useState(null);
  const [csvGroups, setCsvGroups] = useState([]);
  const [csvTaxaMap, setCsvTaxaMap] = useState(null);
  const [csvColumn, setCsvColumn] = useState(null);
  const [csvValidation, setCsvValidation] = useState(null);

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
    setCsvGroups([]);
    setCsvTaxaMap(null);
    setCsvColumn(null);
    setCsvValidation(null);
  }, []);

  return {
    csvData,
    csvGroups,
    csvTaxaMap,
    csvColumn,
    csvValidation,
    onFile,
    onColumnChange,
    resetCSV
  };
}
