import React from "react";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { ScrollArea } from "../ui/scroll-area";

import { TaxaTabContent } from "./taxa-tab/TaxaTabContent.jsx";
import { GroupsTabContent } from "./groups-tab/GroupsTabContent.jsx";
import { CSVTabContent } from "./csv-tab/CSVTabContent.jsx";
import { useTaxaColoringState } from "./hooks/useTaxaColoringState.js";
import { RefreshCcw, RotateCcw } from "lucide-react";

export function TaxaColoringWindow({ taxaNames = [], originalColorMap = {}, onApply, initialState = {} }) {
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
    csvFileName,
    csvGroups,
    csvColumn,
    csvValidation,
    csvError,
    colorManager,
    colorVersion,
    applyScheme,
    onFile,
    onColumnChange,
    resetCSV,
    resetAll,
    resetToDefault,
    buildResult,
    handleColorChange
  } = useTaxaColoringState(taxaNames, originalColorMap, initialState);

  const result = React.useMemo(() => buildResult(), [buildResult]);

  React.useEffect(() => {
    onApply?.(result);
  }, [result, onApply]);

  return (
    <Tabs value={mode} onValueChange={setMode} className="flex h-full min-h-0 flex-col gap-0">
      <div className="flex shrink-0 flex-col gap-3 border-b border-border/40 p-3 sm:p-4 md:flex-row md:items-center md:justify-between">
        <TabsList className="grid h-9 w-full grid-cols-3 md:w-auto" aria-label="Taxa coloring mode">
          <TabsTrigger value="taxa" className="text-xs font-medium">Taxa</TabsTrigger>
          <TabsTrigger value="groups" className="text-xs font-medium">Pattern</TabsTrigger>
          <TabsTrigger value="csv" className="text-xs font-medium">CSV</TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-2 md:justify-end" role="group" aria-label="Taxa coloring reset actions">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-2 px-3 text-xs" onClick={resetToDefault}>
                <RotateCcw className="size-3.5" aria-hidden />
                Default Colors
              </Button>
            </TooltipTrigger>
            <TooltipContent>Set current assignments to the default color</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-2 px-3 text-xs" onClick={resetAll}>
                <RefreshCcw className="size-3.5" aria-hidden />
                Reset Setup
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset mode, grouping settings, CSV import, and colors</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <TaxaColoringTabPanel value="taxa">
        <TaxaTabContent
          taxaNames={taxaNames}
          colorManager={colorManager}
          colorVersion={colorVersion}
          applyScheme={applyScheme}
          handleColorChange={handleColorChange}
        />
      </TaxaColoringTabPanel>

      <TaxaColoringTabPanel value="groups">
        <GroupsTabContent
          selectedStrategy={selectedStrategy}
          separators={separators}
          segmentIndex={segmentIndex}
          useRegex={useRegex}
          regexPattern={regexPattern}
          groupingResult={groupingResult}
          groups={groups}
          colorManager={colorManager}
          colorVersion={colorVersion}
          applyScheme={applyScheme}
          handleColorChange={handleColorChange}
          onStrategyChange={handleStrategyChange}
        />
      </TaxaColoringTabPanel>

      <TaxaColoringTabPanel value="csv">
        <CSVTabContent
          csvData={csvData}
          csvFileName={csvFileName}
          csvColumn={csvColumn}
          csvValidation={csvValidation}
          csvError={csvError}
          csvGroups={csvGroups}
          colorManager={colorManager}
          colorVersion={colorVersion}
          onFile={onFile}
          onColumnChange={onColumnChange}
          resetCSV={resetCSV}
          applyScheme={applyScheme}
          handleColorChange={handleColorChange}
        />
      </TaxaColoringTabPanel>
    </Tabs>
  );
}

function TaxaColoringTabPanel({ value, children }) {
  return (
    <TabsContent value={value} className="m-0 min-h-0 flex-1">
      <ScrollArea className="h-full">
        <div className="px-3 py-3 pr-5 sm:px-4 sm:py-4 sm:pr-6">
          {children}
        </div>
      </ScrollArea>
    </TabsContent>
  );
}

export default TaxaColoringWindow;
