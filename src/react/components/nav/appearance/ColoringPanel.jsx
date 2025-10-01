import React from 'react';
import { useAppStore, TREE_COLOR_CATEGORIES } from '../../../../js/core/store.js';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Palette } from 'lucide-react';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

export function ColoringPanel() {
  const monophyletic = useAppStore((s) => s.monophyleticColoringEnabled);
  const activeChange = useAppStore((s) => s.activeChangeEdgesEnabled);
  const marked = useAppStore((s) => s.markedComponentsEnabled);
  const treeController = useAppStore((s) => s.treeController);

  const setMonophyleticColoring = useAppStore((s) => s.setMonophyleticColoring);
  const setActiveChangeEdgesEnabled = useAppStore((s) => s.setActiveChangeEdgesEnabled);
  const setMarkedComponentsEnabled = useAppStore((s) => s.setMarkedComponentsEnabled);
  const setActiveChangeEdgeColor = useAppStore((s) => s.setActiveChangeEdgeColor);
  const setMarkedColor = useAppStore((s) => s.setMarkedColor);
  const setDimmedColor = useAppStore((s) => s.setDimmedColor);

  const onToggleMonophyletic = async (v) => { setMonophyleticColoring(!!v); try { await treeController?.renderAllElements?.(); } catch {} };
  const onToggleActiveChange = async (v) => { setActiveChangeEdgesEnabled(!!v); try { await treeController?.renderAllElements?.(); } catch {} };
  const onToggleMarked = async (v) => { setMarkedComponentsEnabled(!!v); try { await treeController?.renderAllElements?.(); } catch {} };

  return (
    <div>
      <div className="flex flex-col gap-4">
          <Button id="taxa-coloring-button" className="w-full" onClick={() => useAppStore.getState().gui?.openTaxaColoringWindow?.()}>
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
          <Label className="font-medium" htmlFor="red-coloring-mode">
            <span id="change-coloring-mode-label">Change Coloring Mode</span>
          </Label>
          <Select defaultValue="highlight_solutions">
            <SelectTrigger id="red-coloring-mode" className="full-width" aria-labelledby="change-coloring-mode-label" aria-describedby="change-coloring-mode-help">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="highlight_solutions">Highlight Subtrees</SelectItem>
              <SelectItem value="subtree_tracking">Subtree Tracking</SelectItem>
            </SelectContent>
          </Select>
          <div id="change-coloring-mode-help" className="text-xs text-muted-foreground" style={{ marginTop: 4 }}>
            Highlight Subtrees: Shows accumulated changes<br />
            Subtree Tracking: Shows only moving elements
          </div>
        </div>

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
                defaultValue={TREE_COLOR_CATEGORIES.activeChangeEdgeColor || '#2196f3'}
                className="color-swatch"
                aria-labelledby="active-change-edges-label"
                onInput={async (e) => {
                  setActiveChangeEdgeColor(e.target.value);
                  try { await treeController?.renderAllElements?.(); } catch {}
                }}
              />
            </div>
              <div className="flex items-center gap-3">
              <Switch
                id="marked-components-toggle"
                aria-labelledby="marked-components-label"
                checked={!!marked}
                onCheckedChange={onToggleMarked}
              />
              <span id="marked-components-label" style={{ flex: 1 }}>Subtrees</span>
              <input
                type="color"
                id="marked-color"
                defaultValue={TREE_COLOR_CATEGORIES.markedColor || '#ff5722'}
                className="color-swatch"
                aria-labelledby="marked-components-label"
                onInput={async (e) => {
                  setMarkedColor(e.target.value);
                  try { await treeController?.renderAllElements?.(); } catch {}
                }}
              />
            </div>
            <label className="flex items-center gap-3">
              <span id="dimmed-elements-label" style={{ flex: 1 }}>Dimmed Elements</span>
              <input
                type="color"
                id="dimmed-color"
                defaultValue={TREE_COLOR_CATEGORIES.dimmedColor || '#cccccc'}
                className="color-swatch"
                aria-labelledby="dimmed-elements-label"
                onInput={async (e) => {
                  setDimmedColor(e.target.value);
                  try { await treeController?.renderAllElements?.(); } catch {}
                }}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ColoringPanel;
