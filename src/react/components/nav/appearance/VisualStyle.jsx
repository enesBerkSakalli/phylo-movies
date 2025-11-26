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
  const layoutAngleDegrees = useAppStore((s) => s.layoutAngleDegrees);
  const setLayoutAngleDegrees = useAppStore((s) => s.setLayoutAngleDegrees);
  const layoutRotationDegrees = useAppStore((s) => s.layoutRotationDegrees);
  const setLayoutRotationDegrees = useAppStore((s) => s.setLayoutRotationDegrees);
  const viewOffsetX = useAppStore((s) => s.viewOffsetX);
  const viewOffsetY = useAppStore((s) => s.viewOffsetY);
  const setViewOffsetX = useAppStore((s) => s.setViewOffsetX);
  const setViewOffsetY = useAppStore((s) => s.setViewOffsetY);
  const treeControllers = useAppStore((s) => s.treeControllers);

  const fontSizeNumber = typeof fontSize === 'string' ? parseFloat(fontSize) : Number(fontSize || 1.8);
  const viewOffsetXValue = Number(viewOffsetX) || 0;
  const viewOffsetYValue = Number(viewOffsetY) || 0;

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
          <Label title="Angular span for radial layout" aria-label="Layout angle control">
            <span id="layout-angle-label">Layout Angle</span>: <span id="layout-angle-value">{layoutAngleDegrees || 360}°</span>
          </Label>
          <Slider
            id="layout-angle"
            min={90}
            max={360}
            step={10}
            value={[Number(layoutAngleDegrees || 360)]}
            aria-labelledby="layout-angle-label"
            onValueChange={async (vals) => {
              const v = Array.isArray(vals) ? vals[0] : Number(layoutAngleDegrees || 360);
              setLayoutAngleDegrees(v);
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
          <Label title="Rotate the radial layout" aria-label="Layout rotation control">
            <span id="layout-rotation-label">Rotation</span>: <span id="layout-rotation-value">{layoutRotationDegrees || 0}°</span>
          </Label>
          <Slider
            id="layout-rotation"
            min={0}
            max={360}
            step={5}
            value={[Number(layoutRotationDegrees || 0)]}
            aria-labelledby="layout-rotation-label"
            onValueChange={async (vals) => {
              const v = Array.isArray(vals) ? vals[0] : Number(layoutRotationDegrees || 0);
              setLayoutRotationDegrees(v);
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
          <Label title="Adjust spacing between trees horizontally in comparison view" aria-label="Horizontal offset control">
            <span id="view-offset-x-label">Tree Spacing X</span>: <span id="view-offset-x-value">{viewOffsetXValue}</span>
          </Label>
          <Slider
            id="view-offset-x"
            min={-500}
            max={500}
            step={5}
            value={[viewOffsetXValue]}
            aria-labelledby="view-offset-x-label"
            onValueChange={async (vals) => {
              const v = Array.isArray(vals) ? vals[0] : viewOffsetXValue;
              setViewOffsetX(v);
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
          <Label title="Adjust vertical separation between trees in comparison view" aria-label="Vertical offset control">
            <span id="view-offset-y-label">Tree Spacing Y</span>: <span id="view-offset-y-value">{viewOffsetYValue}</span>
          </Label>
          <Slider
            id="view-offset-y"
            min={-500}
            max={500}
            step={5}
            value={[viewOffsetYValue]}
            aria-labelledby="view-offset-y-label"
            onValueChange={async (vals) => {
              const v = Array.isArray(vals) ? vals[0] : viewOffsetYValue;
              setViewOffsetY(v);
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
