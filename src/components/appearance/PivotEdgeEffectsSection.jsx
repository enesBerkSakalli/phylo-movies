import React from 'react';
import { ToggleWithLabel } from '@/components/ui/toggle-with-label';
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown, Activity } from 'lucide-react';

export function PivotEdgeEffectsSection({ pulseEnabled, dashingEnabled, upcomingChangesEnabled, onTogglePulse, onToggleDashing, onToggleUpcomingChanges }) {
  return (
    <Collapsible defaultOpen asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip="Pivot Edge Effects (Blue)">
            <Activity className="text-primary" />
            <span>Pivot Edge Effects (Blue)</span>
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
