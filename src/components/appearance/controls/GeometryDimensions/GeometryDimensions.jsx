import React, { useCallback, useRef } from 'react';
import { LabeledSlider } from '../../../ui/labeled-slider';
import { SidebarMenuSub, SidebarMenuSubItem } from '../../../ui/sidebar';
import { Label } from '../../../ui/label';
import { Switch } from '../../../ui/switch';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../ui/select';

const clampValue = (value, fallback) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const MIN_NODE_SIZE = 0.01;

function getBranchAnnotationHelpText(option) {
  if (!option || option.value === 'none') {
    return 'Tree labels are hidden; SPR analytics auto-select primary support: UFBoot, then SH-aLRT, then bootstrap.';
  }

  const path = Array.isArray(option.path) ? option.path.join('.') : option.value;
  if (path === 'label.raw_internal') {
    return 'Original internal Newick label text; combined source labels can contain multiple values.';
  }
  if (path === 'support.iqtree.sh_alrt') {
    return 'Parsed numeric IQ-TREE SH-aLRT support. It can match Raw internal label when that source label contains only SH-aLRT.';
  }
  if (option.role === 'branch_support') {
    return 'Parsed numeric branch-support value used for internal branch labels and SPR analytics.';
  }
  if (option.role === 'branch_support_context') {
    return 'Support metadata such as replicate counts, not a branch-support score.';
  }
  return 'Dataset-provided annotation value used for internal branch labels and SPR analytics.';
}

export function GeometryDimensions({
  nodeSize,
  setNodeSize,
  strokeWidth,
  setStrokeWidth,
  fontSizeNumber,
  setFontSize,
  treeControllers,
  labelsVisible,
  onToggleLabels,
  branchAnnotationLabelKey,
  branchAnnotationOptions,
  onChangeBranchAnnotationLabelKey,
}) {
  const isRenderingRef = useRef(false);
  const needsRenderRef = useRef(false);
  const selectedBranchAnnotationOption = (branchAnnotationOptions || []).find(
    (option) => option.value === (branchAnnotationLabelKey || 'none')
  );
  const branchAnnotationHelpText = getBranchAnnotationHelpText(selectedBranchAnnotationOption);

  const renderControllers = useCallback(
    async (options = {}) => {
      if (isRenderingRef.current) {
        needsRenderRef.current = true;
        return;
      }

      isRenderingRef.current = true;
      try {
        do {
          needsRenderRef.current = false;
          for (const controller of treeControllers) {
            await controller.renderAllElements(options);
          }
        } while (needsRenderRef.current);
      } catch {
      } finally {
        isRenderingRef.current = false;
      }
    },
    [treeControllers]
  );

  const handleNodeSizeChange = useCallback(
    (vals) => {
      const nextValue = clampValue(Array.isArray(vals) ? vals[0] : null, nodeSize ?? 1);
      if (nextValue !== nodeSize) {
        setNodeSize(nextValue);
        renderControllers();
      }
    },
    [nodeSize, setNodeSize, renderControllers]
  );

  const handleStrokeWidthChange = useCallback(
    (vals) => {
      const nextValue = clampValue(Array.isArray(vals) ? vals[0] : null, strokeWidth ?? 1);
      if (nextValue !== strokeWidth) {
        setStrokeWidth(nextValue);
        renderControllers();
      }
    },
    [strokeWidth, setStrokeWidth, renderControllers]
  );

  const handleFontSizeChange = useCallback(
    (vals) => {
      const nextValue = clampValue(Array.isArray(vals) ? vals[0] : null, fontSizeNumber ?? 1.8);
      if (nextValue !== fontSizeNumber) {
        setFontSize(nextValue);
        renderControllers({ skipAutoFit: true });
      }
    },
    [fontSizeNumber, setFontSize, renderControllers]
  );

  return (
    <SidebarMenuSub>
      <SidebarMenuSubItem>
        <div className="flex flex-col gap-4 px-1 py-2">
          <LabeledSlider
            id="node-size"
            label="Node Size"
            title="Adjust node size"
            ariaLabel="Node size control"
            valueDisplay={clampValue(nodeSize, 1).toFixed(2)}
            value={clampValue(nodeSize, 1)}
            min={MIN_NODE_SIZE}
            max={5}
            step={0.01}
            onChange={handleNodeSizeChange}
          />

          <LabeledSlider
            id="stroke-width"
            label="Branch Width"
            title="Adjust branch line width"
            ariaLabel="Branch width control"
            valueDisplay={clampValue(strokeWidth, 1).toFixed(1)}
            value={clampValue(strokeWidth, 1)}
            min={1}
            max={5}
            step={0.1}
            onChange={handleStrokeWidthChange}
          />

          <LabeledSlider
            id="font-size"
            label="Label Size"
            title="Adjust label text size"
            ariaLabel="Label size control"
            valueDisplay={`${clampValue(fontSizeNumber, 1.8).toFixed(1)}em`}
            value={clampValue(fontSizeNumber, 1.8)}
            min={0.5}
            max={10}
            step={0.1}
            onChange={handleFontSizeChange}
          />

          <div className="text-2xs leading-relaxed text-muted-foreground/80 italic mt-2">
            Branches and labels adjust with tree size so proportions stay stable.
          </div>

          <div className="border-t border-border/20 pt-4 mt-2">
            <div className="flex items-center justify-between mb-3">
              <Label htmlFor="labels-toggle" className="text-xs font-medium text-foreground/80">
                Show Labels
              </Label>
              <Switch id="labels-toggle" checked={labelsVisible} onCheckedChange={onToggleLabels} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="branch-value-key" className="text-xs font-medium text-foreground/80">
                Branch Value for Labels & SPR Analytics
              </Label>
              <Select
                value={branchAnnotationLabelKey || 'none'}
                onValueChange={onChangeBranchAnnotationLabelKey}
                disabled={
                  !Array.isArray(branchAnnotationOptions) || branchAnnotationOptions.length <= 1
                }
              >
                <SelectTrigger
                  id="branch-value-key"
                  className="h-8 text-xs bg-background/50 border-border/40"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {(
                      branchAnnotationOptions || [
                        {
                          value: 'none',
                          label: 'Hide labels; analytics auto-selects primary support',
                        },
                      ]
                    ).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <div className="text-2xs leading-relaxed text-muted-foreground/80 italic">
                {branchAnnotationHelpText}
              </div>
            </div>
          </div>
        </div>
      </SidebarMenuSubItem>
    </SidebarMenuSub>
  );
}

export default GeometryDimensions;
