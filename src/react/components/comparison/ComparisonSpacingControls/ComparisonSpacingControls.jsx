import React from 'react';
import { SidebarGroup, SidebarGroupLabel, SidebarGroupContent } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAppStore } from '../../../../js/core/store.js';
import { OffsetJoystick } from '../OffsetJoystick/OffsetJoystick.jsx';

const MAX_OFFSET = 1500;

export function ComparisonSpacingControls() {
  const comparisonMode = useAppStore((s) => s.comparisonMode);
  const viewOffsetX = useAppStore((s) => s.viewOffsetX);
  const viewOffsetY = useAppStore((s) => s.viewOffsetY);
  const setViewOffsetX = useAppStore((s) => s.setViewOffsetX);
  const setViewOffsetY = useAppStore((s) => s.setViewOffsetY);
  const treeControllers = useAppStore((s) => s.treeControllers);

  const viewOffsetXValue = Number(viewOffsetX) || 0;
  const viewOffsetYValue = Number(viewOffsetY) || 0;

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

  if (!comparisonMode) return null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Comparison Spacing</SidebarGroupLabel>
      <SidebarGroupContent>
        <div className="flex flex-col gap-3">
          <OffsetJoystick
            valueX={viewOffsetXValue}
            valueY={viewOffsetYValue}
            onChange={handleOffsetChange}
            maxOffset={MAX_OFFSET}
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
  );
}
