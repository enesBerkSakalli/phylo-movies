import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, ChevronDown, FileText } from 'lucide-react';
import { MsaSidebarSection } from './MsaSidebarSection.jsx';
import { TreeStructureGroup } from '../appearance/layout/TreeStructureGroup.jsx';
import {
  GeometryDimensionsSection,
  LayoutTransformSection,
} from '../appearance/controls/VisualStyle/VisualStyle.jsx';
import { ViewModeSection } from '../appearance/ViewModeSection.jsx';
import { TaxaAndHighlightsSection } from '../appearance/controls/VisualElements/TaxaAndHighlightsSection.jsx';
import { FocusAndChangeEffects } from '../appearance/FocusAndChangeEffects.jsx';
import { TreeStatsPanel } from '../TreeStatsPanel/TreeStatsPanel.tsx';
import { TaxaGroupsLegend } from '../TreeStatsPanel/Shared/TaxaLegend';
import AnalyticsDashboard from '../TreeStatsPanel/AnalyticsDashboard.tsx';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from '../ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { TOOLS_SIDEBAR_GROUP_LABELS } from './ToolsSidebar.contract.js';
import { SPR_ANALYTICS_COPY } from '../TreeStatsPanel/AnalyticsDashboard.contract.ts';
import { selectTreeHydrationStats, useAppStore } from '../../state/phyloStore/store.js';

const phyloTreeIcon = `${import.meta.env.BASE_URL}icons/phylo-tree-icon.svg`;

export function ToolsSidebar({
  fileName,
  datasetProvenance,
  error,
  sprAnalyticsOpen,
  isSprAnalyticsActive,
  onOpenSprAnalytics,
  onCloseSprAnalytics,
  onFocusSprAnalytics,
  onOpenTaxaColoring,
}) {
  const navigate = useNavigate();
  const handleReturnHome = React.useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <>
      <Sidebar collapsible="icon" data-tour-id="workspace-sidebar">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-12">
                <div className="flex items-center gap-3 w-full" aria-label="Phylo-Movies">
                  <img
                    src={phyloTreeIcon}
                    alt=""
                    aria-hidden="true"
                    className="size-8 shrink-0 rounded-lg"
                  />
                  <div className="flex flex-col gap-1 leading-none group-data-[collapsible=icon]:hidden overflow-hidden">
                    <span className="font-semibold truncate">Phylo-Movies</span>
                    <span className="text-2xs text-muted-foreground truncate">
                      {error ? `Error: ${error}` : fileName}
                    </span>
                  </div>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{TOOLS_SIDEBAR_GROUP_LABELS[0]}</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Change dataset" onClick={handleReturnHome}>
                  <ArrowLeft className="size-4" />
                  <span>Change Dataset</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <DatasetProvenanceItem fileName={fileName} provenance={datasetProvenance} />
              <MsaSidebarSection />
            </SidebarMenu>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel>{TOOLS_SIDEBAR_GROUP_LABELS[1]}</SidebarGroupLabel>
            <SidebarMenu>
              <TreeStructureGroup />
              <LayoutTransformSection />
            </SidebarMenu>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel>{TOOLS_SIDEBAR_GROUP_LABELS[2]}</SidebarGroupLabel>
            <SidebarMenu>
              <GeometryDimensionsSection />
              <TaxaAndHighlightsSection onOpenTaxaColoring={onOpenTaxaColoring} />
              <TaxaGroupsLegend />
            </SidebarMenu>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel>{TOOLS_SIDEBAR_GROUP_LABELS[3]}</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={SPR_ANALYTICS_COPY.openLabel}
                  aria-label={SPR_ANALYTICS_COPY.openLabel}
                  aria-pressed={sprAnalyticsOpen}
                  isActive={sprAnalyticsOpen || isSprAnalyticsActive}
                  onClick={sprAnalyticsOpen ? onFocusSprAnalytics : onOpenSprAnalytics}
                >
                  <Activity className="text-primary" />
                  <span>{SPR_ANALYTICS_COPY.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <TreeStatsPanel />
            </SidebarMenu>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel>{TOOLS_SIDEBAR_GROUP_LABELS[4]}</SidebarGroupLabel>
            <SidebarMenu>
              <ViewModeSection />
              <FocusAndChangeEffects />
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>

      <AnalyticsDashboard
        isOpen={sprAnalyticsOpen}
        isActive={isSprAnalyticsActive}
        onClose={onCloseSprAnalytics}
        onFocus={onFocusSprAnalytics}
      />
    </>
  );
}

export default ToolsSidebar;

function DatasetProvenanceItem({ fileName, provenance }) {
  const settings = Array.isArray(provenance?.settings) ? provenance.settings : [];
  const hydrationStats = useAppStore(selectTreeHydrationStats);
  const hydratedPercent = Math.round(hydrationStats.hydratedPercent * 100);

  return (
    <Collapsible asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip="Dataset provenance">
            <FileText className="text-primary" />
            <span className="min-w-0 flex-1 truncate">Provenance</span>
            <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            <SidebarMenuSubItem>
              <div className="space-y-2 px-2 py-2 text-2xs leading-relaxed text-muted-foreground">
                <ProvenanceField label="Dataset" value={fileName} />
                <ProvenanceField label="Source" value={provenance?.source_label} />
                <ProvenanceField label="Tree source" value={provenance?.tree_source} />
                {provenance?.alignment_source && (
                  <ProvenanceField label="Alignment" value={provenance.alignment_source} />
                )}
                {settings.length > 0 && (
                  <div className="space-y-1">
                    <div className="font-semibold uppercase tracking-wider text-foreground/70">
                      Settings
                    </div>
                    {settings.map((setting, index) => (
                      <ProvenanceField
                        key={`${setting.label}-${index}`}
                        label={setting.label}
                        value={setting.value}
                      />
                    ))}
                  </div>
                )}
                {hydrationStats.totalTrees > 0 && (
                  <div className="space-y-1">
                    <div className="font-semibold uppercase tracking-wider text-foreground/70">
                      Runtime
                    </div>
                    <ProvenanceField
                      label="Hydrated trees"
                      value={`${hydrationStats.hydratedTrees}/${hydrationStats.totalTrees} (${hydratedPercent}%)`}
                    />
                    <ProvenanceField
                      label="Compact payload"
                      value={`${hydrationStats.compactPayloadTrees}/${hydrationStats.totalTrees} trees`}
                    />
                  </div>
                )}
              </div>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function ProvenanceField({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <span className="font-semibold text-foreground/70">{label}:</span>{' '}
      <span className="break-words">{value}</span>
    </div>
  );
}
