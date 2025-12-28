import { useAppStore } from '../../../js/core/store.js';
import { ToggleWithLabel } from '@/components/ui/toggle-with-label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SidebarGroup, SidebarGroupLabel } from '@/components/ui/sidebar';

// ==========================================================================
// STORE SELECTORS
// ==========================================================================

// Dimming state
const selectDimming = (s) => s.dimmingEnabled;
const selectDimmingOpacity = (s) => s.dimmingOpacity;
const selectSetDimmingEnabled = (s) => s.setDimmingEnabled;
const selectSetDimmingOpacity = (s) => s.setDimmingOpacity;

// Subtree dimming state
const selectSubtreeDimming = (s) => s.subtreeDimmingEnabled;
const selectSubtreeDimmingOpacity = (s) => s.subtreeDimmingOpacity;
const selectSetSubtreeDimmingEnabled = (s) => s.setSubtreeDimmingEnabled;
const selectSetSubtreeDimmingOpacity = (s) => s.setSubtreeDimmingOpacity;

// Connection state
const selectLinkConnectionOpacity = (s) => s.linkConnectionOpacity;
const selectSetLinkConnectionOpacity = (s) => s.setLinkConnectionOpacity;

// Effects state
const selectPulseEnabled = (s) => s.changePulseEnabled;
const selectSetPulseEnabled = (s) => s.setChangePulseEnabled;
const selectDashingEnabled = (s) => s.activeEdgeDashingEnabled;
const selectSetDashingEnabled = (s) => s.setActiveEdgeDashingEnabled;
const selectHighContrastHighlightingEnabled = (s) => s.highContrastHighlightingEnabled;
const selectSetHighContrastEnabled = (s) => s.setHighContrastHighlightingEnabled;

// History state
const selectUpcomingChangesEnabled = (s) => s.upcomingChangesEnabled;
const selectSetUpcomingChangesEnabled = (s) => s.setUpcomingChangesEnabled;



const selectTreeControllers = (s) => s.treeControllers;

// View state
const selectCameraMode = (s) => s.cameraMode;
const selectToggleCameraMode = (s) => s.toggleCameraMode;

// Marked subtree state additions
const selectMarkedSubtreeMode = (s) => s.markedSubtreeMode;
const selectSetMarkedSubtreeMode = (s) => s.setMarkedSubtreeMode;

// ==========================================================================
// COMPONENT
// ==========================================================================

export function Appearance() {
  // ---------------------------------------------------------------------------
  // Store subscriptions
  // ---------------------------------------------------------------------------
  const dimming = useAppStore(selectDimming);
  const dimmingOpacity = useAppStore(selectDimmingOpacity);
  const subtreeDimming = useAppStore(selectSubtreeDimming);
  const subtreeDimmingOpacity = useAppStore(selectSubtreeDimmingOpacity);
  const linkConnectionOpacity = useAppStore(selectLinkConnectionOpacity);
  const pulseEnabled = useAppStore(selectPulseEnabled);
  const dashingEnabled = useAppStore(selectDashingEnabled);
  const highContrastHighlightingEnabled = useAppStore(selectHighContrastHighlightingEnabled);
  const upcomingChangesEnabled = useAppStore(selectUpcomingChangesEnabled);
  const treeControllers = useAppStore(selectTreeControllers);

  const setDimmingEnabled = useAppStore(selectSetDimmingEnabled);
  const setDimmingOpacity = useAppStore(selectSetDimmingOpacity);
  const setSubtreeDimmingEnabled = useAppStore(selectSetSubtreeDimmingEnabled);
  const setSubtreeDimmingOpacity = useAppStore(selectSetSubtreeDimmingOpacity);
  const setLinkConnectionOpacity = useAppStore(selectSetLinkConnectionOpacity);
  const setPulseEnabled = useAppStore(selectSetPulseEnabled);
  const setDashingEnabled = useAppStore(selectSetDashingEnabled);
  const setHighContrastEnabled = useAppStore(selectSetHighContrastEnabled);
  const setUpcomingChangesEnabled = useAppStore(selectSetUpcomingChangesEnabled);

  // View & Mark mode subscriptions
  const cameraMode = useAppStore(selectCameraMode);
  const markedSubtreeMode = useAppStore(selectMarkedSubtreeMode);
  const setMarkedSubtreeMode = useAppStore(selectSetMarkedSubtreeMode);
  const toggleCameraMode = useAppStore(selectToggleCameraMode);

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------
  const rerenderAll = async () => {
    for (const controller of treeControllers) {
      await controller?.renderAllElements?.();
    }
  };

  const toggleDimming = async (value) => {
    try {
      setDimmingEnabled(!!value);
      await rerenderAll();
    } catch { }
  };

  const handleDimmingOpacityChange = async (value) => {
    try {
      setDimmingOpacity(value[0]);
      await rerenderAll();
    } catch { }
  };

  const toggleSubtreeDimming = async (value) => {
    try {
      setSubtreeDimmingEnabled(!!value);
      await rerenderAll();
    } catch { }
  };

  const handleSubtreeDimmingOpacityChange = async (value) => {
    try {
      setSubtreeDimmingOpacity(value[0]);
      await rerenderAll();
    } catch { }
  };

  const handleLinkOpacityChange = async (value) => {
    try {
      setLinkConnectionOpacity(value[0]);
      await rerenderAll();
    } catch { }
  };

  const togglePulse = (value) => setPulseEnabled(!!value);
  const toggleDashing = (value) => setDashingEnabled(!!value);
  const toggleHighContrast = (value) => setHighContrastEnabled(!!value);
  const toggleUpcomingChanges = (value) => setUpcomingChangesEnabled(!!value);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="appearance-root" data-react-component="appearance">
      <FocusHighlightingSection
        dimming={dimming}
        dimmingOpacity={dimmingOpacity}
        subtreeDimming={subtreeDimming}
        subtreeDimmingOpacity={subtreeDimmingOpacity}
        onToggleDimming={toggleDimming}
        onDimmingOpacityChange={handleDimmingOpacityChange}
        onToggleSubtreeDimming={toggleSubtreeDimming}
        onSubtreeDimmingOpacityChange={handleSubtreeDimmingOpacityChange}
        markedSubtreeMode={markedSubtreeMode}
        onMarkedSubtreeModeChange={setMarkedSubtreeMode}
      />

      <ActiveEdgeEffectsSection
        pulseEnabled={pulseEnabled}
        dashingEnabled={dashingEnabled}
        highContrastHighlightingEnabled={highContrastHighlightingEnabled}
        upcomingChangesEnabled={upcomingChangesEnabled}
        onTogglePulse={togglePulse}
        onToggleDashing={toggleDashing}
        onToggleHighContrast={toggleHighContrast}
        onToggleUpcomingChanges={toggleUpcomingChanges}
      />

      <ConnectionsSection
        linkConnectionOpacity={linkConnectionOpacity}
        onLinkOpacityChange={handleLinkOpacityChange}
      />

      <SidebarGroup>
        <SidebarGroupLabel>Perspective</SidebarGroupLabel>
        <div className="px-4 pb-2">
          <Button
            id="camera-mode-button"
            className="w-full"
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
          <div className="text-xs text-muted-foreground mt-2">
            Toggle between flat 2D and interactive 3D camera
          </div>
        </div>
      </SidebarGroup>
    </div>
  );
}

// ==========================================================================
// SUB-COMPONENTS
// ==========================================================================

function FocusHighlightingSection({
  dimming,
  dimmingOpacity,
  subtreeDimming,
  subtreeDimmingOpacity,
  onToggleDimming,
  onDimmingOpacityChange,
  onToggleSubtreeDimming,
  onSubtreeDimmingOpacityChange,
  markedSubtreeMode,
  onMarkedSubtreeModeChange
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Focus & Highlighting</SidebarGroupLabel>
      <div className="flex flex-col gap-4">
        <ToggleWithSlider
          id="dim-non-descendants"
          label="Focus on Active Subtree"
          description="Dim all non-descendants of the active edge"
          checked={!!dimming}
          onToggle={onToggleDimming}
          sliderValue={dimmingOpacity}
          onSliderChange={onDimmingOpacityChange}
          sliderLabel="Dimming Intensity"
        />

        <div className="mt-2">
          <ToggleWithSlider
            id="dim-non-subtree"
            label="Focus on Marked Subtree"
            description="Dim elements outside the marked subtree"
            checked={!!subtreeDimming}
            onToggle={onToggleSubtreeDimming}
            sliderValue={subtreeDimmingOpacity}
            onSliderChange={onSubtreeDimmingOpacityChange}
            sliderLabel="Dimming Intensity"
          />
        </div>

        <div className="flex flex-col gap-1.5 mt-2">
           <label className="text-xs font-medium text-muted-foreground pl-1">
             Subtree Highlight Scope
           </label>
           <Select value={markedSubtreeMode || 'current'} onValueChange={onMarkedSubtreeModeChange}>
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Entire Edge Structure</SelectItem>
              <SelectItem value="current">Active Subtree Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </SidebarGroup>
  );
}

function ActiveEdgeEffectsSection({
  pulseEnabled,
  dashingEnabled,
  highContrastHighlightingEnabled,
  upcomingChangesEnabled,
  onTogglePulse,
  onToggleDashing,
  onToggleHighContrast,
  onToggleUpcomingChanges
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Active Edge Effects</SidebarGroupLabel>
      <div className="flex flex-col gap-4">
        <ToggleWithLabel
          id="pulse-animation"
          label="Pulse Animation"
          description="Breathing effect on highlighted edges"
          checked={!!pulseEnabled}
          onCheckedChange={onTogglePulse}
          switchPosition="left"
        />

        <ToggleWithLabel
          id="dashing"
          label="Dashed Lines"
          description="Show active edges with dashed pattern"
          checked={dashingEnabled !== false}
          onCheckedChange={onToggleDashing}
          switchPosition="left"
        />

        <ToggleWithLabel
          id="high-contrast"
          label="High Contrast Highlighting"
          description="Use dynamic colors for marked subtrees"
          checked={highContrastHighlightingEnabled !== false}
          onCheckedChange={onToggleHighContrast}
          switchPosition="left"
        />

        <ToggleWithLabel
          id="upcoming-changes"
          label="Change History"
          description="Visual indicators for past and future states"
          checked={!!upcomingChangesEnabled}
          onCheckedChange={onToggleUpcomingChanges}
          switchPosition="left"
        />
      </div>
    </SidebarGroup>
  );
}

function ConnectionsSection({ linkConnectionOpacity, onLinkOpacityChange }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Connections</SidebarGroupLabel>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="connection-opacity-slider" className="text-sm font-medium">
              Connection Opacity
            </label>
            <span className="text-sm text-muted-foreground">
              {Math.round((linkConnectionOpacity ?? 0.6) * 100)}%
            </span>
          </div>
          <Slider
            id="connection-opacity-slider"
            min={0}
            max={1}
            step={0.05}
            value={[linkConnectionOpacity ?? 0.6]}
            onValueChange={onLinkOpacityChange}
            className="w-full"
          />
        </div>
      </div>
    </SidebarGroup>
  );
}

// ==========================================================================
// REUSABLE UI COMPONENTS
// ==========================================================================

function ToggleWithSlider({ id, label, description, checked, onToggle, sliderValue, onSliderChange, sliderLabel }) {
  return (
    <>
      <ToggleWithLabel
        id={id}
        label={label}
        description={description}
        checked={checked}
        onCheckedChange={onToggle}
        switchPosition="left"
      />

      {checked && (
        <div className="flex flex-col gap-2 pl-12">
          <div className="flex items-center justify-between">
            <label htmlFor={`${id}-opacity-slider`} className="text-sm font-medium">
              {sliderLabel}
            </label>
            <span className="text-sm text-muted-foreground">
              {Math.round((1 - sliderValue) * 100)}%
            </span>
          </div>
          <Slider
            id={`${id}-opacity-slider`}
            min={0}
            max={1}
            step={0.05}
            value={[sliderValue]}
            onValueChange={onSliderChange}
            className="w-full"
          />
          <div className="text-xs text-muted-foreground">
            Lower values = more dimming
          </div>
        </div>
      )}
    </>
  );
}

export default Appearance;
