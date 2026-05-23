import React from "react";
import { CSVUpload } from "./CSVUpload.jsx";
import { CSVColumnSelector } from "./CSVColumnSelector.jsx";
import { CSVPreview } from "./CSVPreview.jsx";
import { ColorSchemeSelector } from "../shared/ColorSchemeSelector.jsx";
import { CSVGroupColors } from "./CSVGroupColors.jsx";

export function CSVTabContent({
  csvData,
  csvFileName,
  csvColumn,
  csvValidation,
  csvError,
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
    <div className="flex flex-col gap-4">
      <CSVUpload
        onFile={onFile}
        csvFileName={csvFileName}
        onReset={resetCSV}
        errorMessage={csvError}
      />
      {csvData && (
        <div className="flex flex-col gap-3">
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
