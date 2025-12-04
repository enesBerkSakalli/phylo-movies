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
        <Card>
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-sm font-medium">Group Colors ({groups.length})</CardTitle>
            <CardDescription>Fine-tune colors for each detected grouping.</CardDescription>
          </CardHeader>
          <CardContent>
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
