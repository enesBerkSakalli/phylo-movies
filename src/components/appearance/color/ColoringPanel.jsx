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
  selectSetTaxaColoringOpen,
  selectTreeControllers,
  useAppStore
} from '../../../state/phyloStore/store.js';
import { Switch } from '../../ui/switch';
import { Input } from '../../ui/input';
import { Palette, Info, Settings2, RefreshCw } from 'lucide-react';
import {
  SidebarMenuSub,
  SidebarMenuSubItem,
} from '../../ui/sidebar';
import { Slider } from '../../ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Label } from '../../ui/label';
import { Button } from '../../ui/button';
import { Highlighter, X } from 'lucide-react';

export function ColoringPanel() {
  const monophyletic = useAppStore(selectMonophyleticColoringEnabled);
  const pivotEdgesEnabled = useAppStore(selectPivotEdgesEnabled);
  const treeControllers = useAppStore(selectTreeControllers);
  const pivotEdgeColor = useAppStore(selectPivotEdgeColor);
  const subtreeHighlightColor = useAppStore(selectSubtreeHighlightColor);
  const setTaxaColoringOpen = useAppStore(selectSetTaxaColoringOpen);

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

  return (
    <SidebarMenuSub>
      <SidebarMenuSubItem className="px-1 py-1">
        <Button
          id="taxa-coloring-button"
          onClick={() => setTaxaColoringOpen(true)}
          variant="secondary"
          className="w-full justify-start h-9 font-medium border-border/40"
        >
          <Palette className="size-4 mr-2 text-primary" />
          <span>Taxa Colors</span>
        </Button>
        <div className="px-2 mt-2 mb-1">
          <p className="text-2xs text-muted-foreground/80 leading-tight italic flex gap-2 items-start">
            <Info className="size-3 shrink-0 mt-1" />
            <span>Set colors for taxa or groups in a separate window.</span>
          </p>
        </div>
      </SidebarMenuSubItem>
      <div className="h-px bg-muted/30 my-2 mx-2" />
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
