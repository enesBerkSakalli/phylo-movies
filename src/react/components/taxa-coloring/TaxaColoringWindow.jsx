import React from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { TaxaTabContent } from "./taxa-tab/TaxaTabContent.jsx";
import { GroupsTabContent } from "./groups-tab/GroupsTabContent.jsx";
import { CSVTabContent } from "./csv-tab/CSVTabContent.jsx";
import { useTaxaColoringState } from "./hooks/useTaxaColoringState.js";

export function TaxaColoringWindow({ taxaNames = [], originalColorMap = {}, onApply, onClose }) {
  const {
    mode,
    setMode,
    selectedStrategy,
    separators,
    segmentIndex,
    useRegex,
    regexPattern,
    groupingResult,
    handleStrategyChange,
    groups,
    csvData,
    csvGroups,
    csvColumn,
    csvValidation,
    colorManager,
    applyScheme,
    onFile,
    onColumnChange,
    resetAll,
    resetColorsToBlack,
    buildResult,
    handleColorChange
  } = useTaxaColoringState(taxaNames, originalColorMap);

  const applyAndClose = () => {
    onApply?.(buildResult());
    onClose?.();
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <header className="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-base font-semibold">Taxa Color Assignment</h1>
          <p className="text-sm text-muted-foreground">Fine-tune palette presets, grouping strategies, or CSV imports.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={resetColorsToBlack}>Reset Colors to Black</Button>
          <Button variant="outline" size="sm" onClick={resetAll}>Reset All</Button>
          <Button size="sm" onClick={applyAndClose}>Apply</Button>
        </div>
      </header>
      <main className="flex-1 space-y-4 overflow-auto">
        <Tabs value={mode} onValueChange={setMode} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 md:w-auto">
            <TabsTrigger value="taxa">Taxa</TabsTrigger>
            <TabsTrigger value="groups">Group by Pattern</TabsTrigger>
            <TabsTrigger value="csv">Import CSV</TabsTrigger>
          </TabsList>

          <TabsContent value="taxa">
            <TaxaTabContent
              taxaNames={taxaNames}
              colorManager={colorManager}
              applyScheme={applyScheme}
              handleColorChange={handleColorChange}
            />
          </TabsContent>

          <TabsContent value="groups">
            <GroupsTabContent
              selectedStrategy={selectedStrategy}
              separators={separators}
              segmentIndex={segmentIndex}
              useRegex={useRegex}
              regexPattern={regexPattern}
              groupingResult={groupingResult}
              groups={groups}
              colorManager={colorManager}
              applyScheme={applyScheme}
              handleColorChange={handleColorChange}
              onStrategyChange={handleStrategyChange}
            />
          </TabsContent>

          <TabsContent value="csv">
            <CSVTabContent
              csvData={csvData}
              csvColumn={csvColumn}
              csvValidation={csvValidation}
              csvGroups={csvGroups}
              colorManager={colorManager}
              onFile={onFile}
              onColumnChange={onColumnChange}
              applyScheme={applyScheme}
              handleColorChange={handleColorChange}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default TaxaColoringWindow;
