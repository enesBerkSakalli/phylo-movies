import { TreeStructure } from './TreeStructure.jsx';
import { GitBranch, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';

export function TreeStructureGroup() {
  return (
    <Collapsible defaultOpen asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip="Tree Structure">
            <GitBranch className="text-primary" />
            <span>Tree Structure</span>
            <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <TreeStructure />
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export default TreeStructureGroup;
