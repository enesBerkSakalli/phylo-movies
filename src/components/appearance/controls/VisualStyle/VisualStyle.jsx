import { useCallback, useMemo } from 'react';
import {
  selectActiveTreeList,
  selectBranchAnnotationLabelKey,
  selectFontSize,
  selectHyperbolicProjectionStrength,
  selectLabelsVisible,
  selectLayoutAngleDegrees,
  selectLayoutProjectionMode,
  selectLayoutRotationDegrees,
  selectNodeSize,
  selectSetHyperbolicProjectionStrength,
  selectSetBranchAnnotationLabelKey,
  selectSetCameraMode,
  selectSetFontSize,
  selectSetLabelsVisible,
  selectSetLayoutAngleDegrees,
  selectSetLayoutProjectionMode,
  selectSetLayoutRotationDegrees,
  selectSetNodeSize,
  selectSetStrokeWidth,
  selectStrokeWidth,
  selectTreeController,
  useAppStore,
} from '../../../../state/phyloStore/store.js';
import { getAvailableBranchAnnotationOptions } from '../../../../domain/tree/branchSupportIndex.js';
import { LAYOUT_PROJECTION_MODES } from '../../../../treeVisualisation/layout/hyperbolicProjection.js';
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
  return (
    <Collapsible asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip="Geometry and labels">
            <Circle className="text-primary" />
            <span>Geometry & Labels</span>
            <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <GeometryDimensionsContent />
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function GeometryDimensionsContent() {
  const nodeSize = useAppStore(selectNodeSize);
  const strokeWidth = useAppStore(selectStrokeWidth);
  const fontSize = useAppStore(selectFontSize);
  const setNodeSize = useAppStore(selectSetNodeSize);
  const setStrokeWidth = useAppStore(selectSetStrokeWidth);
  const setFontSize = useAppStore(selectSetFontSize);
  const treeController = useAppStore(selectTreeController);
  const activeTreeList = useAppStore(selectActiveTreeList);
  const labelsVisible = useAppStore(selectLabelsVisible);
  const setLabelsVisible = useAppStore(selectSetLabelsVisible);
  const branchAnnotationLabelKey = useAppStore(selectBranchAnnotationLabelKey);
  const setBranchAnnotationLabelKey = useAppStore(selectSetBranchAnnotationLabelKey);

  const fontSizeNumber = useMemo(() => toNumericFontSize(fontSize), [fontSize]);

  const handleToggleLabels = async (value) => {
    try {
      setLabelsVisible(!!value);
      await treeController?.renderAllElements({ skipAutoFit: true });
    } catch {}
  };

  const branchAnnotationOptions = useMemo(
    () => getAvailableBranchAnnotationOptions(activeTreeList),
    [activeTreeList]
  );

  const handleChangeBranchAnnotationLabelKey = async (valueKey) => {
    try {
      setBranchAnnotationLabelKey(valueKey);
      await treeController?.renderAllElements();
    } catch {}
  };

  return (
    <GeometryDimensions
      nodeSize={nodeSize}
      setNodeSize={setNodeSize}
      strokeWidth={strokeWidth}
      setStrokeWidth={setStrokeWidth}
      fontSizeNumber={fontSizeNumber}
      setFontSize={setFontSize}
      treeController={treeController}
      labelsVisible={labelsVisible}
      onToggleLabels={handleToggleLabels}
      branchAnnotationLabelKey={branchAnnotationLabelKey}
      branchAnnotationOptions={branchAnnotationOptions}
      onChangeBranchAnnotationLabelKey={handleChangeBranchAnnotationLabelKey}
    />
  );
}

export function LayoutTransformSection() {
  const layoutAngleDegrees = useAppStore(selectLayoutAngleDegrees);
  const setLayoutAngleDegrees = useAppStore(selectSetLayoutAngleDegrees);
  const layoutRotationDegrees = useAppStore(selectLayoutRotationDegrees);
  const setLayoutRotationDegrees = useAppStore(selectSetLayoutRotationDegrees);
  const layoutProjectionMode = useAppStore(selectLayoutProjectionMode);
  const setLayoutProjectionMode = useAppStore(selectSetLayoutProjectionMode);
  const hyperbolicProjectionStrength = useAppStore(selectHyperbolicProjectionStrength);
  const setHyperbolicProjectionStrength = useAppStore(selectSetHyperbolicProjectionStrength);
  const setCameraMode = useAppStore(selectSetCameraMode);
  const treeController = useAppStore(selectTreeController);

  const handleSetLayoutProjectionMode = useCallback(
    (mode) => {
      setLayoutProjectionMode(mode);
      if (mode !== LAYOUT_PROJECTION_MODES.WALRUS_3D) return;

      setCameraMode?.('orbit');
      treeController?.setCameraMode?.('orbit');
    },
    [setCameraMode, setLayoutProjectionMode, treeController]
  );

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
            layoutProjectionMode={layoutProjectionMode}
            setLayoutProjectionMode={handleSetLayoutProjectionMode}
            hyperbolicProjectionStrength={hyperbolicProjectionStrength}
            setHyperbolicProjectionStrength={setHyperbolicProjectionStrength}
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
