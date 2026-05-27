import React from 'react';
import {
  selectChangePulseEnabled,
  selectConnectorStrokeWidth,
  selectDimmingEnabled,
  selectDimmingOpacity,
  selectLinkConnectionOpacity,
  selectPivotEdgeDashingEnabled,
  selectSetChangePulseEnabled,
  selectSetConnectorStrokeWidth,
  selectSetDimmingEnabled,
  selectSetDimmingOpacity,
  selectSetLinkConnectionOpacity,
  selectSetPivotEdgeDashingEnabled,
  selectSetSubtreeDimmingEnabled,
  selectSetSubtreeDimmingOpacity,
  selectSetUpcomingChangesEnabled,
  selectSubtreeDimmingEnabled,
  selectSubtreeDimmingOpacity,
  selectTreeControllers,
  selectUpcomingChangesEnabled,
  useAppStore,
} from '../../state/phyloStore/store.js';

import { Slider } from '../ui/slider';
import { Label } from '../ui/label';
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from '../ui/sidebar';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../ui/collapsible';
import { ChevronDown, Link } from 'lucide-react';
import { FocusHighlightingSection } from './FocusHighlightingSection';
import { PivotEdgeEffectsSection } from './PivotEdgeEffectsSection';

export function FocusAndChangeEffects() {
  const dimming = useAppStore(selectDimmingEnabled);
  const dimmingOpacity = useAppStore(selectDimmingOpacity);
  const subtreeDimming = useAppStore(selectSubtreeDimmingEnabled);
  const subtreeDimmingOpacity = useAppStore(selectSubtreeDimmingOpacity);
  const linkConnectionOpacity = useAppStore(selectLinkConnectionOpacity);
  const connectorStrokeWidth = useAppStore(selectConnectorStrokeWidth);
  const pulseEnabled = useAppStore(selectChangePulseEnabled);
  const dashingEnabled = useAppStore(selectPivotEdgeDashingEnabled);
  const upcomingChangesEnabled = useAppStore(selectUpcomingChangesEnabled);
  const treeControllers = useAppStore(selectTreeControllers);

  const setDimmingEnabled = useAppStore(selectSetDimmingEnabled);
  const setDimmingOpacity = useAppStore(selectSetDimmingOpacity);
  const setSubtreeDimmingEnabled = useAppStore(selectSetSubtreeDimmingEnabled);
  const setSubtreeDimmingOpacity = useAppStore(selectSetSubtreeDimmingOpacity);
  const setLinkConnectionOpacity = useAppStore(selectSetLinkConnectionOpacity);
  const setConnectorStrokeWidth = useAppStore(selectSetConnectorStrokeWidth);
  const setPulseEnabled = useAppStore(selectSetChangePulseEnabled);
  const setDashingEnabled = useAppStore(selectSetPivotEdgeDashingEnabled);
  const setUpcomingChangesEnabled = useAppStore(selectSetUpcomingChangesEnabled);

  const rerenderAll = async () => {
    for (const controller of treeControllers) {
      await controller.renderAllElements();
    }
  };

  const rerenderAfter = async (applyValue) => {
    applyValue();
    await rerenderAll();
  };

  const toggleDimming = (value) => rerenderAfter(() => setDimmingEnabled(!!value));
  const handleDimmingOpacityChange = (value) => rerenderAfter(() => setDimmingOpacity(value[0]));
  const toggleSubtreeDimming = (value) => rerenderAfter(() => setSubtreeDimmingEnabled(!!value));
  const handleSubtreeDimmingOpacityChange = (value) =>
    rerenderAfter(() => setSubtreeDimmingOpacity(value[0]));
  const handleLinkOpacityChange = (value) =>
    rerenderAfter(() => setLinkConnectionOpacity(value[0]));
  const handleConnectorStrokeWidthChange = (value) =>
    rerenderAfter(() => setConnectorStrokeWidth(value[0]));

  const togglePulse = (value) => setPulseEnabled(!!value);
  const toggleDashing = (value) => setDashingEnabled(!!value);
  const toggleUpcomingChanges = (value) => setUpcomingChangesEnabled(!!value);

  return (
    <>
      <FocusHighlightingSection
        dimming={dimming}
        dimmingOpacity={dimmingOpacity}
        subtreeDimming={subtreeDimming}
        subtreeDimmingOpacity={subtreeDimmingOpacity}
        onToggleDimming={toggleDimming}
        onDimmingOpacityChange={handleDimmingOpacityChange}
        onToggleSubtreeDimming={toggleSubtreeDimming}
        onSubtreeDimmingOpacityChange={handleSubtreeDimmingOpacityChange}
      />

      <PivotEdgeEffectsSection
        pulseEnabled={pulseEnabled}
        dashingEnabled={dashingEnabled}
        upcomingChangesEnabled={upcomingChangesEnabled}
        onTogglePulse={togglePulse}
        onToggleDashing={toggleDashing}
        onToggleUpcomingChanges={toggleUpcomingChanges}
      />
      <GroupConnectorsSection
        linkConnectionOpacity={linkConnectionOpacity}
        connectorStrokeWidth={connectorStrokeWidth}
        onLinkOpacityChange={handleLinkOpacityChange}
        onConnectorStrokeWidthChange={handleConnectorStrokeWidthChange}
      />
    </>
  );
}

export function GroupConnectorsSection({
  linkConnectionOpacity,
  connectorStrokeWidth,
  onLinkOpacityChange,
  onConnectorStrokeWidthChange,
}) {
  return (
    <Collapsible asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip="Group Connectors">
            <Link className="text-primary" />
            <span>Group Connectors</span>
            <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            <SidebarMenuSubItem>
              <div className="px-1 py-3">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-1">
                    <Label
                      htmlFor="connector-opacity-slider"
                      className="text-xs font-medium text-foreground/80"
                    >
                      Connector Opacity
                    </Label>
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">
                      {Math.round((linkConnectionOpacity ?? 0.6) * 100)}%
                    </span>
                  </div>
                  <Slider
                    id="connector-opacity-slider"
                    min={0}
                    max={1}
                    step={0.05}
                    value={[linkConnectionOpacity ?? 0.6]}
                    onValueChange={onLinkOpacityChange}
                    className="w-full py-1"
                  />

                  <div className="flex items-center justify-between px-1 mt-2">
                    <Label
                      htmlFor="connector-stroke-width-slider"
                      className="text-xs font-medium text-foreground/80"
                    >
                      Connector Width
                    </Label>
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">
                      {connectorStrokeWidth ?? 1}px
                    </span>
                  </div>
                  <Slider
                    id="connector-stroke-width-slider"
                    min={0.5}
                    max={10}
                    step={0.5}
                    value={[connectorStrokeWidth ?? 1]}
                    onValueChange={onConnectorStrokeWidthChange}
                    className="w-full py-1"
                  />
                </div>
              </div>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
