import React from "react";
import { CSVUpload } from '@/components/taxa-coloring/csv-tab/CSVUpload.jsx';
import { CSVColumnSelector } from '@/components/taxa-coloring/csv-tab/CSVColumnSelector.jsx';
import { CSVPreview } from '@/components/taxa-coloring/csv-tab/CSVPreview.jsx';
import { ColorSchemeSelector } from '@/components/taxa-coloring/shared/ColorSchemeSelector.jsx';
import { CSVGroupColors } from '@/components/taxa-coloring/csv-tab/CSVGroupColors.jsx';

export function CSVTabContent({
  csvData,
  csvFileName,
  csvColumn,
  csvValidation,
  csvGroups,
  colorManager,
  colorVersion,
  onFile,
  onColumnChange,
  resetCSV,
  applyScheme,
  handleColorChange
}) {
  return (
    <div className="space-y-4">
      <CSVUpload onFile={onFile} csvFileName={csvFileName} onReset={resetCSV} />
      {csvData && (
        <div className="space-y-3">
          <CSVColumnSelector
            csvData={csvData}
            csvColumn={csvColumn}
            onColumnChange={onColumnChange}
          />
          <CSVPreview csvValidation={csvValidation} csvGroups={csvGroups} />
          <ColorSchemeSelector
            onApply={(id) => applyScheme(id, "csv")}
            description="Apply palettes to CSV-defined groups."
          />
          <CSVGroupColors
            key={colorVersion}
            csvGroups={csvGroups}
            colorManager={colorManager}
            onColorChange={handleColorChange}
          />
        </div>
      )}
    </div>
  );
}
