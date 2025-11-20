import React, { useEffect, useMemo, useRef, useState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Palette,
  Eye,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { CATEGORICAL_PALETTES, getPaletteInfo } from "@/js/constants/ColorPalettes.js";
import { ColorSchemeManager } from "@/js/treeColoring/utils/ColorSchemeManager.js";
import { parseGroupCSV, validateCSVTaxa } from "@/js/treeColoring/utils/CSVParser.js";
import { generateGroups } from "@/js/treeColoring/utils/GroupingUtils.js";
import { mapStrategyName } from "@/js/treeColoring/constants/Strategies.js";

function useForceUpdate() {
  const [, setV] = useState(0);
  return () => setV(v => v + 1);
}

function ColorSwatchInput({ label, color, onChange }) {
  const [open, setOpen] = useState(false);
  const controlId = useId();

  // Quick colors: first 4 palettes, first 5 colors each
  const quickColors = useMemo(() => {
    const set = new Set();
    Object.values(CATEGORICAL_PALETTES).slice(0, 4).forEach(p => p.slice(0, 5).forEach(c => set.add(c)));
    return Array.from(set);
  }, []);

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground" htmlFor={controlId}>{label}</Label>
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={controlId}
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7 border border-input"
              style={{ backgroundColor: color || "#000000" }}
              aria-label={`Select color for ${label}`}
            />
          </PopoverTrigger>
          <PopoverContent className="w-64 space-y-3" align="start">
            <div className="grid grid-cols-10 gap-1">
              {quickColors.map((c) => (
                <Button
                  key={c}
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 border border-input p-0 hover:opacity-80"
                  style={{ backgroundColor: c }}
                  aria-label={`Use color ${c}`}
                  onClick={() => { onChange(c); setOpen(false); }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={color || "#000000"}
                aria-label="Pick custom color"
                onChange={(e) => onChange(e.target.value)}
                className="h-8 w-[4.5rem] cursor-pointer p-1"
              />
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Close</Button>
            </div>
          </PopoverContent>
        </Popover>
        <span className="text-xs text-muted-foreground">{color || "#000000"}</span>
      </div>
    </div>
  );
}

function ColorSchemeSelector({ onApply, title = "Apply a Color Scheme", description = "Browse curated palettes to jump-start coloring." }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {description && <CardDescription className="text-xs text-muted-foreground">{description}</CardDescription>}
          </div>
          <CollapsibleTrigger asChild>
            <Button size="sm" variant="secondary" className="shrink-0">
              <Palette className="mr-2 size-4" />
              {open ? (<>Hide <ChevronUp className="ml-1 size-4" /></>) : (<>Browse Palettes <ChevronDown className="ml-1 size-4" /></>)}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="grid grid-cols-1 gap-3 pt-0 md:grid-cols-2">
            {Object.entries(CATEGORICAL_PALETTES).map(([id, colors]) => {
              const info = getPaletteInfo(id);
              return (
                <Button
                  key={id}
                  type="button"
                  variant="outline"
                  className="h-auto flex flex-col items-start gap-2 text-left"
                  onClick={() => onApply(id)}
                  title={info.description}
                >
                  <div className="h-4 w-full rounded" style={{ background: `linear-gradient(to right, ${colors.join(", ")})` }} />
                  <div className="flex items-center gap-1 text-xs">
                    <span className="font-medium">{id}</span>
                    {info.colorBlindSafe && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Eye className="size-3" />
                        CB-safe
                      </span>
                    )}
                  </div>
                </Button>
              );
            })}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function StrategySelector({ selectedStrategy, selectedSeparator, onChange, cachedSeparators }) {
  const strategies = [
    { value: "prefix", label: "Prefix" },
    { value: "suffix", label: "Suffix" },
    { value: "middle", label: "Middle" },
    { value: "first-letter", label: "First Letter" },
  ];
  const commonSeparators = ["_", "-", ".", "|", " "];
  const allSeparators = Array.from(new Set([ ...commonSeparators, ...(cachedSeparators || []) ]));

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-sm font-medium">Grouping Strategy</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Choose how taxa names are parsed and how separators are detected.
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
                onClick={() => onChange(s.value, selectedSeparator)}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </div>
        <Separator />
        <div>
          <p className="mb-2 text-sm font-medium">Separator Character</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={selectedSeparator == null ? "default" : "outline"}
              onClick={() => onChange(selectedStrategy, null)}
            >
              Auto-detect
            </Button>
            {allSeparators.map(sep => (
              <Button
                key={sep === " " ? "space" : sep}
                size="sm"
                variant={selectedSeparator === sep ? "default" : "outline"}
                onClick={() => onChange(selectedStrategy, sep)}
              >
                {sep === " " ? "Space" : sep}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CSVUpload({ onFile }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <Card>
      <CardContent className="p-0">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault(); setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) onFile(file);
          }}
          className={
            "relative flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed p-6 text-center transition " +
            (dragOver ? "border-primary ring-2 ring-primary/40" : "border-muted")
          }
        >
          <Upload className="mx-auto size-6 text-primary" />
          <div className="text-sm text-muted-foreground">Drag and drop a CSV file here, or click to browse</div>
          <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>Browse Files</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CSVPreview({ csvValidation, csvGroups }) {
  if (!csvValidation) return null;
  const ok = csvValidation.isValid;
  return (
    <div className="space-y-3">
      <Alert>
        <div className="flex items-start gap-2">
          {ok ? <CheckCircle2 className="size-4 mt-0.5 text-green-600" /> : <AlertTriangle className="size-4 mt-0.5 text-yellow-600" />}
          <div>
            <AlertTitle>{ok ? "CSV Loaded Successfully" : "CSV Loaded with Warnings"}</AlertTitle>
            <AlertDescription>
              {csvGroups.length} groups • {csvValidation.matched.length} matched taxa ({csvValidation.matchPercentage}%)
            </AlertDescription>
          </div>
        </div>
      </Alert>
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-sm">Group Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[1fr_auto] gap-y-2 text-sm">
            <div className="text-muted-foreground">Group Name • Taxa Count • Sample Members</div>
            <div />
            <Separator className="col-span-2 my-2" />
            <ScrollArea className="h-64 pr-2">
              <div className="space-y-2">
                {csvGroups.slice(0, 20).map((g) => (
                  <div key={g.name} className="grid grid-cols-[1fr_auto] items-start gap-x-2">
                    <div>
                      <div className="font-medium">{g.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {g.count} taxa • {g.members.slice(0,3).join(", ")}{g.members.length>3?"...":""}
                      </div>
                    </div>
                    <div className="justify-self-end text-xs text-muted-foreground">{g.count}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function TaxaColoringWindow({ taxaNames = [], originalColorMap = {}, onApply, onClose }) {
  const colorManagerRef = useRef(new ColorSchemeManager(originalColorMap));
  const force = useForceUpdate();

  const [mode, setMode] = useState("taxa");
  const [selectedStrategy, setSelectedStrategy] = useState("prefix");
  const [selectedSeparator, setSelectedSeparator] = useState(null);
  const [groups, setGroups] = useState([]);
  const [cachedSeparators] = useState(null);

  // CSV state
  const [csvData, setCsvData] = useState(null);
  const [csvGroups, setCsvGroups] = useState([]);
  const [csvTaxaMap, setCsvTaxaMap] = useState(null);
  const [csvColumn, setCsvColumn] = useState(null);
  const [csvValidation, setCsvValidation] = useState(null);

  function applyScheme(id, targetMode) {
    const mgr = colorManagerRef.current;
    if (targetMode === "taxa") {
      mgr.applyColorScheme(id, taxaNames, false);
    } else if (targetMode === "groups") {
      mgr.applyColorScheme(id, groups, true);
    } else if (targetMode === "csv") {
      mgr.applyColorScheme(id, csvGroups, true);
    }
    force();
  }

  function updateGroups() {
    const mapped = mapStrategyName(selectedStrategy);
    const res = generateGroups(taxaNames, selectedSeparator, mapped);
    if (res?.groups) {
      setGroups(res.groups);
      if (res.analyzed && res.separator) setSelectedSeparator(res.separator);

      // Clear stale group colors - remove colors for groups that no longer exist
      const mgr = colorManagerRef.current;
      const currentGroupNames = new Set(res.groups.map(g => g.name));
      const staleGroups = Array.from(mgr.groupColorMap.keys()).filter(g => !currentGroupNames.has(g));
      staleGroups.forEach(g => mgr.groupColorMap.delete(g));

      // Auto-assign colors to new groups that don't have colors yet
      res.groups.forEach(g => {
        if (!mgr.groupColorMap.has(g.name)) {
          mgr.groupColorMap.set(g.name, mgr.getRandomColor());
        }
      });

      force(); // Force re-render to show new colors
    } else {
      setGroups(res || []);
    }
  }

  useEffect(() => { if (mode === "groups") updateGroups(); }, [mode, selectedStrategy, selectedSeparator, taxaNames]);

  async function onFile(file) {
    try {
      const text = await file.text();
      const parsed = parseGroupCSV(text);
      if (!parsed.success) { alert(parsed.error); return; }
      setCsvData(parsed.data);
      const firstCol = parsed.data.groupingColumns[0].name;
      setCsvColumn(firstCol);
      const map = parsed.data.allGroupings[firstCol];
      const v = validateCSVTaxa(map, taxaNames);
      if (!v.isValid) { alert("No matching taxa found in CSV file"); return; }
      setCsvValidation(v);
      setCsvGroups(parsed.data.columnGroups[firstCol] || []);
      setCsvTaxaMap(map);
    } catch (e) {
      alert(`Failed to read CSV file: ${e.message}`);
    }
  }

  function onColumnChange(colName) {
    if (!csvData) return;
    setCsvColumn(colName);
    const map = csvData.allGroupings[colName] || new Map();
    setCsvTaxaMap(map);
    setCsvGroups(csvData.columnGroups[colName] || []);
    setCsvValidation(validateCSVTaxa(map, taxaNames));
  }

  function resetAll() {
    colorManagerRef.current.reset();
    setMode("taxa");
    setSelectedStrategy("prefix");
    setSelectedSeparator(null);
    setGroups([]);
    setCsvData(null); setCsvGroups([]); setCsvTaxaMap(null); setCsvColumn(null); setCsvValidation(null);
    force();
  }

  function resetColorsToBlack() {
    const mgr = colorManagerRef.current;
    if (mode === "taxa") {
      taxaNames.forEach((name) => mgr.taxaColorMap.set(name, "#000000"));
    } else if (mode === "groups") {
      groups.forEach((group) => mgr.groupColorMap.set(group.name, "#000000"));
    } else if (mode === "csv") {
      csvGroups.forEach((group) => mgr.groupColorMap.set(group.name, "#000000"));
    }
    force();
  }

  function applyAndClose() {
    const result = {
      mode,
      taxaColorMap: colorManagerRef.current.taxaColorMap,
      groupColorMap: colorManagerRef.current.groupColorMap,
      separator: selectedSeparator === null || selectedSeparator === 'null' || selectedSeparator === undefined ? null : selectedSeparator,
      strategyType: mapStrategyName(selectedStrategy),
      csvTaxaMap, csvGroups, csvColumn
    };
    onApply?.(result);
    onClose?.();
  }

  const mgr = colorManagerRef.current;

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

          <TabsContent value="taxa" className="space-y-4">
            <ColorSchemeSelector
              onApply={(id) => applyScheme(id, "taxa")}
              description="Apply a curated palette directly to each taxa."
            />
            {taxaNames.length === 0 ? (
              <Alert>
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 size-4" />
                  <div>
                    <AlertTitle>No taxa available for coloring.</AlertTitle>
                    <AlertDescription>Load a dataset to configure taxa colors.</AlertDescription>
                  </div>
                </div>
              </Alert>
            ) : (
              <Card>
                <CardHeader className="space-y-1 pb-2">
                  <CardTitle className="text-sm font-medium">Taxa Colors ({taxaNames.length})</CardTitle>
                  <CardDescription>Adjust colors for each taxa entry.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {taxaNames.map((name) => (
                      <ColorSwatchInput
                        key={name}
                        label={name}
                        color={mgr.taxaColorMap.get(name) || "#000000"}
                        onChange={(c) => { mgr.taxaColorMap.set(name, c); force(); }}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="groups" className="space-y-4">
            <StrategySelector
              selectedStrategy={selectedStrategy}
              selectedSeparator={selectedSeparator}
              onChange={(s, sep) => { setSelectedStrategy(s); setSelectedSeparator(sep); }}
              cachedSeparators={cachedSeparators}
            />
            <ColorSchemeSelector
              onApply={(id) => applyScheme(id, "groups")}
              description="Assign palettes to generated groups."
            />
            {groups.length === 0 ? (
              <Alert>
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 size-4" />
                  <div>
                    <AlertTitle>No groups found with current settings.</AlertTitle>
                  </div>
                </div>
              </Alert>
            ) : (
              <Card>
                <CardHeader className="space-y-1 pb-2">
                  <CardTitle className="text-sm font-medium">Group Colors ({groups.length})</CardTitle>
                  <CardDescription>Fine-tune colors for each detected grouping.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {groups.map((g) => (
                      <ColorSwatchInput
                        key={g.name}
                        label={`${g.name} (${g.count})`}
                        color={mgr.groupColorMap.get(g.name) || mgr.getRandomColor()}
                        onChange={(c) => { mgr.groupColorMap.set(g.name, c); force(); }}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="csv" className="space-y-4">
            <CSVUpload onFile={onFile} />

            {csvData && (
              <div className="space-y-4">
                {csvData.groupingColumns.length > 1 && (
                  <Card>
                    <CardHeader className="space-y-1 pb-2">
                      <CardTitle className="text-sm font-medium">Select CSV Column</CardTitle>
                      <CardDescription>Choose which grouping column to visualize.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      {csvData.groupingColumns.map((c) => (
                        <Button key={c.name} size="sm" variant={csvColumn === c.name ? "default" : "outline"} onClick={() => onColumnChange(c.name)}>
                          {c.displayName}
                        </Button>
                      ))}
                    </CardContent>
                  </Card>
                )}
                <CSVPreview csvValidation={csvValidation} csvGroups={csvGroups} />
                <ColorSchemeSelector
                  onApply={(id) => applyScheme(id, "csv")}
                  description="Apply palettes to CSV-defined groups."
                />
                {csvGroups.length > 0 && (
                  <Card>
                    <CardHeader className="space-y-1 pb-2">
                      <CardTitle className="text-sm font-medium">Group Colors ({csvGroups.length})</CardTitle>
                      <CardDescription>Adjust colors imported from CSV groupings.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {csvGroups.map((g) => (
                          <ColorSwatchInput
                            key={g.name}
                            label={`${g.name} (${g.count})`}
                            color={mgr.groupColorMap.get(g.name) || mgr.getRandomColor()}
                            onChange={(c) => { mgr.groupColorMap.set(g.name, c); force(); }}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default TaxaColoringWindow;
