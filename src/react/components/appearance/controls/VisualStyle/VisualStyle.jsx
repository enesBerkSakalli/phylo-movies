import { useMemo } from 'react';
import { useAppStore } from '../../../../../js/core/store.js';
import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown, Circle, RotateCw } from 'lucide-react';

import { LayoutTransform } from '../../layout/LayoutTransform/LayoutTransform.jsx';
import { GeometryDimensions } from '../GeometryDimensions/GeometryDimensions.jsx';

const toNumericFontSize = (size) => {
  const parsed = typeof size === 'string' ? parseFloat(size) : Number(size);
  return Number.isFinite(parsed) ? parsed : 1.8;
};

// ==========================================================================
// STORE SELECTORS
// ==========================================================================
const selectFontSize = (s) => s.fontSize;
const selectStrokeWidth = (s) => s.strokeWidth;
const selectNodeSize = (s) => s.nodeSize;
const selectSetFontSize = (s) => s.setFontSize;
const selectSetStrokeWidth = (s) => s.setStrokeWidth;
const selectSetNodeSize = (s) => s.setNodeSize;
const selectLayoutAngleDegrees = (s) => s.layoutAngleDegrees;
const selectSetLayoutAngleDegrees = (s) => s.setLayoutAngleDegrees;
const selectLayoutRotationDegrees = (s) => s.layoutRotationDegrees;
const selectSetLayoutRotationDegrees = (s) => s.setLayoutRotationDegrees;
const selectTreeControllers = (s) => s.treeControllers;

export function GeometryDimensionsSection() {
  const nodeSize = useAppStore(selectNodeSize);
  const strokeWidth = useAppStore(selectStrokeWidth);
  const fontSize = useAppStore(selectFontSize);
  const setNodeSize = useAppStore(selectSetNodeSize);
  const setStrokeWidth = useAppStore(selectSetStrokeWidth);
  const setFontSize = useAppStore(selectSetFontSize);
  const treeControllers = useAppStore(selectTreeControllers);

  const fontSizeNumber = useMemo(() => toNumericFontSize(fontSize), [fontSize]);

  return (
    <Collapsible defaultOpen asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip="Element Sizes">
            <Circle className="text-primary" />
            <span>Element Sizes</span>
            <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <GeometryDimensions
            nodeSize={nodeSize}
            setNodeSize={setNodeSize}
            strokeWidth={strokeWidth}
            setStrokeWidth={setStrokeWidth}
            fontSizeNumber={fontSizeNumber}
            setFontSize={setFontSize}
            treeControllers={treeControllers}
          />
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function LayoutTransformSection() {
  const layoutAngleDegrees = useAppStore(selectLayoutAngleDegrees);
  const setLayoutAngleDegrees = useAppStore(selectSetLayoutAngleDegrees);
  const layoutRotationDegrees = useAppStore(selectLayoutRotationDegrees);
  const setLayoutRotationDegrees = useAppStore(selectSetLayoutRotationDegrees);
  const treeControllers = useAppStore(selectTreeControllers);

  return (
    <Collapsible defaultOpen asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip="Tree Layout">
            <RotateCw className="text-primary" />
            <span>Tree Layout</span>
            <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <LayoutTransform
            layoutAngleDegrees={layoutAngleDegrees}
            setLayoutAngleDegrees={setLayoutAngleDegrees}
            layoutRotationDegrees={layoutRotationDegrees}
            setLayoutRotationDegrees={setLayoutRotationDegrees}
            treeControllers={treeControllers}
          />
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function VisualStyle() {
  return (
    <>
      <GeometryDimensionsSection />
      <LayoutTransformSection />
    </>
  );
}

export default VisualStyle;
