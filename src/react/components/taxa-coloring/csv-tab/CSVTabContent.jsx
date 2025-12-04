import React from "react";
import { CSVUpload } from "./CSVUpload.jsx";
import { CSVColumnSelector } from "./CSVColumnSelector.jsx";
import { CSVPreview } from "./CSVPreview.jsx";
import { ColorSchemeSelector } from "../shared/ColorSchemeSelector.jsx";
import { CSVGroupColors } from "./CSVGroupColors.jsx";

export function CSVTabContent({
  csvData,
  csvColumn,
  csvValidation,
  csvGroups,
  colorManager,
  onFile,
  onColumnChange,
  applyScheme,
  handleColorChange
}) {
  return (
    <div className="space-y-4">
      <CSVUpload onFile={onFile} />
      {csvData && (
        <div className="space-y-4">
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
            csvGroups={csvGroups}
            colorManager={colorManager}
            onColorChange={handleColorChange}
          />
        </div>
      )}
    </div>
  );
}
