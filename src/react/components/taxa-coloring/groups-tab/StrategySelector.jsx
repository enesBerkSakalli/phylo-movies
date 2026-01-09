import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SeparatorInput } from "./SeparatorInput.jsx";
import { GroupingPreview } from "./GroupingPreview.jsx";
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
  const [previewOpen, setPreviewOpen] = useState(true);

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
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-sm font-medium">Grouping Strategy</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Choose how taxa names are parsed and grouped together
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">Pattern</p>
            <div className="flex flex-wrap gap-2">
              {strategies.map(s => (
                <Button
                  key={s.value}
                  size="sm"
                  variant={selectedStrategy === s.value ? "default" : "outline"}
                  onClick={() => handleStrategyChange(s.value)}
                  className="transition-all active:scale-95 shadow-sm"
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>

          {selectedStrategy !== "first-letter" && selectedStrategy !== "segment" && !useRegex && (
            <>
              <Separator />
              <div>
                <p className="mb-2 text-sm font-medium">Separator Characters</p>
                <SeparatorInput
                  separators={separators}
                  onChange={handleSeparatorsChange}
                  detectedSeparators={groupingResult?.detectedSeparators || []}
                />
              </div>
            </>
          )}

          {selectedStrategy === "segment" && !useRegex && (
             <>
               <Separator />
               <div className="space-y-2">
                 <p className="text-sm font-medium">Select Segment Index</p>

                 <div className="flex items-center gap-4">
                  <div className="w-full">
                    {/* Re-using the same Select logic as was in AdvancedPatternOptions */}
                     <Select
                       value={String(segmentIndex ?? 0)}
                       onValueChange={(val) => handleSegmentIndexChange(Number(val))}
                     >
                       <SelectTrigger id="segment-index-main">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="0">First (0)</SelectItem>
                         <SelectItem value="1">Second (1)</SelectItem>
                         <SelectItem value="2">Third (2)</SelectItem>
                         <SelectItem value="3">Fourth (3)</SelectItem>
                         <SelectItem value="-1">Last (-1)</SelectItem>
                         <SelectItem value="-2">Second to Last (-2)</SelectItem>
                       </SelectContent>
                     </Select>
                  </div>
                  <div className="text-xs text-muted-foreground max-w-[50%]">
                    Create groups based on the text at this position after splitting by separators.
                    <br/>Example: <code className="bg-muted px-1 rounded">Gen_Sp_ID</code> (Index 1) → <code className="bg-muted px-1 rounded">Sp</code>
                  </div>
                 </div>

                 <SeparatorInput
                    separators={separators}
                    onChange={handleSeparatorsChange}
                    detectedSeparators={groupingResult?.detectedSeparators || []}
                 />
               </div>
             </>
          )}

          <Separator />
          <AdvancedPatternOptions
            strategy={selectedStrategy}
            segmentIndex={segmentIndex}
            useRegex={useRegex}
            regexPattern={regexPattern}
            onSegmentIndexChange={handleSegmentIndexChange}
            onUseRegexChange={handleUseRegexChange}
            onRegexPatternChange={handleRegexPatternChange}
            // Pass flag to hide internal segment picker since we show it above now
            hideSegmentPicker={true}
          />
        </CardContent>
      </Card>

      <GroupingPreview
        groupingResult={groupingResult}
        isOpen={previewOpen}
        onToggle={setPreviewOpen}
      />
    </div>
  );
}
