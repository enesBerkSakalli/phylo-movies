import React from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
    applyScheme,
    onFile,
    onColumnChange,
    resetAll,
    resetColorsToBlack,
    buildResult,
    handleColorChange
  } = useTaxaColoringState(taxaNames, originalColorMap, initialState);

  // Stabilize the result identity to prevent infinite effect loops
  const result = React.useMemo(() => buildResult(), [buildResult]);

  // Live updates: call onApply whenever the state result changes
  React.useEffect(() => {
    onApply?.(result);
  }, [result, onApply]);

  const applyAndClose = () => {
    // onApply is already called via effect, so we just close
    onClose?.();
  };

  return (
    <div className="flex h-full flex-col gap-2 p-5 sm:p-6">
      <header className="flex flex-col gap-4 border-b border-border/40 pb-4 md:flex-row md:items-center md:justify-between shrink-0">
        <div className="space-y-1">
          <h1 className="text-base font-bold tracking-tight">Taxa Color Assignment</h1>
          <p className="text-[11px] text-muted-foreground/80">Fine-tune palette presets, grouping strategies, or CSV imports.</p>
        </div>
        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="flex items-center gap-1.5 bg-accent/30 p-1.5 rounded-lg border border-border/40 shadow-sm">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] px-3 font-medium hover:bg-background/90 group/btn transition-all" onClick={resetColorsToBlack}>
                  <RotateCcw className="size-3 mr-2 text-muted-foreground group-hover/btn:text-foreground transition-colors" />
                  Black Only
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset colors to solid black</TooltipContent>
            </Tooltip>

            <div className="w-px h-3.5 bg-border/50 mx-0.5" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] px-3 font-medium hover:bg-background/90 group/btn transition-all" onClick={resetAll}>
                  <RefreshCcw className="size-3 mr-2 text-muted-foreground group-hover/btn:text-foreground transition-colors" />
                  Reset All
                </Button>
              </TooltipTrigger>
              <TooltipContent>Restore original colors & clear groups</TooltipContent>
            </Tooltip>
          </div>

          <Button size="sm" className="h-8.5 px-6 text-xs font-bold shadow-lg hover:scale-[1.03] active:scale-95 transition-all gap-2 bg-primary hover:bg-primary/90" onClick={applyAndClose}>
            <Check className="size-3.5" />
            Done
          </Button>
        </div>
      </header>
      <main className="flex-1 space-y-3 overflow-auto pr-1">
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
