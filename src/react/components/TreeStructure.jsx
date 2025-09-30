import React, { useCallback } from 'react';
import { useAppStore } from '../../js/core/store.js';

export function TreeStructure() {
  const branchTransformation = useAppStore((s) => s.branchTransformation);
  const setBranchTransformation = useAppStore((s) => s.setBranchTransformation);
  const treeController = useAppStore((s) => s.treeController);

  const handleBranchOptionChange = useCallback(
    (event) => {
      const rawValue = event?.target?.value ?? 'use';
      const normalized = rawValue === 'use' || !rawValue ? 'none' : rawValue;

      setBranchTransformation(normalized);

      // Recalculate scaling/layout with the new transformation before rendering
      requestAnimationFrame(() => {
        try {
          const state = useAppStore.getState();
          treeController?.initializeUniformScaling?.(normalized);
          treeController?.updateLayout?.(
            state.treeList[state.currentTreeIndex],
            state.currentTreeIndex
          );
        } catch (error) {
          console.warn('[TreeStructure] Failed to update layout for branch transformation:', error);
        }

        try {
          treeController?.renderAllElements?.();
        } catch (error) {
          console.warn('[TreeStructure] Failed to render elements after branch transformation change:', error);
        }
      });
    },
    [setBranchTransformation, treeController]
  );

  return (
    <div>
      <h3 className="md-typescale-title-medium section-title">
        <md-icon className="icon-small">account_tree</md-icon>
        Tree Structure
      </h3>

      <div className="section-body">
        {/* Branch Length Options */}
        <div>
          <label className="control-label">
            <span id="branch-length-options-label">Branch Length Options</span>
          </label>
          <md-outlined-select
            id="branch-length-options"
            className="full-width"
            value={branchTransformation && branchTransformation !== 'none' ? branchTransformation : 'use'}
            aria-labelledby="branch-length-options-label"
            onChange={handleBranchOptionChange}
            onInput={handleBranchOptionChange}
          >
            <md-select-option value="use">
              <div slot="headline">Use Branch Lengths</div>
            </md-select-option>
            <md-select-option value="ignore">
              <div slot="headline">Ignore Branch Lengths</div>
            </md-select-option>
            <md-select-option value="log">
              <div slot="headline">Log Transform</div>
            </md-select-option>
            <md-select-option value="sqrt">
              <div slot="headline">Square Root</div>
            </md-select-option>
            <md-select-option value="power2">
              <div slot="headline">Power (x²)</div>
            </md-select-option>
            <md-select-option value="linear-scale">
              <div slot="headline">Linear Scale (2x)</div>
            </md-select-option>
          </md-outlined-select>
        </div>
      </div>
    </div>
  );
}

