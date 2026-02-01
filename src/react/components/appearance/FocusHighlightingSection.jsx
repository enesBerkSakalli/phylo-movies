import React from 'react';
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown, Eye } from 'lucide-react';
import { ToggleWithSlider } from './ToggleWithSlider';

export function FocusHighlightingSection({
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
