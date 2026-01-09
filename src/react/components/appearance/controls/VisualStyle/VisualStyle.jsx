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

  const fontSizeNumber = useMemo(() => toNumericFontSize(fontSize), [fontSize]);

  return (
    <>
      {/* Section 1: Geometry Dimensions */}
      <Collapsible defaultOpen asChild className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip="Geometry Dimensions">
              <Circle className="text-primary" />
              <span>Geometry Dimensions</span>
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

      {/* Section 2: Layout Transform */}
      <Collapsible defaultOpen asChild className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip="Layout Transform">
              <RotateCw className="text-primary" />
              <span>Layout Transform</span>
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
    </>
  );
}

export default VisualStyle;
