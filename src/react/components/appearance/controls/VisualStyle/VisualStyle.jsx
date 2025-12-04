import React from 'react';
import { useAppStore } from '../../../../../js/core/store.js';
import { SidebarGroup, SidebarGroupLabel, SidebarGroupContent } from '@/components/ui/sidebar';
import { ComparisonSpacingControls } from '../../../comparison/ComparisonSpacingControls/ComparisonSpacingControls.jsx';
import { LayoutTransform } from '../../layout/LayoutTransform/LayoutTransform.jsx';
import { TreeElements } from '../TreeElements/TreeElements.jsx';

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
  const treeControllers = useAppStore((s) => s.treeControllers);

  const fontSizeNumber = typeof fontSize === 'string' ? parseFloat(fontSize) : Number(fontSize || 1.8);

  const renderControllers = async () => {
    try {
      for (const controller of treeControllers) {
        await controller?.renderAllElements?.();
      }
    } catch {}
  };

  return (
    <div>
      <SidebarGroup>
        <SidebarGroupLabel>Tree Elements</SidebarGroupLabel>
        <SidebarGroupContent>
          <TreeElements
            nodeSize={nodeSize}
            setNodeSize={setNodeSize}
            strokeWidth={strokeWidth}
            setStrokeWidth={setStrokeWidth}
            fontSizeNumber={fontSizeNumber}
            setFontSize={setFontSize}
            treeControllers={treeControllers}
          />
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Layout Transform</SidebarGroupLabel>
        <SidebarGroupContent>
          <LayoutTransform
            layoutAngleDegrees={layoutAngleDegrees}
            setLayoutAngleDegrees={setLayoutAngleDegrees}
            layoutRotationDegrees={layoutRotationDegrees}
            setLayoutRotationDegrees={setLayoutRotationDegrees}
            treeControllers={treeControllers}
          />
        </SidebarGroupContent>
      </SidebarGroup>

      <ComparisonSpacingControls />
    </div>
  );
}

export default VisualStyle;
