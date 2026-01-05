import React, { useCallback } from 'react';
import { useAppStore } from '../../../../js/core/store.js';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Palette } from 'lucide-react';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { openTaxaColoringFromStore } from '../../../../js/treeColoring/components/TaxaColoring.jsx';

export function ColoringPanel() {
  const monophyletic = useAppStore((s) => s.monophyleticColoringEnabled);
  const activeChange = useAppStore((s) => s.activeChangeEdgesEnabled);
  const treeControllers = useAppStore((s) => s.treeControllers);
  const activeChangeEdgeColor = useAppStore((s) => s.activeChangeEdgeColor);
  const markedColor = useAppStore((s) => s.markedColor);

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
    <div>
      <div className="flex flex-col gap-4">
        <Button id="taxa-coloring-button" className="w-full" onClick={openTaxaColoringFromStore}>
          <Palette className="size-4" />
          <span>Taxa Coloring</span>
        </Button>

        <label
          className="row-16"
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            if (e.target?.closest?.('[data-slot="switch"]')) return;
            onToggleMonophyletic(!monophyletic);
          }}
        >
          <Switch
            id="monophyletic-coloring"
            aria-labelledby="monophyletic-coloring-label"
            aria-describedby="monophyletic-coloring-desc"
            checked={!!monophyletic}
            onCheckedChange={onToggleMonophyletic}
          />
          <div style={{ flex: 1 }}>
            <div id="monophyletic-coloring-label" style={{ fontWeight: 500, color: 'var(--foreground)' }}>
              Monophyletic Group Coloring
            </div>
            <div id="monophyletic-coloring-desc" className="text-sm text-muted-foreground">Enable coloring for monophyletic groups in the tree</div>
          </div>
        </label>

        <div>
          <h4 className="text-sm font-medium">Highlighting Colors</h4>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Switch
                id="active-change-edges-toggle"
                aria-labelledby="active-change-edges-label"
                checked={!!activeChange}
                onCheckedChange={onToggleActiveChange}
              />
              <span id="active-change-edges-label" style={{ flex: 1 }}>Active Change Edges</span>
              <input
                type="color"
                id="active-change-edges-color"
                value={activeChangeEdgeColor || '#2196f3'}
                className="color-swatch"
                aria-labelledby="active-change-edges-label"
                onChange={async (e) => {
                  setActiveChangeEdgeColor(e.target.value);
                  await rerenderControllers();
                }}
              />
            </div>
            <div className="flex items-center gap-3">
              <span id="marked-components-label" style={{ flex: 1 }}>Subtree Highlight Color</span>
              <input
                type="color"
                id="marked-color"
                value={markedColor || '#ff5722'}
                className="color-swatch"
                aria-labelledby="marked-components-label"
                onChange={async (e) => {
                  setMarkedColor(e.target.value);
                  await rerenderControllers();
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ColoringPanel;
