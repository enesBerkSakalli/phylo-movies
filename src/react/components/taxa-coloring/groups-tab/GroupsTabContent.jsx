import React from "react";
// Card imports removed
import { StrategySelector } from "./StrategySelector.jsx";
import { ColorSchemeSelector } from "../shared/ColorSchemeSelector.jsx";
import { GroupingStatusSummary } from "./GroupingStatusSummary.jsx";
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
  colorVersion,
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
        <div className="rounded-md border border-border/30 bg-accent/5 px-3 py-3">
          <div className="mb-3 space-y-1 px-1">
            <h3 className="text-[13px] font-bold leading-none">Group Customization ({groups.length})</h3>
            <p className="text-2xs text-muted-foreground">Colors assigned to detected subtrees.</p>
          </div>
          <ColorInputGrid
            key={colorVersion}
            items={groups}
            isGroup={true}
            colorManager={colorManager}
            onColorChange={handleColorChange}
          />
        </div>
      )}
    </div>
  );
}
