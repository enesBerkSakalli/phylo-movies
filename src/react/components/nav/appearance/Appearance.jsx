import React from 'react';
import { useAppStore, TREE_COLOR_CATEGORIES } from '../../../../js/core/store.js';
import { AdvancedFeatures } from './AdvancedFeatures.jsx';
import { Switch } from '@/components/ui/switch';
import { SidebarGroup, SidebarGroupLabel } from '@/components/ui/sidebar';

export function Appearance() {
  const dimming = useAppStore((s) => s.dimmingEnabled);
  const treeController = useAppStore((s) => s.treeController);
  const setDimmingEnabled = useAppStore((s) => s.setDimmingEnabled);

  const toggleDimming = async (value) => {
    try {
      setDimmingEnabled(!!value);
      await treeController?.renderAllElements?.();
    } catch {}
  };

  return (
    <div className="appearance-root" data-react-component="appearance">
      <SidebarGroup>
        <SidebarGroupLabel>Focus & Highlighting</SidebarGroupLabel>
        <div className="flex flex-col gap-4">
          <label
            className="flex items-center gap-4"
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              if (e.target?.closest?.('[data-slot=\"switch\"]')) return;
              toggleDimming(!dimming);
            }}
          >
            <Switch
              id="dim-non-descendants-toggle"
              aria-labelledby="dim-non-descendants-label"
              aria-describedby="dim-non-descendants-desc"
              checked={!!dimming}
              onCheckedChange={toggleDimming}
            />
            <div style={{ flex: 1 }}>
              <div id="dim-non-descendants-label" style={{ fontWeight: 500, color: 'var(--foreground)' }}>
                Focus on Active Subtree
              </div>
              <div id="dim-non-descendants-desc" className="text-sm text-muted-foreground">Dim all non-descendants of the active edge</div>
            </div>
          </label>
        </div>
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel>Advanced Features</SidebarGroupLabel>
        <AdvancedFeatures />
      </SidebarGroup>
    </div>
  );
}

export default Appearance;
