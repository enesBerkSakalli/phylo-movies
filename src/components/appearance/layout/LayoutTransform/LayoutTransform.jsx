import React, { useCallback } from 'react';
import { LabeledSlider } from '../../../ui/labeled-slider';
import { SidebarMenuSub, SidebarMenuSubItem } from '../../../ui/sidebar';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../ui/select';
import { Compass } from 'lucide-react';
import { LAYOUT_PROJECTION_MODES } from '../../../../treeVisualisation/layout/hyperbolicProjection/index.js';

export function LayoutTransform({
  layoutAngleDegrees,
  setLayoutAngleDegrees,
  layoutRotationDegrees,
  setLayoutRotationDegrees,
  layoutProjectionMode,
  setLayoutProjectionMode,
  hyperbolicProjectionStrength,
  setHyperbolicProjectionStrength,
}) {
  const handleAngleChange = useCallback(
    (vals) => {
      const v = Array.isArray(vals) ? vals[0] : 360;
      setLayoutAngleDegrees(v);
    },
    [setLayoutAngleDegrees]
  );

  const handleRotationChange = useCallback(
    (vals) => {
      const v = Array.isArray(vals) ? vals[0] : 0;
      setLayoutRotationDegrees(v);
    },
    [setLayoutRotationDegrees]
  );

  const handleProjectionModeChange = useCallback(
    (value) => {
      setLayoutProjectionMode(value);
    },
    [setLayoutProjectionMode]
  );

  const handleHyperbolicStrengthChange = useCallback(
    (vals) => {
      const v = Array.isArray(vals) ? vals[0] : hyperbolicProjectionStrength;
      setHyperbolicProjectionStrength(v);
    },
    [hyperbolicProjectionStrength, setHyperbolicProjectionStrength]
  );

  const isHyperbolic = layoutProjectionMode === LAYOUT_PROJECTION_MODES.HYPERBOLIC;
  const strengthPercent = Math.round(Number(hyperbolicProjectionStrength || 0) * 100);

  return (
    <SidebarMenuSub>
      <SidebarMenuSubItem>
        <div className="flex flex-col gap-6 px-1 py-3">
          <div className="grid gap-2">
            <label
              htmlFor="layout-projection"
              className="text-xs font-medium leading-none text-foreground"
            >
              Projection
            </label>
            <Select
              value={layoutProjectionMode || LAYOUT_PROJECTION_MODES.RADIAL}
              onValueChange={handleProjectionModeChange}
            >
              <SelectTrigger id="layout-projection" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={LAYOUT_PROJECTION_MODES.RADIAL}>Radial</SelectItem>
                  <SelectItem value={LAYOUT_PROJECTION_MODES.HYPERBOLIC}>
                    Hyperbolic Focus
                  </SelectItem>
                  <SelectItem value={LAYOUT_PROJECTION_MODES.WALRUS_3D}>Walrus 3D</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {isHyperbolic && (
            <LabeledSlider
              id="hyperbolic-projection-strength"
              label="Focus Strength"
              title="Control hyperbolic radial compression"
              ariaLabel="Hyperbolic focus strength control"
              valueDisplay={`${strengthPercent}%`}
              value={Number(hyperbolicProjectionStrength || 0)}
              min={0}
              max={1}
              step={0.05}
              onChange={handleHyperbolicStrengthChange}
            />
          )}

          <LabeledSlider
            id="layout-angle"
            label="Tree Spread"
            title="Set how much of the circle the radial tree uses"
            ariaLabel="Tree spread control"
            valueDisplay={`${layoutAngleDegrees || 360}°`}
            value={Number(layoutAngleDegrees || 360)}
            min={90}
            max={360}
            step={10}
            onChange={handleAngleChange}
          />

          <LabeledSlider
            id="layout-rotation"
            label="Rotation"
            title="Rotate the tree"
            ariaLabel="Tree rotation control"
            valueDisplay={`${layoutRotationDegrees || 0}°`}
            value={Number(layoutRotationDegrees || 0)}
            min={0}
            max={360}
            step={5}
            onChange={handleRotationChange}
          />

          <div className="flex items-start gap-2 text-2xs text-muted-foreground/80 italic">
            <Compass className="size-3 shrink-0 mt-1" />
            <span>Spread controls how open the tree is; rotation turns the whole tree.</span>
          </div>
        </div>
      </SidebarMenuSubItem>
    </SidebarMenuSub>
  );
}

export default LayoutTransform;
