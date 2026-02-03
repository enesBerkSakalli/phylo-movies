import React from 'react';
import { Palette, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../../../js/core/store.js';
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AppStoreState } from '../../../../types/store';

// ==========================================================================
// STORE SELECTORS
// ==========================================================================
const selectTaxaGrouping = (s: AppStoreState) => s.taxaGrouping;

/**
 * Taxa groups legend - displays color-coded groups when taxa coloring is applied.
 * Now integrated as a SidebarMenuItem for consistent UI placement.
 */
export const TaxaGroupsLegend: React.FC = () => {
  const taxaGrouping = useAppStore(selectTaxaGrouping);

  // Hide legend in taxa mode (individual coloring) or when no grouping data exists
  if (!taxaGrouping || taxaGrouping.mode === 'taxa') {
    return null;
  }

  const { mode, groupColorMap, groups, csvGroups } = taxaGrouping;
  let groupNames: string[] = [];

  // Determine which groups to show based on the active mode
  if (mode === 'csv' && csvGroups) {
    groupNames = csvGroups.map((g: any) => g.name);
  } else if (mode === 'groups' && groups) {
    groupNames = groups.map((g: any) => g.name);
  } else {
    // Fallback if specific lists are missing
    groupNames = Object.keys(groupColorMap || {});
  }

  if (groupNames.length === 0) {
    return null;
  }

  return (
    <SidebarMenuItem>
      <Collapsible defaultOpen className="group/taxa-legend">
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip="Taxa Group Legend">
            <Palette className="size-4 text-primary" />
            <span className="font-medium">Taxa Groups</span>
            <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/taxa-legend:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            <SidebarMenuSubItem className="px-0">
              <ScrollArea className="h-[200px] w-full">
                <div
                  className="flex flex-col gap-1 p-3"
                  role="list"
                  aria-label="Taxa groups legend list"
                >
                  {groupNames.map((name) => {
                    const color = (groupColorMap && groupColorMap[name]) || '#666';
                    return (
                      <div
                        key={name}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors group/legend cursor-default"
                        role="listitem"
                      >
                        <span
                          className="size-2 rounded-full ring-1 ring-border/20 group-hover/legend:scale-110 transition-transform shrink-0 shadow-sm"
                          style={{ background: color }}
                        />
                        <span className="text-[11px] leading-none truncate font-medium" title={name}>
                          {name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
};
