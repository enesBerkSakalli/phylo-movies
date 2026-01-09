import { useAppStore } from '../../../js/core/store.js';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dna, RefreshCw, Info, Check, ChevronDown, AlignJustify } from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuBadge,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

export function ButtonsMSA() {
  const hasMsa = useAppStore((s) => s.hasMsa);
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
  return (
    <Collapsible defaultOpen asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip="Multiple Sequence Alignment">
            <Dna className="text-primary" />
            <span>Multiple Sequence Alignment</span>
            <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>

        {hasMsa && (
          <SidebarMenuBadge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none group-data-[collapsible=icon]:hidden">
            Active
          </SidebarMenuBadge>
        )}

        <CollapsibleContent>
          <SidebarMenuSub>
            <SidebarMenuSubItem>
              <SidebarMenuSubButton
                onClick={handleOpenViewer}
                disabled={!hasMsa}
                size="md"
              >
                <Dna className="size-4" />
                <span>Open Alignment Viewer</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>

            <SidebarMenuSubItem>
              <div className="flex items-center justify-between px-2 py-1.5 w-full">
                <div className="flex items-center gap-2 overflow-hidden">
                  <RefreshCw className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-foreground/70 truncate">Sync Window</span>
                </div>
                <Switch
                  id="enable-msa-sync-btn"
                  aria-label="Toggle MSA sync"
                  checked={!!syncMSAEnabled && !!hasMsa}
                  onCheckedChange={(checked) => setSyncMSAEnabled(!!checked)}
                  disabled={!hasMsa}
                  className="scale-75 origin-right"
                />
              </div>
            </SidebarMenuSubItem>

            {!hasMsa && (
              <SidebarMenuSubItem className="px-2 py-2">
                <div className="flex items-start gap-2 text-[10px] text-muted-foreground italic leading-tight">
                  <Info className="size-3 shrink-0 mt-0.5" />
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

