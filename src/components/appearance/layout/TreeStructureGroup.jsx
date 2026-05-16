import { TreeStructure } from './TreeStructure.jsx';
import { GitBranch, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../../ui/collapsible';
import { SidebarMenuItem, SidebarMenuButton } from '../../ui/sidebar';

export function TreeStructureGroup() {
  return (
    <Collapsible asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip="Branch Scaling">
            <GitBranch className="text-primary" />
            <span>Branch Scaling</span>
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
