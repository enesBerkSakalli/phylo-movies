import React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export function AdvancedPatternOptions({
  strategy,
  segmentIndex,
  useRegex,
  regexPattern,
  onSegmentIndexChange,
  onUseRegexChange,
  onRegexPatternChange
}) {
  const showSegmentPicker = strategy === "segment";
  const [regexError, setRegexError] = React.useState(null);

  const validateRegex = (pattern) => {
    if (!pattern) {
      setRegexError(null);
      return;
    }
    try {
      new RegExp(pattern);
      setRegexError(null);
    } catch (e) {
      setRegexError(e.message);
    }
  };

  const handleRegexChange = (value) => {
    onRegexPatternChange(value);
    validateRegex(value);
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="advanced">
        <AccordionTrigger className="text-sm font-medium">Advanced Options</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">

          {showSegmentPicker && !useRegex && (
            <div className="space-y-2">
              <Label htmlFor="segment-index" className="text-sm">
                Extract Segment
              </Label>
              <Select
                value={String(segmentIndex ?? 0)}
                onValueChange={(val) => onSegmentIndexChange(Number(val))}
              >
                <SelectTrigger id="segment-index">
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
              <p className="text-xs text-muted-foreground">
                Choose which segment to extract after splitting (0-indexed)
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="use-regex" className="text-sm">
                  Use Custom Regex Pattern
                </Label>
                <p className="text-xs text-muted-foreground">
                  Enable regex mode for advanced pattern matching
                </p>
              </div>
              <Switch
                id="use-regex"
                checked={useRegex}
                onCheckedChange={onUseRegexChange}
              />
            </div>

            {useRegex && (
              <div className="space-y-2">
                <Label htmlFor="regex-pattern" className="text-sm">
                  Regex Pattern
                </Label>
                <Input
                  id="regex-pattern"
                  value={regexPattern || ""}
                  onChange={(e) => handleRegexChange(e.target.value)}
                  placeholder="^([A-Z][a-z]+)_.*"
                  className={regexError ? "border-destructive" : ""}
                />
                {regexError && (
                  <p className="text-xs text-destructive">{regexError}</p>
                )}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Use capture group (parentheses) to extract the group name.
                    Example: <code className="font-mono bg-muted px-1 rounded">^([A-Z][a-z]+)</code> extracts genus from <code className="font-mono bg-muted px-1 rounded">Homo_sapiens</code>
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
