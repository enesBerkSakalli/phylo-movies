import { useAppStore } from '../../../js/core/store.js';
import { ToggleWithLabel } from '@/components/ui/toggle-with-label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dna, RefreshCw, Info, Check, ChevronDown, AlignJustify } from 'lucide-react';
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { toast } from 'sonner';

// ==========================================================================
// STORE SELECTORS
// ==========================================================================
const selectHasMsa = (s) => s.hasMsa;
const selectSyncMSAEnabled = (s) => s.syncMSAEnabled;
const selectSetSyncMSAEnabled = (s) => s.setSyncMSAEnabled;
const selectOpenMsaViewer = (s) => s.openMsaViewer;

export function ButtonsMSA() {
  const hasMsa = useAppStore(selectHasMsa);
  const syncMSAEnabled = useAppStore(selectSyncMSAEnabled);
  const setSyncMSAEnabled = useAppStore(selectSetSyncMSAEnabled);
  const openMsaViewer = useAppStore(selectOpenMsaViewer);

  const handleOpenViewer = async () => {
    if (!hasMsa) return;

    try {
      const data = useAppStore.getState().movieData;

      if (!data?.msa?.sequences) {
        toast.warning('No alignment data available. Please upload an MSA file.');
        return;
      }

      openMsaViewer();
    } catch (error) {
      console.error('[ButtonsMSA] Failed to open MSA viewer:', error);
    }
  };
  return (
    <Collapsible defaultOpen asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip="Multiple Sequence Alignment">
            <Dna className="text-primary" />
            <span className="truncate">Multiple Sequence Alignment</span>
            <div className="ml-auto flex items-center gap-1">
              {hasMsa && (
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none hover:bg-emerald-500/20 h-5 px-2 text-2xs font-medium transition-colors">
                  Active
                </Badge>
              )}
              <ChevronDown className="transition-transform group-data-[state=open]/collapsible:rotate-180" />
            </div>
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <SidebarMenuSub>
            <SidebarMenuSubItem>
              <Button
                onClick={handleOpenViewer}
                disabled={!hasMsa}
                variant="outline"
                className="w-full justify-start h-8 text-xs font-normal"
              >
                <Dna className="size-3.5 mr-2" />
                <span>Open Viewer</span>
              </Button>
            </SidebarMenuSubItem>

            <SidebarMenuSubItem>
              <div className="px-2 py-2">
                <ToggleWithLabel
                  id="enable-msa-sync-btn"
                  label="Sync Window"
                  checked={!!syncMSAEnabled && !!hasMsa}
                  onCheckedChange={(checked) => setSyncMSAEnabled(!!checked)}
                  disabled={!hasMsa}
                  className="w-full gap-2 justify-between"
                  switchPosition="right"
                />
              </div>
            </SidebarMenuSubItem>

            {!hasMsa && (
              <SidebarMenuSubItem className="px-2 py-2">
                <div className="flex items-start gap-2 text-2xs text-muted-foreground italic leading-tight">
                  <Info className="size-3 shrink-0 mt-1" />
                  <span>Upload an MSA file to enable alignment visualization and sync.</span>
                </div>
              </SidebarMenuSubItem>
            )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export default ButtonsMSA;

