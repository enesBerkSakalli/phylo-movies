import React from 'react';
import { ColoringPanel } from '../../color/ColoringPanel.jsx';
import { SidebarMenuItem, SidebarMenuButton } from '../../../ui/sidebar';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../../../ui/collapsible';
import { ChevronDown, Palette } from 'lucide-react';

export function TaxaAndHighlightsSection({ onOpenTaxaColoring }) {
  return (
    <Collapsible asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip="Taxa colors and highlights">
            <Palette className="text-primary" />
            <span>Taxa & Highlights</span>
            <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ColoringPanel onOpenTaxaColoring={onOpenTaxaColoring} />
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
