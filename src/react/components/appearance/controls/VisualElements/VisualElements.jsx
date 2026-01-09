import React from 'react';
import { ColoringPanel } from '../../color/ColoringPanel.jsx';
import { VisualStyle } from '../VisualStyle/VisualStyle.jsx';
import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown, Palette } from 'lucide-react';

export function VisualElements() {
  return (
    <>
      <VisualStyle />
      <Collapsible defaultOpen asChild className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip="Coloring & Styling">
              <Palette className="text-primary" />
              <span>Coloring & Styling</span>
              <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ColoringPanel />
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    </>
  );
}

export default VisualElements;
