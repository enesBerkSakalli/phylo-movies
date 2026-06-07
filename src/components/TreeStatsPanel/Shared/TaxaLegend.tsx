import React from 'react';
import { Palette, ChevronDown } from 'lucide-react';
import { selectTaxaGrouping, useAppStore } from '../../../state/phyloStore/store.js';
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from '../../ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';
import { ScrollArea } from '../../ui/scroll-area';

const GROUP_NAME_COLLATOR = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

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
  const namedGroups = mode === 'csv' ? csvGroups : mode === 'groups' ? groups : null;
  const groupNames = Array.isArray(namedGroups)
    ? namedGroups
        .map((group: { name?: unknown } | string) =>
          typeof group === 'string' ? group : String(group.name ?? '')
        )
        .filter(Boolean)
        .sort((a, b) => GROUP_NAME_COLLATOR.compare(a, b))
    : Object.keys(groupColorMap || {}).sort((a, b) => GROUP_NAME_COLLATOR.compare(a, b));

  if (groupNames.length === 0) {
    return null;
  }

  return (
    <SidebarMenuItem>
      <Collapsible className="group/taxa-legend">
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip="Taxa Color Groups">
            <Palette className="size-4 text-primary" />
            <span className="font-medium">Taxa Color Groups</span>
            <ChevronDown className="ml-auto size-4 transition-transform group-data-[state=open]/taxa-legend:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            <SidebarMenuSubItem className="px-0">
              <ScrollArea className="h-[200px] w-full">
                <div
                  className="flex flex-col gap-1 p-3"
                  role="list"
                  aria-label="Taxa color groups list"
                >
                  {groupNames.map((name) => {
                    const color = (groupColorMap && groupColorMap[name]) || '#666';
                    return (
                      <div
                        key={name}
                        className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors group/legend cursor-default"
                        role="listitem"
                      >
                        <span
                          className="size-2 rounded-sm ring-1 ring-border/20 group-hover/legend:scale-110 transition-transform shrink-0 shadow-sm"
                          style={{ background: color }}
                        />
                        <span
                          className="text-[11px] leading-none truncate font-medium"
                          title={name}
                        >
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
