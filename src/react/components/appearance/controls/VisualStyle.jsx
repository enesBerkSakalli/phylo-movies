import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../../../js/core/store.js';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { SidebarGroup, SidebarGroupLabel, SidebarGroupContent } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

function OffsetJoystick({ valueX, valueY, onChange, maxOffset = 500 }) {
  const padRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
  const radius = 70;

  const handleMove = (clientX, clientY, commit = false) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const clampedX = clamp(dx, -radius, radius);
    const clampedY = clamp(dy, -radius, radius);
    const newX = Math.round((clampedX / radius) * maxOffset);
    const newY = Math.round((clampedY / radius) * maxOffset);
    onChange(newX, newY, commit);
  };

  useEffect(() => {
    if (!isDragging) return;
    const handlePointerMove = (e) => handleMove(e.clientX, e.clientY);
    const handlePointerUp = (e) => {
      handleMove(e.clientX, e.clientY, true);
      setIsDragging(false);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  const indicatorX = clamp((valueX / maxOffset) * radius, -radius, radius);
  const indicatorY = clamp((valueY / maxOffset) * radius, -radius, radius);

  return (
    <div className="flex flex-col gap-2">
      <Label>Tree Spacing (X/Y)</Label>
      <div
        ref={padRef}
        className="relative h-[160px] w-[160px] rounded-lg border border-border bg-muted/40"
        onPointerDown={(e) => {
          setIsDragging(true);
          handleMove(e.clientX, e.clientY);
        }}
        role="slider"
        aria-label="Tree spacing joystick"
        aria-valuetext={`X ${valueX}, Y ${valueY}`}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-px w-full bg-border" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center rotate-90">
          <div className="h-px w-full bg-border" />
        </div>
        <div
          className="absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow"
          style={{
            left: `${80 + indicatorX}px`,
            top: `${80 + indicatorY}px`,
            transition: isDragging ? 'none' : 'transform 120ms ease'
          }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>X: {valueX}</span>
        <span>Y: {valueY}</span>
      </div>
    </div>
  );
}

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
  const maxOffset = 1500;

  const renderControllers = async () => {
    try {
      for (const controller of treeControllers) {
        await controller?.renderAllElements?.();
      }
    } catch {}
  };

  const handleOffsetChange = async (x, y, commit = false) => {
    setViewOffsetX(x);
    setViewOffsetY(y);
    if (commit) {
      await renderControllers();
    }
  };

  return (
    <div>
      <SidebarGroup>
        <SidebarGroupLabel>Tree Elements</SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="flex flex-col gap-4">
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
        </div>
        </SidebarGroupContent>
      </SidebarGroup>

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
        </div>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Comparison Spacing</SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="flex flex-col gap-3">
            <OffsetJoystick
              valueX={viewOffsetXValue}
              valueY={viewOffsetYValue}
              onChange={handleOffsetChange}
              maxOffset={maxOffset}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await handleOffsetChange(0, 0, true);
                }}
              >
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await renderControllers();
                }}
              >
                Re-center view
              </Button>
            </div>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    </div>
  );
}

export default VisualStyle;
