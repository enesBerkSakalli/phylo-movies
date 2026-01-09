import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StrategySelector } from "./StrategySelector.jsx";
import { ColorSchemeSelector } from "../shared/ColorSchemeSelector.jsx";
import { EmptyStateAlert } from "../shared/EmptyStateAlert.jsx";
import { ColorInputGrid } from "../shared/ColorInputGrid.jsx";

export function GroupsTabContent({
  selectedStrategy,
  separators,
  segmentIndex,
  useRegex,
  regexPattern,
  groupingResult,
  groups,
  colorManager,
  applyScheme,
  handleColorChange,
  onStrategyChange
}) {
  return (
    <div className="space-y-4">
      <StrategySelector
        selectedStrategy={selectedStrategy}
        separators={separators}
        segmentIndex={segmentIndex}
        useRegex={useRegex}
        regexPattern={regexPattern}
        groupingResult={groupingResult}
        onChange={onStrategyChange}
      />
      <ColorSchemeSelector
        onApply={(id) => applyScheme(id, "groups")}
        description="Assign palettes to generated groups."
      />
      {groups.length === 0 ? (
        <EmptyStateAlert mode="groups" />
      ) : (
        <Card className="gap-0 py-0 border-border/30 shadow-none bg-accent/5">
          <CardHeader className="space-y-0.5 pb-2 pt-3 px-4">
            <CardTitle className="text-[13px] font-bold">Group Customization ({groups.length})</CardTitle>
            <CardDescription className="text-[10px]">Colors assigned to detected clades.</CardDescription>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <ColorInputGrid
              items={groups}
              isGroup={true}
              colorManager={colorManager}
              onColorChange={handleColorChange}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
