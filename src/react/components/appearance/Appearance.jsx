import { useAppStore } from '../../../js/core/store.js';
import { AdvancedFeatures } from './controls/AdvancedFeatures/AdvancedFeatures.jsx';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { SidebarGroup, SidebarGroupLabel } from '@/components/ui/sidebar';

export function Appearance() {
  const dimming = useAppStore((s) => s.dimmingEnabled);
  const dimmingOpacity = useAppStore((s) => s.dimmingOpacity);
  const treeControllers = useAppStore((s) => s.treeControllers);
  const setDimmingEnabled = useAppStore((s) => s.setDimmingEnabled);
  const setDimmingOpacity = useAppStore((s) => s.setDimmingOpacity);

  const toggleDimming = async (value) => {
    try {
      setDimmingEnabled(!!value);
      for (const controller of treeControllers) {
        await controller?.renderAllElements?.();
      }
    } catch {}
  };

  const handleDimmingOpacityChange = async (value) => {
    try {
      const opacity = value[0]; // Slider returns array
      setDimmingOpacity(opacity);
      for (const controller of treeControllers) {
        await controller?.renderAllElements?.();
      }
    } catch {}
  };

  return (
    <div className="appearance-root" data-react-component="appearance">
      <SidebarGroup>
        <SidebarGroupLabel>Focus & Highlighting</SidebarGroupLabel>
        <div className="flex flex-col gap-4">
          <label
            className="flex items-center gap-4"
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              if (e.target?.closest?.('[data-slot="switch"]')) return;
              toggleDimming(!dimming);
            }}
          >
            <Switch
              id="dim-non-descendants-toggle"
              aria-labelledby="dim-non-descendants-label"
              aria-describedby="dim-non-descendants-desc"
              checked={!!dimming}
              onCheckedChange={toggleDimming}
            />
            <div style={{ flex: 1 }}>
              <div id="dim-non-descendants-label" style={{ fontWeight: 500, color: 'var(--foreground)' }}>
                Focus on Active Subtree
              </div>
              <div id="dim-non-descendants-desc" className="text-sm text-muted-foreground">Dim all non-descendants of the active edge</div>
            </div>
          </label>

          {dimming && (
            <div className="flex flex-col gap-2 pl-12">
              <div className="flex items-center justify-between">
                <label htmlFor="dimming-opacity-slider" className="text-sm font-medium">
                  Dimming Intensity
                </label>
                <span className="text-sm text-muted-foreground">
                  {Math.round((1 - dimmingOpacity) * 100)}%
                </span>
              </div>
              <Slider
                id="dimming-opacity-slider"
                min={0}
                max={1}
                step={0.05}
                value={[dimmingOpacity]}
                onValueChange={handleDimmingOpacityChange}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                Lower values = more dimming
              </div>
            </div>
          )}
        </div>
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel>Advanced Features</SidebarGroupLabel>
        <AdvancedFeatures />
      </SidebarGroup>
    </div>
  );
}

export default Appearance;
