import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { mapStrategyName, SEPARATION_STRATEGIES } from "@/js/treeColoring/constants/Strategies.js";

function useForceUpdate() {
  const [, setV] = useState(0);
  return () => setV(v => v + 1);
}

function ColorSwatchInput({ label, color, onChange }) {
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);

  // Quick colors: first 4 palettes, first 5 colors each
  const quickColors = useMemo(() => {
    const set = new Set();
    Object.values(CATEGORICAL_PALETTES).slice(0, 4).forEach(p => p.slice(0, 5).forEach(c => set.add(c)));
    return Array.from(set);
  }, []);

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="h-6 w-6 rounded border"
          style={{ backgroundColor: color || "#000000" }}
          onClick={() => setOpen(o => !o)}
          aria-label="Open color picker"
        />
        {open && (
          <div className="z-50 rounded-md border bg-popover p-2 shadow-md">
            <div className="mb-2 grid grid-cols-10 gap-1">
              {quickColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  className="h-5 w-5 rounded border"
                  style={{ backgroundColor: c }}
                  onClick={() => { onChange(c); setOpen(false); }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                type="color"
                value={color || "#000000"}
                onChange={(e) => onChange(e.target.value)}
                className="h-8 w-[4.5rem] p-1"
              />
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ColorSchemeSelector({ onApply, title = "Apply a Color Scheme" }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button size="sm" variant="secondary">
              <Palette className="mr-2 size-4" />
              {open ? (<>Hide <ChevronUp className="ml-1 size-4" /></>) : (<>Show Color Schemes <ChevronDown className="ml-1 size-4" /></>)}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(CATEGORICAL_PALETTES).map(([id, colors]) => {
                const info = getPaletteInfo(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onApply(id)}
                    className="rounded-md border p-2 text-left hover:bg-accent/40"
                    title={info.description}
                  >
                    <div className="h-4 rounded" style={{ background: `linear-gradient(to right, ${colors.join(", ")})` }} />
                    <div className="mt-2 flex items-center gap-1 text-xs">
                      <span className="font-medium">{id}</span>
                      {info.colorBlindSafe && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground"><Eye className="size-3" />CB-safe</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
      <Separator />
    </div>
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
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium mb-2">Grouping Strategy</h4>
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
      <div>
        <h4 className="text-sm font-medium mb-2">Separator Character</h4>
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
      <Separator />
    </div>
  );
}

function CSVUpload({ onFile }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault(); setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      className={"relative rounded-md border p-6 text-center " + (dragOver ? "ring-2 ring-primary" : "")}
    >
      <Upload className="mx-auto mb-2 size-6 text-primary" />
      <div className="text-sm text-muted-foreground mb-3">Drag and drop a CSV file here, or click to browse</div>
      <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>Browse Files</Button>
    </div>
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

  function applyAndClose() {
    const result = {
      mode,
      taxaColorMap: colorManagerRef.current.taxaColorMap,
      groupColorMap: colorManagerRef.current.groupColorMap,
      separator: selectedSeparator,
      strategyType: mapStrategyName(selectedStrategy),
      csvTaxaMap, csvGroups, csvColumn
    };
    onApply?.(result);
    onClose?.();
  }

  const mgr = colorManagerRef.current;

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-base font-semibold">Taxa Color Assignment</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetAll}>Reset</Button>
          <Button size="sm" onClick={applyAndClose}>Apply</Button>
        </div>
      </header>
      <main className="flex-1 space-y-4 overflow-auto">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "taxa", label: "Taxa" },
            { key: "groups", label: "Group by Pattern" },
            { key: "csv", label: "Import CSV" },
          ].map(({ key, label }) => (
            <Button key={key} size="sm" variant={mode === key ? "default" : "outline"} onClick={() => setMode(key)}>
              {label}
            </Button>
          ))}
        </div>

        {mode === "taxa" && (
          <div className="space-y-4">
            <ColorSchemeSelector onApply={(id) => applyScheme(id, "taxa")} />
            {taxaNames.length === 0 ? (
              <Alert>
                <div className="flex items-start gap-2">
                  <Info className="size-4 mt-0.5" />
                  <div>
                    <AlertTitle>No taxa available for coloring.</AlertTitle>
                    <AlertDescription>Load a dataset to configure taxa colors.</AlertDescription>
                  </div>
                </div>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {taxaNames.map((name) => (
                  <ColorSwatchInput
                    key={name}
                    label={name}
                    color={mgr.taxaColorMap.get(name) || "#000000"}
                    onChange={(c) => { mgr.taxaColorMap.set(name, c); force(); }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {mode === "groups" && (
          <div className="space-y-4">
            <StrategySelector
              selectedStrategy={selectedStrategy}
              selectedSeparator={selectedSeparator}
              onChange={(s, sep) => { setSelectedStrategy(s); setSelectedSeparator(sep); }}
              cachedSeparators={cachedSeparators}
            />
            <ColorSchemeSelector onApply={(id) => applyScheme(id, "groups")} />
            {groups.length === 0 ? (
              <Alert>
                <div className="flex items-start gap-2">
                  <Info className="size-4 mt-0.5" />
                  <div>
                    <AlertTitle>No groups found with current settings.</AlertTitle>
                  </div>
                </div>
              </Alert>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Group Colors ({groups.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {groups.map((g) => (
                    <ColorSwatchInput
                      key={g.name}
                      label={`${g.name} (${g.count})`}
                      color={mgr.groupColorMap.get(g.name) || mgr.getRandomColor()}
                      onChange={(c) => { mgr.groupColorMap.set(g.name, c); force(); }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {mode === "csv" && (
          <div className="space-y-4">
            <CSVUpload onFile={onFile} />

            {csvData && (
              <div className="space-y-3">
                {csvData.groupingColumns.length > 1 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-sm font-medium">Column:</div>
                    {csvData.groupingColumns.map((c) => (
                      <Button key={c.name} size="sm" variant={csvColumn === c.name ? "default" : "outline"} onClick={() => onColumnChange(c.name)}>
                        {c.displayName}
                      </Button>
                    ))}
                  </div>
                )}
                <CSVPreview csvValidation={csvValidation} csvGroups={csvGroups} />
                <ColorSchemeSelector onApply={(id) => applyScheme(id, "csv")} />
                {csvGroups.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Group Colors ({csvGroups.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {csvGroups.map((g) => (
                        <ColorSwatchInput
                          key={g.name}
                          label={`${g.name} (${g.count})`}
                          color={mgr.groupColorMap.get(g.name) || mgr.getRandomColor()}
                          onChange={(c) => { mgr.groupColorMap.set(g.name, c); force(); }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default TaxaColoringWindow;
