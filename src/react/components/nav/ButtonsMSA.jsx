import React from 'react';
import { useAppStore } from '../../../js/core/store.js';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dna, RefreshCw, Info, Check } from 'lucide-react';
import { SidebarMenuButtons } from '@/components/ui/sidebar-menu-buttons';

export function ButtonsMSA() {
  const hasMsa = useAppStore((s) => (s.msaColumnCount || 0) > 0 || !!s.movieData?.msa?.sequences);
  const syncMSAEnabled = useAppStore((s) => s.syncMSAEnabled);
  const setSyncMSAEnabled = useAppStore((s) => s.setSyncMSAEnabled);
  const openMsaViewer = useAppStore((s) => s.openMsaViewer);

  const handleOpenViewer = async () => {
    if (!hasMsa) return;

    try {
      const [{ notifications }] = await Promise.all([
        import('../../../js/services/ui/notifications.js')
      ]);

      const data = useAppStore.getState().movieData;

      if (!data?.msa?.sequences) {
        notifications.show('No alignment data available. Please upload an MSA file.', 'warning');
        return;
      }

      openMsaViewer();
    } catch (error) {
      console.error('[ButtonsMSA] Failed to open MSA viewer:', error);
    }
  };

  const handleSyncToggle = () => {
    if (!hasMsa) return;
    setSyncMSAEnabled(!syncMSAEnabled);
  };

  const handleLabelClick = (event) => {
    if (event.target?.closest?.('[data-slot="switch"]')) return;
    handleSyncToggle();
  };

  return (
    <div data-react-component="buttons-msa" className="space-y-4">
      <div
        className="flex flex-wrap gap-2 mb-4"
        role="group"
        aria-label="MSA operations"
        id="msa-controls"
      >
        <SidebarMenuButtons
          items={[{
            id: 'msa-viewer-btn',
            label: 'Open Alignment Viewer',
            title: hasMsa
              ? 'Open the Multiple Sequence Alignment (MSA) viewer for the current window'
              : 'No alignment loaded',
            ariaLabel: 'Open alignment viewer',
            onClick: handleOpenViewer,
            disabled: !hasMsa,
            icon: <Dna className="size-4" />
          }]}
        />

        <label
          className="flex items-center gap-3 p-3 rounded-md bg-card hover:bg-card/80 cursor-pointer transition-colors min-w-[200px] border border-border"
          onClick={handleLabelClick}
        >
          <Switch
            id="enable-msa-sync-btn"
            aria-label="Toggle MSA sync"
            checked={!!syncMSAEnabled && !!hasMsa}
            onCheckedChange={(checked) => setSyncMSAEnabled(!!checked)}
            disabled={!hasMsa}
          />

          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 font-medium">
              <RefreshCw className="size-4" />
              <span>Sync MSA Window</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Keep the MSA region aligned with the current tree position
            </p>
          </div>
        </label>
      </div>

      <div
        id="msa-status-chips"
        aria-live="polite"
        className="flex gap-2 flex-wrap"
      >
        {!hasMsa && (
          <Badge
            id="msa-status-empty"
            variant="secondary"
            aria-disabled="true"
          >
            <Info className="size-3 mr-1" />
            No alignment data loaded
          </Badge>
        )}

        {hasMsa && (
          <Badge
            id="msa-status-loaded"
            variant="default"
            aria-disabled="true"
          >
            <Check className="size-3 mr-1" />
            Alignment loaded
          </Badge>
        )}
      </div>
    </div>
  );
}

export default ButtonsMSA;
