import React, { useCallback, useRef } from 'react';
import { LabeledSlider } from '@/components/ui/labeled-slider';
import { SidebarMenuSub, SidebarMenuSubItem } from '@/components/ui/sidebar';
import {  Compass } from 'lucide-react';

export function LayoutTransform({
  layoutAngleDegrees,
  setLayoutAngleDegrees,
  layoutRotationDegrees,
  setLayoutRotationDegrees,
  treeControllers,
}) {
  const isRenderingRef = useRef(false);

  const renderControllers = useCallback(async () => {
    if (isRenderingRef.current) return;
    isRenderingRef.current = true;
    try {
      for (const controller of treeControllers ?? []) {
        await controller?.renderAllElements?.();
      }
    } catch { }
    finally {
      isRenderingRef.current = false;
    }
  }, [treeControllers]);

  const handleAngleChange = useCallback((vals) => {
    const v = Array.isArray(vals) ? vals[0] : 360;
    setLayoutAngleDegrees(v);
    renderControllers();
  }, [setLayoutAngleDegrees, renderControllers]);

  const handleRotationChange = useCallback((vals) => {
    const v = Array.isArray(vals) ? vals[0] : 0;
    setLayoutRotationDegrees(v);
    renderControllers();
  }, [setLayoutRotationDegrees, renderControllers]);

  return (
    <SidebarMenuSub>
      <SidebarMenuSubItem>
        <div className="flex flex-col gap-6 px-1 py-3">
          <LabeledSlider
            id="layout-angle"
            label="Layout Angle"
            title="Angular span for radial layout"
            ariaLabel="Layout angle control"
            valueDisplay={`${layoutAngleDegrees || 360}°`}
            value={Number(layoutAngleDegrees || 360)}
            min={90}
            max={360}
            step={10}
            onChange={handleAngleChange}
          />

          <LabeledSlider
            id="layout-rotation"
            label="Rotation"
            title="Rotate the radial layout"
            ariaLabel="Layout rotation control"
            valueDisplay={`${layoutRotationDegrees || 0}°`}
            value={Number(layoutRotationDegrees || 0)}
            min={0}
            max={360}
            step={5}
            onChange={handleRotationChange}
          />

          <div className="flex items-start gap-2 text-[10px] text-muted-foreground/80 italic">
            <Compass className="size-3 shrink-0 mt-0.5" />
            <span>Angle affects the spread of branches, while rotation pivots the entire tree.</span>
          </div>
        </div>
      </SidebarMenuSubItem>
    </SidebarMenuSub>
  );
}

export default LayoutTransform;

