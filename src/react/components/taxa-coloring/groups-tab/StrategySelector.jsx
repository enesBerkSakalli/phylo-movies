import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
// Card imports removed
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SeparatorInput } from "./SeparatorInput.jsx";
import { AdvancedPatternOptions } from "./AdvancedPatternOptions.jsx";
export function StrategySelector({
  selectedStrategy,
  separators = [],
  segmentIndex = 0,
  useRegex = false,
  regexPattern = "",
  groupingResult = null,
  onChange
}) {

  const strategies = [
    { value: "prefix", label: "Prefix" },
    { value: "suffix", label: "Suffix" },
    { value: "middle", label: "Middle" },
    { value: "segment", label: "Select Segment" },
    { value: "first-letter", label: "First Letter" },
  ];

  const handleStrategyChange = (strategy) => {
    onChange({ strategy, separators, segmentIndex, useRegex, regexPattern });
  };

  const handleSeparatorsChange = (newSeparators) => {
    onChange({ strategy: selectedStrategy, separators: newSeparators, segmentIndex, useRegex, regexPattern });
  };

  const handleSegmentIndexChange = (newIndex) => {
    onChange({ strategy: selectedStrategy, separators, segmentIndex: newIndex, useRegex, regexPattern });
  };

  const handleUseRegexChange = (newUseRegex) => {
    onChange({ strategy: selectedStrategy, separators, segmentIndex, useRegex: newUseRegex, regexPattern });
  };

  const handleRegexPatternChange = (newPattern) => {
    onChange({ strategy: selectedStrategy, separators, segmentIndex, useRegex, regexPattern: newPattern });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border/30 bg-accent/5 p-3">
        <div className="flex flex-col gap-3">
          {/* Header Row: Title & Strategy Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-[120px]">
               <h3 className="text-sm font-medium leading-none">Grouping Pattern</h3>
               <p className="text-2xs text-muted-foreground">How taxa are parsed.</p>
            </div>
            <div className="flex flex-wrap gap-1.5 bg-background/50 p-1 rounded-md border border-border/20">
              {strategies.map(s => (
                <Button
                  key={s.value}
                  size="sm"
                  variant={selectedStrategy === s.value ? "secondary" : "ghost"}
                  onClick={() => handleStrategyChange(s.value)}
                  className={`h-7 px-2.5 text-xs font-medium ${selectedStrategy === s.value ? "shadow-sm bg-background hover:bg-background border border-border/20" : "hover:bg-muted"}`}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator className="bg-border/30" />

          {/* Controls Row: Separators/Segment Index */}
          <div className="grid gap-4">
             {selectedStrategy !== "first-letter" && selectedStrategy !== "segment" && !useRegex && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium shrink-0 text-muted-foreground w-20">Separators:</span>
                  <div className="flex-1">
                    <SeparatorInput
                      separators={separators}
                      onChange={handleSeparatorsChange}
                      detectedSeparators={groupingResult?.detectedSeparators || []}
                    />
                  </div>
                </div>
             )}

             {selectedStrategy === "segment" && !useRegex && (
               <div className="space-y-2">
                 <div className="flex items-start gap-4">
                   <div className="flex items-center gap-3 flex-1">
                      <span className="text-xs font-medium shrink-0 text-muted-foreground w-20">Segment:</span>
                      <Select
                        value={String(segmentIndex ?? 0)}
                        onValueChange={(val) => handleSegmentIndexChange(Number(val))}
                      >
                        <SelectTrigger id="segment-index-main" className="h-8 text-xs w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">First (0)</SelectItem>
                          <SelectItem value="1">Second (1)</SelectItem>
                          <SelectItem value="-1">Last (-1)</SelectItem>
                          <SelectItem value="2">Third (2)</SelectItem>
                          <SelectItem value="-2">2nd Last (-2)</SelectItem>
                        </SelectContent>
                      </Select>
                   </div>
                   <div className="flex-1">
                      <SeparatorInput
                        separators={separators}
                        onChange={handleSeparatorsChange}
                        detectedSeparators={groupingResult?.detectedSeparators || []}
                      />
                   </div>
                 </div>
                 <p className="text-2xs text-muted-foreground pl-[92px]">
                   Split by separators, then pick the segment at the chosen index.
                 </p>
               </div>
             )}

             <AdvancedPatternOptions
                strategy={selectedStrategy}
                segmentIndex={segmentIndex}
                useRegex={useRegex}
                regexPattern={regexPattern}
                onSegmentIndexChange={handleSegmentIndexChange}
                onUseRegexChange={handleUseRegexChange}
                onRegexPatternChange={handleRegexPatternChange}
                hideSegmentPicker={true}
             />
          </div>
        </div>
      </div>


    </div>
  );
}
