import React from 'react';
import { useAppStore } from '../../js/core/store.js';

// React version of src/partials/buttons-file-ops.html
// Keep IDs and structure to preserve existing event handler wiring
export function ButtonsFileOps() {
  const gui = useAppStore((s) => s.gui);
  return (
    <>
      <div className="file-ops-header">
        <md-icon className="icon-primary">folder_open</md-icon>
        <h3 className="md-typescale-title-medium section-title">File Operations</h3>
      </div>

      <div className="file-ops-group" role="group" aria-label="File operations">
        <md-filled-button
          id="save-button"
          has-icon
          title="Save current tree visualization as SVG"
          aria-label="Save SVG"
          onClick={() => gui?.saveImage?.()}
        >
          <md-icon slot="icon">download</md-icon>
          Save Image
        </md-filled-button>

        <md-filled-button
          id="compare-sequence-button"
          has-icon
          title="Compare the current tree with the next tree"
          aria-label="Compare trees"
          disabled
        >
          <md-icon slot="icon">compare_arrows</md-icon>
          Compare Trees
        </md-filled-button>
      </div>

      <md-divider></md-divider>
    </>
  );
}
