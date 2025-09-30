import React from 'react';
import { useAppStore } from '../../js/core/store.js';

export function ButtonsMSA() {
  const hasMsa = useAppStore((s) => (s.msaColumnCount || 0) > 0 || !!s.movieData?.msa?.sequences);
  const syncMSAEnabled = useAppStore((s) => s.syncMSAEnabled);
  const setSyncMSAEnabled = useAppStore((s) => s.setSyncMSAEnabled);

  // Reflect the store state into the switch by setting both selected and checked for robustness
  const switchProps = hasMsa
    ? { selected: syncMSAEnabled ? '' : undefined, checked: syncMSAEnabled ? true : undefined }
    : { disabled: true };

  const openViewer = async () => {
    if (!hasMsa) return;
    try {
      const [{ showMSAViewer }, { phyloData }] = await Promise.all([
        import('../../js/msaViewer/index.js'),
        import('../../js/services/dataService.js')
      ]);
      const data = await (phyloData.get());
      if (!data?.msa?.sequences) {
        try { (await import('../../js/partial/eventHandlers/notificationSystem.js')).notifications.show('No alignment data available. Please upload an MSA file.', 'warning'); } catch {}
        return;
      }
      await showMSAViewer(data);
    } catch (e) {
      console.error('[ButtonsMSA] Failed to open MSA viewer:', e);
    }
  };

  return (
    <div data-react-component="buttons-msa">
      <div className="msa-header">
        <md-icon className="icon-primary">biotech</md-icon>
        <h3
          className="md-typescale-title-medium section-title"
          title="Multiple Sequence Alignment - shows how DNA/protein sequences compare"
        >
          MSA Viewer
        </h3>
      </div>

      <div className="msa-group" role="group" aria-label="MSA operations" id="msa-controls">
        <md-filled-button
          id="msa-viewer-btn"
          has-icon
          className="flex-1 minw-200"
          type="button"
          title={hasMsa ? 'Open the Multiple Sequence Alignment (MSA) viewer for the current window' : 'No alignment loaded'}
          aria-label="Open alignment viewer"
          onClick={openViewer}
          {...(!hasMsa ? { disabled: true, 'aria-disabled': 'true' } : {})}
        >
          <md-icon slot="icon">biotech</md-icon>
          Open Alignment Viewer
        </md-filled-button>

        <label className="row-16 msa-switch-row flex-1 minw-200">
          <md-switch
            id="enable-msa-sync-btn"
            aria-label="Toggle MSA sync"
            {...switchProps}
            onChange={(e) => setSyncMSAEnabled(!!e.target.selected)}
          ></md-switch>
          <div className="flex-1">
            <div style={{ fontWeight: 500 }}>
              <md-icon className="icon-small">sync</md-icon>
              Sync MSA Window
            </div>
            <div className="md-typescale-body-medium muted-text">Keep the MSA region aligned with the current tree position</div>
          </div>
        </label>
      </div>

      <md-divider></md-divider>

      <md-chip-set id="msa-status-chips" aria-live="polite">
        <md-assist-chip id="msa-status-empty" data-state="empty" hidden={hasMsa ? true : undefined} disabled aria-disabled="true">
          <md-icon slot="icon">info</md-icon>
          <span>No alignment data loaded</span>
        </md-assist-chip>
        <md-assist-chip id="msa-status-loaded" data-state="loaded" hidden={hasMsa ? undefined : true} disabled aria-disabled="true">
          <md-icon slot="icon">done</md-icon>
          <span>Alignment loaded</span>
        </md-assist-chip>
      </md-chip-set>
    </div>
  );
}
