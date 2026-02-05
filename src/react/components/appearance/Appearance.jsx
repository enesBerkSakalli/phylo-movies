import React from 'react';
import { useAppStore } from '../../../js/core/store.js';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown, Link, Box, Info } from 'lucide-react';
import { FocusHighlightingSection } from './FocusHighlightingSection';
import { PivotEdgeEffectsSection } from './PivotEdgeEffectsSection';
import { Switch } from '@/components/ui/switch';

// ==========================================================================
// STORE SELECTORS
// ==========================================================================

const selectDimming = (s) => s.dimmingEnabled;
const selectDimmingOpacity = (s) => s.dimmingOpacity;
const selectSetDimmingEnabled = (s) => s.setDimmingEnabled;
const selectSetDimmingOpacity = (s) => s.setDimmingOpacity;
const selectSubtreeDimming = (s) => s.subtreeDimmingEnabled;
const selectSubtreeDimmingOpacity = (s) => s.subtreeDimmingOpacity;
const selectSetSubtreeDimmingEnabled = (s) => s.setSubtreeDimmingEnabled;
const selectSetSubtreeDimmingOpacity = (s) => s.setSubtreeDimmingOpacity;
const selectLinkConnectionOpacity = (s) => s.linkConnectionOpacity;
const selectSetLinkConnectionOpacity = (s) => s.setLinkConnectionOpacity;
const selectConnectorStrokeWidth = (s) => s.connectorStrokeWidth;
const selectSetConnectorStrokeWidth = (s) => s.setConnectorStrokeWidth;
const selectPulseEnabled = (s) => s.changePulseEnabled;
const selectSetPulseEnabled = (s) => s.setChangePulseEnabled;
const selectDashingEnabled = (s) => s.pivotEdgeDashingEnabled;
const selectSetDashingEnabled = (s) => s.setPivotEdgeDashingEnabled;
const selectUpcomingChangesEnabled = (s) => s.upcomingChangesEnabled;
const selectSetUpcomingChangesEnabled = (s) => s.setUpcomingChangesEnabled;
const selectTreeControllers = (s) => s.treeControllers;
const selectCameraMode = (s) => s.cameraMode;
const selectToggleCameraMode = (s) => s.toggleCameraMode;


// ==========================================================================
// COMPONENT
// ==========================================================================

export function PerspectiveSection({ cameraMode, toggleCameraMode, treeControllers }) {
  return (
    <Collapsible defaultOpen asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip="Perspective">
            <Box className="text-primary" />
            <span>View Projection</span>
            <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            <SidebarMenuSubItem>
              <div className="px-2 py-3">
                <Button
                  id="camera-mode-button"
                  className="w-full text-xs h-9"
                  variant="outline"
                  onClick={() => {
                    try {
                      const newMode = toggleCameraMode();
                      treeControllers.forEach(c => c?.setCameraMode?.(newMode));
                    } catch { }
                  }}
                >
                  <span id="camera-mode-text">{cameraMode === 'orbit' ? 'Switch to 2D' : 'Switch to 3D'}</span>
                </Button>
                <div className="flex items-start gap-2 text-2xs text-muted-foreground/80 italic mt-3 leading-relaxed">
                  <Info className="size-3 shrink-0 mt-1" />
                  <span>Toggle between flat 2D and interactive 3D camera for tree visualization.</span>
                </div>
              </div>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function Appearance() {
  const dimming = useAppStore(selectDimming);
  const dimmingOpacity = useAppStore(selectDimmingOpacity);
  const subtreeDimming = useAppStore(selectSubtreeDimming);
  const subtreeDimmingOpacity = useAppStore(selectSubtreeDimmingOpacity);
  const linkConnectionOpacity = useAppStore(selectLinkConnectionOpacity);
  const connectorStrokeWidth = useAppStore(selectConnectorStrokeWidth);
  const pulseEnabled = useAppStore(selectPulseEnabled);
  const dashingEnabled = useAppStore(selectDashingEnabled);
  const upcomingChangesEnabled = useAppStore(selectUpcomingChangesEnabled);
  const treeControllers = useAppStore(selectTreeControllers);
  const cameraMode = useAppStore(selectCameraMode);
  const toggleCameraMode = useAppStore(selectToggleCameraMode);

  // Setter functions - retrieve from store
  const setDimmingEnabled = useAppStore(selectSetDimmingEnabled);
  const setDimmingOpacity = useAppStore(selectSetDimmingOpacity);
  const setSubtreeDimmingEnabled = useAppStore(selectSetSubtreeDimmingEnabled);
  const setSubtreeDimmingOpacity = useAppStore(selectSetSubtreeDimmingOpacity);
  const setLinkConnectionOpacity = useAppStore(selectSetLinkConnectionOpacity);
  const setConnectorStrokeWidth = useAppStore(selectSetConnectorStrokeWidth);
  const setPulseEnabled = useAppStore(selectSetPulseEnabled);
  const setDashingEnabled = useAppStore(selectSetDashingEnabled);
  const setUpcomingChangesEnabled = useAppStore(selectSetUpcomingChangesEnabled);

  const rerenderAll = async () => {
    for (const controller of treeControllers) {
      await controller?.renderAllElements?.();
    }
  };

  const toggleDimming = async (value) => {
    try { setDimmingEnabled(!!value); await rerenderAll(); } catch { }
  };
  const handleDimmingOpacityChange = async (value) => {
    try { setDimmingOpacity(value[0]); await rerenderAll(); } catch { }
  };
  const toggleSubtreeDimming = async (value) => {
    try { setSubtreeDimmingEnabled(!!value); await rerenderAll(); } catch { }
  };
  const handleSubtreeDimmingOpacityChange = async (value) => {
    try { setSubtreeDimmingOpacity(value[0]); await rerenderAll(); } catch { }
  };
  const handleLinkOpacityChange = async (value) => {
    try { setLinkConnectionOpacity(value[0]); await rerenderAll(); } catch { }
  };
  const handleConnectorStrokeWidthChange = async (value) => {
    try { setConnectorStrokeWidth(value[0]); await rerenderAll(); } catch { }
  };

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
      <ConnectionsSection
        linkConnectionOpacity={linkConnectionOpacity}
        connectorStrokeWidth={connectorStrokeWidth}
        onLinkOpacityChange={handleLinkOpacityChange}
        onConnectorStrokeWidthChange={handleConnectorStrokeWidthChange}
      />
      <PerspectiveSection
        cameraMode={cameraMode}
        toggleCameraMode={toggleCameraMode}
        treeControllers={treeControllers}
      />
    </>
  );
}


// ==========================================================================
// SUB-COMPONENTS
// ==========================================================================

export function LabelsSection({ labelsVisible, onToggleLabels }) {
  return (
    <Collapsible defaultOpen asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip="Labels">
            <Tag className="text-primary" />
            <span>Taxa Labels</span>
            <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            <SidebarMenuSubItem>
              <div className="px-2 py-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="labels-toggle" className="text-xs font-medium text-foreground/80">Show Labels</Label>
                  <Switch
                    id="labels-toggle"
                    checked={labelsVisible}
                    onCheckedChange={onToggleLabels}
                  />
                </div>
                <div className="flex items-start gap-2 text-2xs text-muted-foreground/80 italic mt-3 leading-relaxed">
                  <Info className="size-3 shrink-0 mt-1" />
                  <span>When hidden, labels are replaced with dots at leaf positions.</span>
                </div>
              </div>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function ConnectionsSection({ linkConnectionOpacity, connectorStrokeWidth, onLinkOpacityChange, onConnectorStrokeWidthChange }) {
  return (
    <Collapsible defaultOpen asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip="Connecting Lines">
            <Link className="text-primary" />
            <span>Connecting Lines</span>
            <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            <SidebarMenuSubItem>
              <div className="px-1 py-3">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-1">
                    <Label htmlFor="connector-opacity-slider" className="text-xs font-medium text-foreground/80">Connector Opacity</Label>
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">{Math.round((linkConnectionOpacity ?? 0.6) * 100)}%</span>
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
                    <Label htmlFor="connector-stroke-width-slider" className="text-xs font-medium text-foreground/80">Connector Width</Label>
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">{connectorStrokeWidth ?? 1}px</span>
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


export default Appearance;
