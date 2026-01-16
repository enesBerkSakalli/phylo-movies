import React from 'react';
import { useAppStore } from '../../../js/core/store.js';
import { ToggleWithLabel } from '@/components/ui/toggle-with-label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown, Eye, Activity, Link, Box, Info } from 'lucide-react';

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
const selectPulseEnabled = (s) => s.changePulseEnabled;
const selectSetPulseEnabled = (s) => s.setChangePulseEnabled;
const selectDashingEnabled = (s) => s.activeEdgeDashingEnabled;
const selectSetDashingEnabled = (s) => s.setActiveEdgeDashingEnabled;
const selectHighlightColorMode = (s) => s.highlightColorMode;
const selectSetHighlightColorMode = (s) => s.setHighlightColorMode;
const selectUpcomingChangesEnabled = (s) => s.upcomingChangesEnabled;
const selectSetUpcomingChangesEnabled = (s) => s.setUpcomingChangesEnabled;
const selectTreeControllers = (s) => s.treeControllers;
const selectCameraMode = (s) => s.cameraMode;
const selectToggleCameraMode = (s) => s.toggleCameraMode;


// ==========================================================================
// COMPONENT
// ==========================================================================

export function Appearance() {
  const dimming = useAppStore(selectDimming);
  const dimmingOpacity = useAppStore(selectDimmingOpacity);
  const subtreeDimming = useAppStore(selectSubtreeDimming);
  const subtreeDimmingOpacity = useAppStore(selectSubtreeDimmingOpacity);
  const linkConnectionOpacity = useAppStore(selectLinkConnectionOpacity);
  const pulseEnabled = useAppStore(selectPulseEnabled);
  const dashingEnabled = useAppStore(selectDashingEnabled);
  const highlightColorMode = useAppStore(selectHighlightColorMode);
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

  const togglePulse = (value) => setPulseEnabled(!!value);
  const toggleDashing = (value) => setDashingEnabled(!!value);
  const toggleHighContrast = async (value) => {
    try { setHighContrastEnabled(!!value); await rerenderAll(); } catch { }
  };
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

      <ActiveEdgeEffectsSection
        pulseEnabled={pulseEnabled}
        dashingEnabled={dashingEnabled}
        upcomingChangesEnabled={upcomingChangesEnabled}
        onTogglePulse={togglePulse}
        onToggleDashing={toggleDashing}
        onToggleUpcomingChanges={toggleUpcomingChanges}
      />
      <ConnectionsSection
        linkConnectionOpacity={linkConnectionOpacity}
        onLinkOpacityChange={handleLinkOpacityChange}
      />
      <Collapsible defaultOpen asChild className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip="Perspective">
              <Box className="text-primary" />
              <span>Perspective</span>
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
                  <div className="flex items-start gap-2 text-[10px] text-muted-foreground/80 italic mt-3 leading-relaxed">
                    <Info className="size-3 shrink-0 mt-0.5" />
                    <span>Toggle between flat 2D and interactive 3D camera for tree visualization.</span>
                  </div>
                </div>
              </SidebarMenuSubItem>
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    </>
  );
}


// ==========================================================================
// SUB-COMPONENTS
// ==========================================================================

function FocusHighlightingSection({
  dimming, dimmingOpacity, subtreeDimming, subtreeDimmingOpacity,
  onToggleDimming, onDimmingOpacityChange, onToggleSubtreeDimming, onSubtreeDimmingOpacityChange
}) {
  return (
    <Collapsible defaultOpen asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip="Focus & Dimming">
            <Eye className="text-primary" />
            <span>Focus & Dimming</span>
            <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            <SidebarMenuSubItem>
              <div className="flex flex-col gap-5 px-1 py-3">
                <ToggleWithSlider
                  id="dim-non-descendants"
                  label="Active Subtree"
                  description="Dim non-descendants of the active edge"
                  checked={!!dimming}
                  onToggle={onToggleDimming}
                  sliderValue={dimmingOpacity}
                  onSliderChange={onDimmingOpacityChange}
                  sliderLabel="Dimming Intensity"
                />
                <div className="h-px bg-muted/30 mx-1" />
                <ToggleWithSlider
                  id="dim-non-subtree"
                  label="Marked Subtree"
                  description="Dim elements outside the marked subtree"
                  checked={!!subtreeDimming}
                  onToggle={onToggleSubtreeDimming}
                  sliderValue={subtreeDimmingOpacity}
                  onSliderChange={onSubtreeDimmingOpacityChange}
                  sliderLabel="Dimming Intensity"
                />
              </div>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}



function ActiveEdgeEffectsSection({ pulseEnabled, dashingEnabled, upcomingChangesEnabled, onTogglePulse, onToggleDashing, onToggleUpcomingChanges }) {
  return (
    <Collapsible defaultOpen asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip="Active Edge Effects (Blue)">
            <Activity className="text-primary" />
            <span>Active Edge Effects (Blue)</span>
            <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            <SidebarMenuSubItem>
              <div className="flex flex-col gap-3 px-1 py-3">
                <ToggleWithLabel id="pulse-animation" label="Pulse Animation" description="Breathing effect on edges" checked={!!pulseEnabled} onCheckedChange={onTogglePulse} switchPosition="left" />
                <ToggleWithLabel id="dashing" label="Dashed Lines" description="Show with dashed pattern" checked={dashingEnabled !== false} onCheckedChange={onToggleDashing} switchPosition="left" />
                <ToggleWithLabel id="upcoming-changes" label="Change History" description="Indicators for past/future" checked={!!upcomingChangesEnabled} onCheckedChange={onToggleUpcomingChanges} switchPosition="left" />
              </div>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function ConnectionsSection({ linkConnectionOpacity, onLinkOpacityChange }) {
  return (
    <Collapsible defaultOpen asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip="Connections">
            <Link className="text-primary" />
            <span>Connections</span>
            <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            <SidebarMenuSubItem>
              <div className="px-1 py-3">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-1">
                    <Label htmlFor="connection-opacity-slider" className="text-xs font-medium text-foreground/80">Connection Opacity</Label>
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">{Math.round((linkConnectionOpacity ?? 0.6) * 100)}%</span>
                  </div>
                  <Slider
                    id="connection-opacity-slider"
                    min={0}
                    max={1}
                    step={0.05}
                    value={[linkConnectionOpacity ?? 0.6]}
                    onValueChange={onLinkOpacityChange}
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

function ToggleWithSlider({ id, label, description, checked, onToggle, sliderValue, onSliderChange, sliderLabel }) {
  return (
    <div className="flex flex-col gap-3">
      <ToggleWithLabel id={id} label={label} description={description} checked={checked} onCheckedChange={onToggle} switchPosition="left" />
      {checked && (
        <div className="flex flex-col gap-3 pl-8 pr-1">
          <div className="flex items-center justify-between">
            <Label htmlFor={`${id}-opacity-slider`} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">{sliderLabel}</Label>
            <span className="text-xs font-medium tabular-nums text-muted-foreground">{Math.round((1 - sliderValue) * 100)}%</span>
          </div>
          <Slider
            id={`${id}-opacity-slider`}
            min={0}
            max={1}
            step={0.05}
            value={[sliderValue]}
            onValueChange={onSliderChange}
            className="w-full py-1"
          />
          <div className="text-[10px] text-muted-foreground/80 leading-tight">
            Lower opacity increases dimming intensity for non-focused elements.
          </div>
        </div>
      )}
    </div>
  );
}

export default Appearance;
