import React from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

import { TaxaTabContent } from "./taxa-tab/TaxaTabContent.jsx";
import { GroupsTabContent } from "./groups-tab/GroupsTabContent.jsx";
import { CSVTabContent } from "./csv-tab/CSVTabContent.jsx";
import { useTaxaColoringState } from "./hooks/useTaxaColoringState.js";
import { RefreshCcw, RotateCcw, Check } from "lucide-react";

export function TaxaColoringWindow({ taxaNames = [], originalColorMap = {}, onApply, onClose, initialState = {} }) {
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
    colorVersion, // For triggering re-renders when colors change
    applyScheme,
    onFile,
    onColumnChange,
    resetAll,
    resetToDefault,
    buildResult,
    handleColorChange
  } = useTaxaColoringState(taxaNames, originalColorMap, initialState);

  // Stabilize the result identity to prevent infinite effect loops
  const result = React.useMemo(() => buildResult(), [buildResult]);

  // Live updates: call onApply whenever the state result changes
  React.useEffect(() => {
    onApply?.(result);
  }, [result, onApply]);

  const applyAndClose = React.useCallback(() => {
    // onApply is already called via effect, so we just close
    onClose?.();
  }, [onClose]);

  return (
    <div className="flex h-full flex-col gap-2 p-3 sm:p-4">
      <header className="flex flex-col gap-3 pb-3 md:flex-row md:items-center md:justify-between shrink-0 border-b border-border/40">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold tracking-tight">Taxa Color Assignment</h2>
          <p className="text-2xs text-muted-foreground/80">Fine-tune palette presets, grouping strategies, or CSV imports.</p>
        </div>
        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border border-border/40 shadow-sm">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] px-3 font-medium hover:bg-background/80 group/btn transition-all" onClick={resetToDefault}>
                  <RotateCcw className="size-3 mr-2 text-muted-foreground group-hover/btn:text-foreground transition-colors" />
                  Clear All
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear all assignments and reset to default color</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-4 mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] px-3 font-medium hover:bg-background/80 group/btn transition-all" onClick={resetAll}>
                  <RefreshCcw className="size-3 mr-2 text-muted-foreground group-hover/btn:text-foreground transition-colors" />
                  Factory Reset
                </Button>
              </TooltipTrigger>
              <TooltipContent>Restore initial state & clear all grouping metadata</TooltipContent>
            </Tooltip>
          </div>

          <Button size="sm" className="h-8 px-6 text-xs font-bold shadow-lg hover:scale-[1.03] active:scale-95 transition-all gap-2 bg-primary hover:bg-primary/90" onClick={applyAndClose}>
            <Check className="size-3.5" />
            Done
          </Button>
        </div>
      </header>
      <main className="flex-1 space-y-3 overflow-auto pr-1">
        <Tabs value={mode} onValueChange={setMode} className="space-y-4">
          <TabsList className="h-8 p-1 bg-muted/70 w-fit mx-auto md:mx-0">
            <TabsTrigger value="taxa" className="h-7 text-xs font-medium px-4">Taxa</TabsTrigger>
            <TabsTrigger value="groups" className="h-7 text-xs font-medium px-4">Group by Pattern</TabsTrigger>
            <TabsTrigger value="csv" className="h-7 text-xs font-medium px-4">Import CSV</TabsTrigger>
          </TabsList>

          <TabsContent value="taxa">
            <TaxaTabContent
              taxaNames={taxaNames}
              colorManager={colorManager}
              colorVersion={colorVersion}
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
              colorVersion={colorVersion}
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
              colorVersion={colorVersion}
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
