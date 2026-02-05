import React, { useCallback, useRef } from 'react';
import { LabeledSlider } from '@/components/ui/labeled-slider';
import { SidebarMenuSub, SidebarMenuSubItem } from '@/components/ui/sidebar';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Info } from 'lucide-react';

const clampValue = (value, fallback) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export function GeometryDimensions({
  nodeSize,
  setNodeSize,
  strokeWidth,
  setStrokeWidth,
  fontSizeNumber,
  setFontSize,
  treeControllers,
  labelsVisible,
  onToggleLabels,
}) {
  const isRenderingRef = useRef(false);

  const renderControllers = useCallback(async () => {
    if (isRenderingRef.current) return;
    isRenderingRef.current = true;
    try {
      for (const controller of treeControllers) {
        await controller?.renderAllElements?.();
      }
    } catch {}
    finally {
      isRenderingRef.current = false;
    }
  }, [treeControllers]);

  const handleNodeSizeChange = useCallback((vals) => {
    const nextValue = clampValue(Array.isArray(vals) ? vals[0] : null, nodeSize ?? 1);
    if (nextValue !== nodeSize) {
      setNodeSize(nextValue);
      renderControllers();
    }
  }, [nodeSize, setNodeSize, renderControllers]);

  const handleStrokeWidthChange = useCallback((vals) => {
    const nextValue = clampValue(Array.isArray(vals) ? vals[0] : null, strokeWidth ?? 1);
    if (nextValue !== strokeWidth) {
      setStrokeWidth(nextValue);
      renderControllers();
    }
  }, [strokeWidth, setStrokeWidth, renderControllers]);

  const handleFontSizeChange = useCallback((vals) => {
    const nextValue = clampValue(Array.isArray(vals) ? vals[0] : null, fontSizeNumber ?? 1.8);
    if (nextValue !== fontSizeNumber) {
      setFontSize(nextValue);
    }
  }, [fontSizeNumber, setFontSize]);

  return (
    <SidebarMenuSub>
      <SidebarMenuSubItem>
        <div className="flex flex-col gap-4 px-1 py-2">
          <LabeledSlider
            id="node-size"
            label="Node Size"
            title="Adjust node size"
            ariaLabel="Node size control"
            valueDisplay={clampValue(nodeSize, 1).toFixed(2)}
            value={clampValue(nodeSize, 1)}
            min={0.05}
            max={5}
            step={0.05}
            onChange={handleNodeSizeChange}
          />

          <LabeledSlider
            id="stroke-width"
            label="Branch Width"
            title="Adjust branch line width (scales with magnitude)"
            ariaLabel="Branch width control (scales with magnitude)"
            valueDisplay={clampValue(strokeWidth, 1).toFixed(1)}
            value={clampValue(strokeWidth, 1)}
            min={0.1}
            max={5}
            step={0.1}
            onChange={handleStrokeWidthChange}
          />

          <LabeledSlider
            id="font-size"
            label="Label Size"
            title="Adjust label text size (scales with magnitude)"
            ariaLabel="Label size control (scales with magnitude)"
            valueDisplay={`${clampValue(fontSizeNumber, 1.8).toFixed(1)}em`}
            value={clampValue(fontSizeNumber, 1.8)}
            min={0.5}
            max={10}
            step={0.1}
            onChange={handleFontSizeChange}
          />

          <div className="text-2xs leading-relaxed text-muted-foreground/80 italic mt-2">
            Line widths and label sizes scale with magnitude to stay proportional to the tree.
          </div>

          <div className="border-t border-border/20 pt-4 mt-2">
            <div className="flex items-center justify-between mb-3">
              <Label htmlFor="labels-toggle" className="text-xs font-medium text-foreground/80">Show Labels</Label>
              <Switch
                id="labels-toggle"
                checked={labelsVisible}
                onCheckedChange={onToggleLabels}
              />
            </div>
            <div className="flex items-start gap-2 text-2xs text-muted-foreground/80 italic leading-relaxed">
              <Info className="size-3 shrink-0 mt-0.5" />
              <span>When hidden, labels are replaced with dots at leaf positions.</span>
            </div>
          </div>
        </div>
      </SidebarMenuSubItem>
    </SidebarMenuSub>
  );
}

export default GeometryDimensions;
