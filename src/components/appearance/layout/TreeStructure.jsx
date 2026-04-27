import React, { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '@/state/phyloStore/store.js';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { SidebarMenuSub, SidebarMenuSubItem } from '@/components/ui/sidebar';
import { GitGraph } from 'lucide-react';

// ==========================================================================
// STORE SELECTORS
// ==========================================================================
const selectBranchTransformation = (s) => s.branchTransformation;
const selectSetBranchTransformation = (s) => s.setBranchTransformation;
const selectTreeControllers = (s) => s.treeControllers;

export function TreeStructure() {
  const branchTransformation = useAppStore(selectBranchTransformation);
  const setBranchTransformation = useAppStore(selectSetBranchTransformation);
  const treeControllers = useAppStore(selectTreeControllers);
  const frameRef = useRef(null);
  const updateIdRef = useRef(0);

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const handleBranchOptionChange = useCallback(
    async (rawValue) => {
      const normalized = rawValue === 'use' || !rawValue ? 'none' : rawValue;
      const updateId = updateIdRef.current + 1;
      updateIdRef.current = updateId;

      setBranchTransformation(normalized);

      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = requestAnimationFrame(async () => {
        frameRef.current = null;
        if (updateId !== updateIdRef.current) return;

        try {
          const state = useAppStore.getState();
          for (const controller of treeControllers) {
            if (updateId !== updateIdRef.current) return;
            controller?.resetInterpolationCaches?.();
            await controller?.initializeUniformScaling?.(normalized);
            if (updateId !== updateIdRef.current) return;
            await controller?.updateLayout?.(
              state.treeList[state.currentTreeIndex],
              state.currentTreeIndex
            );
            if (updateId !== updateIdRef.current) return;
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
