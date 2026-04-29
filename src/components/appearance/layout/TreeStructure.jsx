import React, { useCallback } from 'react';
import { selectBranchTransformation, useAppStore } from '@/state/phyloStore/store.js';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { SidebarMenuSub, SidebarMenuSubItem } from '@/components/ui/sidebar';
import { GitGraph } from 'lucide-react';

// ==========================================================================
// STORE SELECTORS
// ==========================================================================
const selectSetBranchTransformation = (s) => s.setBranchTransformation;

export function TreeStructure() {
  const branchTransformation = useAppStore(selectBranchTransformation);
  const setBranchTransformation = useAppStore(selectSetBranchTransformation);

  const handleBranchOptionChange = useCallback(
    (rawValue) => {
      const normalized = rawValue === 'use' || !rawValue ? 'none' : rawValue;
      setBranchTransformation(normalized);
    },
    [setBranchTransformation]
  );

  return (
    <SidebarMenuSub>
      <SidebarMenuSubItem>
        <div className="flex flex-col gap-2 px-2 py-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <GitGraph className="size-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-wider">Branch Lengths</span>
          </div>
          <Select
            value={branchTransformation && branchTransformation !== 'none' ? branchTransformation : 'use'}
            onValueChange={handleBranchOptionChange}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="use">Use Branch Lengths</SelectItem>
              <SelectItem value="ignore">Ignore Branch Lengths</SelectItem>
              <SelectItem value="log">Log Scale</SelectItem>
              <SelectItem value="sqrt">Square Root Scale</SelectItem>
              <SelectItem value="power2">Square Values (x²)</SelectItem>
              <SelectItem value="linear-scale">Double Lengths (2x)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SidebarMenuSubItem>
    </SidebarMenuSub>
  );
}

export default TreeStructure;
