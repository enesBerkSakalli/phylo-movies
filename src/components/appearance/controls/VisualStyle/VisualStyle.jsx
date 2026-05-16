import { useMemo } from 'react';
import {
  selectFontSize,
  selectLabelsVisible,
  selectLayoutAngleDegrees,
  selectLayoutRotationDegrees,
  selectNodeSize,
  selectSetFontSize,
  selectSetLabelsVisible,
  selectSetLayoutAngleDegrees,
  selectSetLayoutRotationDegrees,
  selectSetNodeSize,
  selectSetStrokeWidth,
  selectStrokeWidth,
  selectTreeControllers,
  useAppStore
} from '../../../../state/phyloStore/store.js';
import { SidebarMenuItem, SidebarMenuButton } from '../../../ui/sidebar';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../../../ui/collapsible';
import { ChevronDown, Circle, RotateCw } from 'lucide-react';

import { LayoutTransform } from '../../layout/LayoutTransform/LayoutTransform.jsx';
import { GeometryDimensions } from '../GeometryDimensions/GeometryDimensions.jsx';

const toNumericFontSize = (size) => {
  const parsed = typeof size === 'string' ? parseFloat(size) : Number(size);
  return Number.isFinite(parsed) ? parsed : 1.8;
};

export function GeometryDimensionsSection() {
  const nodeSize = useAppStore(selectNodeSize);
  const strokeWidth = useAppStore(selectStrokeWidth);
  const fontSize = useAppStore(selectFontSize);
  const setNodeSize = useAppStore(selectSetNodeSize);
  const setStrokeWidth = useAppStore(selectSetStrokeWidth);
  const setFontSize = useAppStore(selectSetFontSize);
  const treeControllers = useAppStore(selectTreeControllers);
  const labelsVisible = useAppStore(selectLabelsVisible);
  const setLabelsVisible = useAppStore(selectSetLabelsVisible);

  const fontSizeNumber = useMemo(() => toNumericFontSize(fontSize), [fontSize]);

  const handleToggleLabels = async (value) => {
    try { 
      setLabelsVisible(!!value); 
      for (const controller of treeControllers) {
        await controller.renderAllElements();
      }
    } catch { }
  };

  return (
    <Collapsible asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip="Display Sizes">
            <Circle className="text-primary" />
            <span>Display Sizes</span>
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
            labelsVisible={labelsVisible}
            onToggleLabels={handleToggleLabels}
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

  return (
    <Collapsible asChild className="group/collapsible">
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
