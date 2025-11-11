import React from 'react';
import { useAppStore } from '../../../../js/core/store.js';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

export function VisualStyle() {
  const fontSize = useAppStore((s) => s.fontSize);
  const strokeWidth = useAppStore((s) => s.strokeWidth);
  const nodeSize = useAppStore((s) => s.nodeSize);
  const setFontSize = useAppStore((s) => s.setFontSize);
  const setStrokeWidth = useAppStore((s) => s.setStrokeWidth);
  const setNodeSize = useAppStore((s) => s.setNodeSize);
  const treeControllers = useAppStore((s) => s.treeControllers);

  const fontSizeNumber = typeof fontSize === 'string' ? parseFloat(fontSize) : Number(fontSize || 1.8);

  return (
    <div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label title="Adjust label text size" aria-label="Label size control">
            <span id="font-size-label">Label Size</span>: <span id="font-size-value">{(fontSizeNumber || 1.8).toFixed(1)}em</span>
          </Label>
          <Slider
            id="font-size"
            min={0.5}
            max={10}
            step={0.1}
            value={[fontSizeNumber || 1.8]}
            aria-labelledby="font-size-label"
            onValueChange={(vals) => {
              const v = Array.isArray(vals) ? vals[0] : fontSizeNumber || 1.8;
              setFontSize(v);
            }}
            className="w-40"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label title="Adjust branch line width" aria-label="Branch width control">
            <span id="stroke-width-label">Branch Width</span>: <span id="stroke-width-value">{strokeWidth}</span>
          </Label>
          <Slider
            id="stroke-width"
            min={1}
            max={30}
            step={0.2}
            value={[Number(strokeWidth || 3)]}
            aria-labelledby="stroke-width-label"
            onValueChange={async (vals) => {
              const v = Array.isArray(vals) ? vals[0] : Number(strokeWidth || 2);
              setStrokeWidth(v);
              try {
                for (const controller of treeControllers) {
                  await controller?.renderAllElements?.();
                }
              } catch {}
            }}
            className="w-40"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label title="Adjust node size" aria-label="Node size control">
            <span id="node-size-label">Node Size</span>: <span id="node-size-value">{nodeSize || 1}</span>
          </Label>
          <Slider
            id="node-size"
            min={0.01}
            max={5}
            step={0.1}
            value={[Number(nodeSize || 1)]}
            aria-labelledby="node-size-label"
            onValueChange={async (vals) => {
              const v = Array.isArray(vals) ? vals[0] : Number(nodeSize || 1);
              setNodeSize(v);
              try {
                for (const controller of treeControllers) {
                  await controller?.renderAllElements?.();
                }
              } catch {}
            }}
            className="w-40"
          />
        </div>
      </div>
    </div>
  );
}

export default VisualStyle;
