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
    await rerenderControllers();
  }, [setActiveChangeEdgesEnabled, rerenderControllers]);

  return (
    <SidebarMenuSub>
      <SidebarMenuSubItem className="px-1 py-1">
        <SidebarMenuSubButton
          id="taxa-coloring-button"
          onClick={() => setTaxaColoringOpen(true)}
          size="md"
          className="w-full bg-primary/5 hover:bg-primary/10 text-primary font-semibold ring-1 ring-primary/20 transition-all shadow-sm group/btn"
        >
          <Palette className="size-4 mr-0.5 group-hover/btn:scale-110 transition-transform" />
          <span>Taxa Coloring Manager</span>
        </SidebarMenuSubButton>
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
            className="scale-75 origin-right"
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
              className="scale-75 origin-right"
            />
          </div>
        </div>
      </SidebarMenuSubItem>

      <SidebarMenuSubItem>
        <div className="flex items-center justify-between px-2 py-1.5 w-full">
          <div className="flex items-center gap-2 overflow-hidden">
            <Palette className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-foreground/70 truncate">Subtree Highlight</span>
          </div>
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
      </SidebarMenuSubItem>
    </SidebarMenuSub>
  );
}
