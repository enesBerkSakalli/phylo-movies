import React, { useCallback } from 'react';
import {
  selectHighlightColorMode,
  selectSubtreeHighlightColor,
  selectMarkedNodes,
  selectSubtreeHighlightScope,
  selectSubtreeHighlightOpacity,
  selectSubtreeHighlightsEnabled,
  selectMonophyleticColoringEnabled,
  selectPivotEdgeColor,
  selectPivotEdgesEnabled,
  selectSetHighlightColorMode,
  selectSetManuallyMarkedNodes,
  selectSetSubtreeHighlightColor,
  selectSetSubtreeHighlightScope,
  selectSetSubtreeHighlightOpacity,
  selectSetSubtreeHighlightsEnabled,
  selectSetMonophyleticColoring,
  selectSetPivotEdgeColor,
  selectSetPivotEdgesEnabled,
  selectLeafNamesByIndex,
  selectSetTaxaColoringOpen,
  selectTaxaColoringOpen,
  selectTreeControllers,
  useAppStore
} from '../../../state/phyloStore/store.js';
import { Switch } from '../../ui/switch';
import { Input } from '../../ui/input';
import { Palette, Settings2, RefreshCw } from 'lucide-react';
import {
  SidebarMenuSub,
  SidebarMenuSubItem,
} from '../../ui/sidebar';
import { Slider } from '../../ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Label } from '../../ui/label';
import { Button } from '../../ui/button';
import { Separator } from '../../ui/separator';
import { Highlighter, X } from 'lucide-react';

export function ColoringPanel({ onOpenTaxaColoring }) {
  const monophyletic = useAppStore(selectMonophyleticColoringEnabled);
  const pivotEdgesEnabled = useAppStore(selectPivotEdgesEnabled);
  const treeControllers = useAppStore(selectTreeControllers);
  const pivotEdgeColor = useAppStore(selectPivotEdgeColor);
  const subtreeHighlightColor = useAppStore(selectSubtreeHighlightColor);
  const taxaNames = useAppStore(selectLeafNamesByIndex) || [];
  const taxaColoringOpen = useAppStore(selectTaxaColoringOpen);
  const setTaxaColoringOpen = useAppStore(selectSetTaxaColoringOpen);
  const hasTaxa = taxaNames.length > 0;

  const setMonophyleticColoring = useAppStore(selectSetMonophyleticColoring);
  const setPivotEdgesEnabled = useAppStore(selectSetPivotEdgesEnabled);
  const setPivotEdgeColor = useAppStore(selectSetPivotEdgeColor);
  const setSubtreeHighlightColor = useAppStore(selectSetSubtreeHighlightColor);

  // Subtree Highlighting State
  const subtreeHighlightsEnabled = useAppStore(selectSubtreeHighlightsEnabled);
  const subtreeHighlightScope = useAppStore(selectSubtreeHighlightScope);
  const subtreeHighlightOpacity = useAppStore(selectSubtreeHighlightOpacity);
  const highlightColorMode = useAppStore(selectHighlightColorMode);
  const manuallyMarkedNodes = useAppStore(selectMarkedNodes);

  const setSubtreeHighlightsEnabled = useAppStore(selectSetSubtreeHighlightsEnabled);
  const setSubtreeHighlightScope = useAppStore(selectSetSubtreeHighlightScope);
  const setSubtreeHighlightOpacity = useAppStore(selectSetSubtreeHighlightOpacity);
  const setHighlightColorMode = useAppStore(selectSetHighlightColorMode);
  const setManuallyMarkedNodes = useAppStore(selectSetManuallyMarkedNodes);

  const rerenderControllers = useCallback(async () => {
    try {
      for (const controller of treeControllers) {
        await controller.renderAllElements();
      }
    } catch { }
  }, [treeControllers]);

  const onToggleMonophyletic = useCallback(async (v) => {
    setMonophyleticColoring(!!v);
    await rerenderControllers();
  }, [setMonophyleticColoring, rerenderControllers]);

  const onTogglePivotEdges = useCallback(async (v) => {
    setPivotEdgesEnabled(!!v);
  }, [setPivotEdgesEnabled]);

  const toggleSubtreeHighlights = useCallback(async (v) => {
    setSubtreeHighlightsEnabled(!!v);
    await rerenderControllers();
  }, [setSubtreeHighlightsEnabled, rerenderControllers]);

  const openTaxaColoring = useCallback(() => {
    if (!hasTaxa) return;
    if (onOpenTaxaColoring) {
      onOpenTaxaColoring();
      return;
    }
    setTaxaColoringOpen(true);
  }, [hasTaxa, onOpenTaxaColoring, setTaxaColoringOpen]);

  return (
    <SidebarMenuSub>
      <SidebarMenuSubItem>
        <Button
          id="taxa-coloring-button"
          type="button"
          onClick={openTaxaColoring}
          disabled={!hasTaxa}
          aria-label={hasTaxa ? 'Open taxa coloring window' : 'Taxa coloring unavailable until taxa are loaded'}
          variant={taxaColoringOpen ? 'secondary' : 'outline'}
          className="w-full justify-start h-8 text-xs font-normal"
        >
          <Palette data-icon="inline-start" className="text-primary" />
          <span>Taxa Colors</span>
        </Button>
      </SidebarMenuSubItem>
      <Separator className="my-2 mx-2" />
      <SidebarMenuSubItem>
        <div className="flex items-center justify-between px-2 py-2 w-full">
          <div className="flex items-center gap-2 overflow-hidden">
            <Settings2 className="size-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-foreground/70 truncate">Group Branches</span>
          </div>
          <Switch
            id="monophyletic-coloring"
            checked={!!monophyletic}
            onCheckedChange={onToggleMonophyletic}
          />
        </div>
      </SidebarMenuSubItem>
      <SidebarMenuSubItem>
        <div className="flex items-center justify-between px-2 py-2 w-full">
          <div className="flex items-center gap-2 overflow-hidden">
            <RefreshCw className="size-4 text-primary/80 shrink-0" />
            <span className="text-xs text-foreground/70 truncate">Changes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-5 rounded-md border border-border/60 overflow-hidden shrink-0 group-hover:border-primary/40 transition-colors">
              <Input
                type="color"
                value={pivotEdgeColor || '#2196f3'}
                className="size-10 -m-2 p-0 border-none bg-transparent cursor-pointer"
                onChange={async (e) => {
                  setPivotEdgeColor(e.target.value);
                  await rerenderControllers();
                }}
              />
            </div>
            <Switch
              id="pivot-edges-toggle"
              checked={!!pivotEdgesEnabled}
              onCheckedChange={onTogglePivotEdges}
            />
          </div>
        </div>
      </SidebarMenuSubItem>
      <SidebarMenuSubItem>
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-2 py-2 w-full">
            <div className="flex items-center gap-2 overflow-hidden">
              <Highlighter className="size-4 text-primary/80 shrink-0" />
              <span className="text-xs text-foreground/70 truncate">Subtree Highlight</span>
            </div>
            <Switch
              id="enable-subtree-highlights"
              checked={!!subtreeHighlightsEnabled}
              onCheckedChange={toggleSubtreeHighlights}
            />
          </div>

          {subtreeHighlightsEnabled && (
            <div className="flex flex-col gap-4 mx-2 mb-2 p-2 rounded-md bg-muted/20 border border-border/30">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="subtree-opacity-slider" className="text-2xs font-bold uppercase tracking-wider text-muted-foreground/80">Highlight Opacity</Label>
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">{Math.round((subtreeHighlightOpacity ?? 0.8) * 100)}%</span>
                </div>
                <Slider
                  id="subtree-opacity-slider"
                  min={0}
                  max={1}
                  step={0.05}
                  value={[subtreeHighlightOpacity ?? 0.8]}
                  onValueChange={(val) => setSubtreeHighlightOpacity(val[0])}
                  className="w-full py-1"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-2xs font-bold uppercase tracking-wider text-muted-foreground/80">Highlight Scope</Label>
                <Select value={subtreeHighlightScope || 'current'} onValueChange={setSubtreeHighlightScope}>
                  <SelectTrigger className="w-full h-8 text-xs bg-background/50 border-border/40">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Affected Edges</SelectItem>
                    <SelectItem value="current">Current Subtree</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-2xs font-bold uppercase tracking-wider text-muted-foreground/80">Highlight Style</Label>
                <Select value={highlightColorMode || 'solid'} onValueChange={setHighlightColorMode}>
                  <SelectTrigger className="w-full h-8 text-xs bg-background/50 border-border/40">
                    <SelectValue placeholder="Select color mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid Color</SelectItem>
                    <SelectItem value="taxa">Taxa Color</SelectItem>
                    <SelectItem value="contrast">High Contrast</SelectItem>
                  </SelectContent>
                </Select>
                {highlightColorMode === 'solid' && (
                  <div className="flex items-center justify-between mt-1 px-1">
                    <span className="text-2xs text-muted-foreground font-medium">Solid Color</span>
                    <div className="size-5 rounded-md border border-border/60 overflow-hidden shrink-0">
                      <Input
                        type="color"
                        value={subtreeHighlightColor || '#10b981'}
                        className="size-10 -m-2 p-0 border-none bg-transparent cursor-pointer"
                        onChange={async (e) => {
                          setSubtreeHighlightColor(e.target.value);
                          await rerenderControllers();
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {manuallyMarkedNodes && manuallyMarkedNodes.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setManuallyMarkedNodes([])}
                  className="w-full mt-1 h-7 text-2xs uppercase font-bold tracking-tight border-muted-foreground/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all bg-background/40"
                >
                  <X className="w-3 h-3 mr-2" />
                  Clear Highlighted Subtree
                </Button>
              )}
            </div>
          )}
        </div>
      </SidebarMenuSubItem>
    </SidebarMenuSub>
  );
}
