import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { SidebarGroup, SidebarGroupLabel, SidebarGroupContent } from '@/components/ui/sidebar';

export function LayoutTransform({
  layoutAngleDegrees,
  setLayoutAngleDegrees,
  layoutRotationDegrees,
  setLayoutRotationDegrees,
  treeControllers,
}) {
  const renderControllers = async () => {
    try {
      for (const controller of treeControllers) {
        await controller?.renderAllElements?.();
      }
    } catch {}
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Layout Transform</SidebarGroupLabel>
      <SidebarGroupContent>
        <div className="flex flex-col gap-4">
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
                await renderControllers();
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
                await renderControllers();
              }}
              className="w-40"
            />
          </div>
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
