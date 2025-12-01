import React, { useCallback } from 'react';
import { useAppStore } from '../../../../js/core/store.js';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

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
    <div>
      <div className="flex flex-col gap-4">
        <div>
          <Label htmlFor="branch-length-options" className="font-medium">
            <span id="branch-length-options-label">Branch Length Options</span>
          </Label>
          <Select
            value={branchTransformation && branchTransformation !== 'none' ? branchTransformation : 'use'}
            onValueChange={handleBranchOptionChange}
          >
            <SelectTrigger aria-labelledby="branch-length-options-label">
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
      </div>
    </div>
  );
}

export default TreeStructure;
