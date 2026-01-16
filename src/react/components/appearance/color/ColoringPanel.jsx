import React, { useCallback } from 'react';
import { useAppStore } from '../../../../js/core/store.js';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Palette, Info, Settings2, RefreshCw } from 'lucide-react';
import {
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Highlighter, X } from 'lucide-react';

export function ColoringPanel() {
  const monophyletic = useAppStore((s) => s.monophyleticColoringEnabled);
  const activeChange = useAppStore((s) => s.activeChangeEdgesEnabled);
  const treeControllers = useAppStore((s) => s.treeControllers);
  const activeChangeEdgeColor = useAppStore((s) => s.activeChangeEdgeColor);
  const markedColor = useAppStore((s) => s.markedColor);
  const setTaxaColoringOpen = useAppStore((s) => s.setTaxaColoringOpen);

  const setMonophyleticColoring = useAppStore((s) => s.setMonophyleticColoring);
  const setActiveChangeEdgesEnabled = useAppStore((s) => s.setActiveChangeEdgesEnabled);
  const setActiveChangeEdgeColor = useAppStore((s) => s.setActiveChangeEdgeColor);
  const setMarkedColor = useAppStore((s) => s.setMarkedColor);

  // Subtree Highlighting State
  const markedSubtreesEnabled = useAppStore((s) => s.markedSubtreesEnabled);
  const markedSubtreeMode = useAppStore((s) => s.markedSubtreeMode);
  const markedSubtreeOpacity = useAppStore((s) => s.markedSubtreeOpacity);
  const highlightColorMode = useAppStore((s) => s.highlightColorMode);
  const manuallyMarkedNodes = useAppStore((s) => s.manuallyMarkedNodes);

  const setMarkedSubtreesEnabled = useAppStore((s) => s.setMarkedSubtreesEnabled);
  const setMarkedSubtreeMode = useAppStore((s) => s.setMarkedSubtreeMode);
  const setMarkedSubtreeOpacity = useAppStore((s) => s.setMarkedSubtreeOpacity);
  const setHighlightColorMode = useAppStore((s) => s.setHighlightColorMode);
  const setManuallyMarkedNodes = useAppStore((s) => s.setManuallyMarkedNodes);

  const rerenderControllers = useCallback(async () => {
    try {
      for (const controller of treeControllers ?? []) {
        await controller?.renderAllElements?.();
      }
    } catch { }
  }, [treeControllers]);

  const onToggleMonophyletic = useCallback(async (v) => {
    setMonophyleticColoring(!!v);
    await rerenderControllers();
  }, [setMonophyleticColoring, rerenderControllers]);

  const onToggleActiveChange = useCallback(async (v) => {
    setActiveChangeEdgesEnabled(!!v);
  }, [setActiveChangeEdgesEnabled, rerenderControllers]);

  const toggleMarkedSubtrees = useCallback(async (v) => {
    setMarkedSubtreesEnabled(!!v);
    await rerenderControllers();
  }, [setMarkedSubtreesEnabled, rerenderControllers]);

  return (
    <SidebarMenuSub>
      <SidebarMenuSubItem className="px-1 py-1">
        <Button
          id="taxa-coloring-button"
          onClick={() => setTaxaColoringOpen(true)}
          variant="secondary"
          className="w-full justify-start h-9 font-medium shadow-sm border border-input bg-card hover:bg-accent hover:text-accent-foreground"
        >
          <Palette className="size-4 mr-2" />
          <span>Taxa Colors</span>
        </Button>
        <div className="px-2 mt-1 mb-2">
          <p className="text-[10px] text-muted-foreground/80 leading-tight italic flex gap-1.5 items-start">
            <Info className="size-3 shrink-0 mt-0.5" />
            <span>Manage custom colors for specific taxa and clades in a separate window.</span>
          </p>
        </div>
      </SidebarMenuSubItem>

      <div className="h-px bg-muted/30 my-1.5 mx-2" />

      <SidebarMenuSubItem>
        <div className="flex items-center justify-between px-2 py-1.5 w-full">
          <div className="flex items-center gap-2 overflow-hidden">
            <Settings2 className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-foreground/70 truncate">Monophyletic Coloring</span>
          </div>
          <Switch
            id="monophyletic-coloring"
            checked={!!monophyletic}
            onCheckedChange={onToggleMonophyletic}
          />
        </div>
      </SidebarMenuSubItem>

      <SidebarMenuSubItem>
        <div className="flex items-center justify-between px-2 py-1.5 w-full">
          <div className="flex items-center gap-2 overflow-hidden">
            <RefreshCw className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-foreground/70 truncate">Active Change Edges</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={activeChangeEdgeColor || '#2196f3'}
              className="size-5 p-0 border-none bg-transparent cursor-pointer rounded-full overflow-hidden"
              onChange={async (e) => {
                setActiveChangeEdgeColor(e.target.value);
                await rerenderControllers();
              }}
            />
            <Switch
              id="active-change-edges-toggle"
              checked={!!activeChange}
              onCheckedChange={onToggleActiveChange}
            />
          </div>
        </div>
      </SidebarMenuSubItem>

      <SidebarMenuSubItem>
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-2 py-1.5 w-full">
            <div className="flex items-center gap-2 overflow-hidden">
              <Highlighter className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-foreground/70 truncate">Subtree Highlight</span>
            </div>
            <Switch
              id="enable-marked-subtrees"
              checked={!!markedSubtreesEnabled}
              onCheckedChange={toggleMarkedSubtrees}
            />
          </div>

          {markedSubtreesEnabled && (
            <div className="flex flex-col gap-4 pl-7 pr-2 pb-3 pt-1">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="subtree-opacity-slider" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Highlight Opacity</Label>
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">{Math.round((markedSubtreeOpacity ?? 0.8) * 100)}%</span>
                </div>
                <Slider
                  id="subtree-opacity-slider"
                  min={0}
                  max={1}
                  step={0.05}
                  value={[markedSubtreeOpacity ?? 0.8]}
                  onValueChange={(val) => setMarkedSubtreeOpacity(val[0])}
                  className="w-full py-1"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Highlight Scope</Label>
                <Select value={markedSubtreeMode || 'current'} onValueChange={setMarkedSubtreeMode}>
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Entire Edge Structure</SelectItem>
                    <SelectItem value="current">Active Subtree Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                 <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Highlight Color</Label>
                 <Select value={highlightColorMode || 'solid'} onValueChange={setHighlightColorMode}>
                   <SelectTrigger className="w-full h-8 text-xs">
                     <SelectValue placeholder="Select color mode" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="solid">Solid Color</SelectItem>
                     <SelectItem value="taxa">Taxa Color</SelectItem>
                     <SelectItem value="contrast">High Contrast</SelectItem>
                   </SelectContent>
                 </Select>
                 {highlightColorMode === 'solid' && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">Solid Color:</span>
                      <Input
                        type="color"
                        value={markedColor || '#ff5722'}
                        className="size-5 p-0 border-none bg-transparent cursor-pointer rounded-full overflow-hidden"
                        onChange={async (e) => {
                          setMarkedColor(e.target.value);
                          await rerenderControllers();
                        }}
                      />
                    </div>
                 )}
               </div>
              {manuallyMarkedNodes && manuallyMarkedNodes.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setManuallyMarkedNodes([])}
                  className="w-full mt-2 h-8 text-xs border-muted-foreground/30 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-colors"
                >
                  <X className="w-3.5 h-3.5 mr-2" />
                  Clear Active Selection
                </Button>
              )}
            </div>
          )}
        </div>
      </SidebarMenuSubItem>
    </SidebarMenuSub>
  );
}
