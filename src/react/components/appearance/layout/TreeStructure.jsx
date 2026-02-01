import React, { useCallback } from 'react';
import { useAppStore } from '../../../../js/core/store.js';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { SidebarMenuSub, SidebarMenuSubItem } from '@/components/ui/sidebar';
import { GitGraph } from 'lucide-react';

export function TreeStructure() {
  const branchTransformation = useAppStore((s) => s.branchTransformation);
  const setBranchTransformation = useAppStore((s) => s.setBranchTransformation);
  const treeControllers = useAppStore((s) => s.treeControllers);

  const handleBranchOptionChange = useCallback(
    async (rawValue) => {
      const normalized = rawValue === 'use' || !rawValue ? 'none' : rawValue;

      setBranchTransformation(normalized);

      requestAnimationFrame(async () => {
        try {
          const state = useAppStore.getState();
          for (const controller of treeControllers) {
            controller?.resetInterpolationCaches?.();
            await controller?.initializeUniformScaling?.(normalized);
            await controller?.updateLayout?.(
              state.treeList[state.currentTreeIndex],
              state.currentTreeIndex
            );
            await controller?.renderAllElements?.();
          }
        } catch (error) {
          console.warn('[TreeStructure] Failed to update layout for branch transformation:', error);
        }
      });
    },
    [setBranchTransformation, treeControllers]
  );

  return (
    <SidebarMenuSub>
      <SidebarMenuSubItem>
        <div className="flex flex-col gap-2 px-2 py-1.5">
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
              <SelectItem value="log">Log Transform</SelectItem>
              <SelectItem value="sqrt">Square Root</SelectItem>
              <SelectItem value="power2">Power (x²)</SelectItem>
              <SelectItem value="linear-scale">Linear Scale (2x)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SidebarMenuSubItem>
    </SidebarMenuSub>
  );
}

export default TreeStructure;
