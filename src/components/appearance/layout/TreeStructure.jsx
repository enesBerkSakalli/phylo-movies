import React, { useCallback } from 'react';
import {
  selectBranchTransformation,
  selectLinkGeometryMode,
  selectSetBranchTransformation,
  selectSetLinkGeometryMode,
  useAppStore
} from '@/state/phyloStore/store.js';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { SidebarMenuSub, SidebarMenuSubItem } from '@/components/ui/sidebar';
import { GitGraph } from 'lucide-react';

export function TreeStructure() {
  const branchTransformation = useAppStore(selectBranchTransformation);
  const linkGeometryMode = useAppStore(selectLinkGeometryMode);
  const setBranchTransformation = useAppStore(selectSetBranchTransformation);
  const setLinkGeometryMode = useAppStore(selectSetLinkGeometryMode);

  const handleBranchOptionChange = useCallback(
    (rawValue) => {
      const normalized = rawValue === 'use' || !rawValue ? 'none' : rawValue;
      setBranchTransformation(normalized);
    },
    [setBranchTransformation]
  );

  const handleLinkGeometryChange = useCallback(
    (rawValue) => {
      setLinkGeometryMode(rawValue === 'straight' ? 'straight' : 'radial-elbow');
    },
    [setLinkGeometryMode]
  );

  return (
    <SidebarMenuSub>
      <SidebarMenuSubItem>
        <div className="flex flex-col gap-3 px-2 py-2">
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

          <div className="flex items-center gap-2 text-muted-foreground">
            <GitGraph className="size-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-wider">Link Geometry</span>
          </div>
          <Select
            value={linkGeometryMode || 'radial-elbow'}
            onValueChange={handleLinkGeometryChange}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="radial-elbow">Radial Elbow</SelectItem>
              <SelectItem value="straight">Straight Lines</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SidebarMenuSubItem>
    </SidebarMenuSub>
  );
}

export default TreeStructure;
