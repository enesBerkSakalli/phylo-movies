import { useAppStore } from '../../../../../js/core/store.js';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function AdvancedFeatures() {
  const cameraMode = useAppStore((s) => s.cameraMode);
  const treeControllers = useAppStore((s) => s.treeControllers);
  const toggleCameraMode = useAppStore((s) => s.toggleCameraMode);

  // Pulse animation state
  const highlightPulseEnabled = useAppStore((s) => s.highlightPulseEnabled);
  const setHighlightPulseEnabled = useAppStore((s) => s.setHighlightPulseEnabled);

  // Dashing state
  const activeEdgeDashingEnabled = useAppStore((s) => s.activeEdgeDashingEnabled);
  const setActiveEdgeDashingEnabled = useAppStore((s) => s.setActiveEdgeDashingEnabled);

  // Marked subtree mode
  const markedSubtreeMode = useAppStore((s) => s.markedSubtreeMode);
  const setMarkedSubtreeMode = useAppStore((s) => s.setMarkedSubtreeMode);

  return (
    <div>
      <div className="flex flex-col gap-4">
        {/* Active Edge Effects */}
        <div className="flex flex-col gap-3">
          <div className="text-sm font-medium text-muted-foreground">Active Edge Effects</div>

          <label
            className="flex items-center gap-3"
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              if (e.target?.closest?.('[data-slot="switch"]')) return;
              setHighlightPulseEnabled(!highlightPulseEnabled);
            }}
          >
            <Switch
              id="pulse-animation-toggle"
              checked={!!highlightPulseEnabled}
              onCheckedChange={setHighlightPulseEnabled}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, color: 'var(--foreground)' }}>Pulse Animation</div>
              <div className="text-xs text-muted-foreground">Breathing effect on highlighted edges</div>
            </div>
          </label>

          <label
            className="flex items-center gap-3"
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              if (e.target?.closest?.('[data-slot="switch"]')) return;
              setActiveEdgeDashingEnabled(!activeEdgeDashingEnabled);
            }}
          >
            <Switch
              id="dashing-toggle"
              checked={!!activeEdgeDashingEnabled}
              onCheckedChange={setActiveEdgeDashingEnabled}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, color: 'var(--foreground)' }}>Dashed Lines</div>
              <div className="text-xs text-muted-foreground">Show active edges as dashed</div>
            </div>
          </label>
        </div>

        {/* Marked Subtree Mode */}
        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium text-muted-foreground">Marked Subtrees</div>
          <Select value={markedSubtreeMode || 'all'} onValueChange={setMarkedSubtreeMode}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subtrees for edge</SelectItem>
              <SelectItem value="current">Current subtree only</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground">
            {markedSubtreeMode === 'current'
              ? 'Highlight only the currently animating subtree'
              : 'Highlight all jumping subtrees for the active edge'}
          </div>
        </div>

        {/* Camera Mode */}
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
          <span id="camera-mode-text">{cameraMode === 'orbit' ? '3D View' : '2D View'}</span>
        </Button>
      </div>
    </div>
  );
}

export default AdvancedFeatures;
