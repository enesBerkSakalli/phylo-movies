import React from 'react';
import { useAppStore } from '../../../../js/core/store.js';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

export function AdvancedFeatures() {
  const cameraMode = useAppStore((s) => s.cameraMode);
  const trailsEnabled = useAppStore((s) => s.trailsEnabled);
  const trailLength = useAppStore((s) => s.trailLength);
  const trailOpacity = useAppStore((s) => s.trailOpacity);
  const trailThickness = useAppStore((s) => s.trailThickness);

  const treeController = useAppStore((s) => s.treeController);
  const toggleCameraMode = useAppStore((s) => s.toggleCameraMode);
  const setTrailLength = useAppStore((s) => s.setTrailLength);
  const setTrailOpacity = useAppStore((s) => s.setTrailOpacity);
  const setTrailThickness = useAppStore((s) => s.setTrailThickness);
  const setTrailsEnabled = useAppStore((s) => s.setTrailsEnabled);

  const onToggleTrails = async (v) => {
    try {
      setTrailsEnabled(!!v);
      await treeController?.renderAllElements?.();
    } catch {}
  };

  return (
    <div>
      <div className="flex flex-col gap-4">
        <Button
          id="camera-mode-button"
          className="w-full"
          variant="outline"
          onClick={() => {
            try {
              const newMode = toggleCameraMode();
              treeController?.setCameraMode?.(newMode);
            } catch {}
          }}
        >
          <span id="camera-mode-text">{cameraMode === 'orbit' ? '3D View' : '2D View'}</span>
        </Button>

        <label
          className="flex items-center gap-4"
          style={{ cursor: 'pointer', marginTop: 12 }}
          onClick={(e) => {
            if (e.target?.closest?.('[data-slot="switch"]')) return;
            onToggleTrails(!trailsEnabled);
          }}
        >
          <Switch
            id="trails-toggle"
            aria-labelledby="trails-label"
            aria-describedby="trails-desc"
            checked={!!trailsEnabled}
            onCheckedChange={onToggleTrails}
          />
          <div style={{ flex: 1 }}>
            <div id="trails-label" style={{ fontWeight: 500, color: 'var(--foreground)' }}>
              Motion Trails
            </div>
            <div id="trails-desc" className="text-sm text-muted-foreground">Show faint streaming trails for moving elements</div>
          </div>
        </label>

        <div className="flex flex-col gap-2">
          <div>
            <Label title="Number of historical positions per element">
              <span id="trail-length-label">Trail Length</span>: <span id="trail-length-value">{trailLength}</span>
            </Label>
            <Slider
              id="trail-length"
              min={2}
              max={40}
              step={1}
              value={[Number(trailLength)]}
              aria-labelledby="trail-length-label"
              disabled={!trailsEnabled}
              onValueChange={async (vals) => {
                const v = Array.isArray(vals) ? vals[0] : Number(trailLength);
                setTrailLength(v);
                try { await treeController?.renderAllElements?.(); } catch {}
              }}
              className="w-48"
            />
          </div>
          <div>
            <Label title="Trail opacity (0–1)">
              <span id="trail-opacity-label">Trail Opacity</span>: <span id="trail-opacity-value">{trailOpacity}</span>
            </Label>
            <Slider
              id="trail-opacity"
              min={0}
              max={1}
              step={0.05}
              value={[Number(trailOpacity)]}
              aria-labelledby="trail-opacity-label"
              disabled={!trailsEnabled}
              onValueChange={async (vals) => {
                const v = Array.isArray(vals) ? vals[0] : Number(trailOpacity);
                setTrailOpacity(v);
                try { await treeController?.renderAllElements?.(); } catch {}
              }}
              className="w-48"
            />
          </div>
          <div>
            <Label title="Trail thickness relative to branch width">
              <span id="trail-thickness-label">Trail Thickness</span>: <span id="trail-thickness-value">{trailThickness}</span>
            </Label>
            <Slider
              id="trail-thickness"
              min={0.1}
              max={5}
              step={0.1}
              value={[Number(trailThickness)]}
              aria-labelledby="trail-thickness-label"
              disabled={!trailsEnabled}
              onValueChange={async (vals) => {
                const v = Array.isArray(vals) ? vals[0] : Number(trailThickness);
                setTrailThickness(v);
                try { await treeController?.renderAllElements?.(); } catch {}
              }}
              className="w-48"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdvancedFeatures;
