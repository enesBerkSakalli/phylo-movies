import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, ArrowLeft, Activity } from 'lucide-react';
import { MsaSidebarSection } from './MsaSidebarSection.jsx';
import { TreeStructureGroup } from '../appearance/layout/TreeStructureGroup.jsx';
import { VisualStyle } from '../appearance/controls/VisualStyle/VisualStyle.jsx';
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
} from '../ui/sidebar';
import { TOOLS_SIDEBAR_GROUP_LABELS } from './ToolsSidebar.contract.js';
import { SPR_ANALYTICS_COPY } from '../TreeStatsPanel/AnalyticsDashboard.contract.ts';

export function ToolsSidebar({
  fileName,
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
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-12">
                <div className="flex items-center gap-3 w-full">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                    <Film className="size-5" />
                  </div>
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
                <SidebarMenuButton
                  tooltip="Change dataset"
                  onClick={handleReturnHome}
                >
                  <ArrowLeft className="size-4" />
                  <span>Change Dataset</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <MsaSidebarSection />
            </SidebarMenu>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel>{TOOLS_SIDEBAR_GROUP_LABELS[1]}</SidebarGroupLabel>
            <SidebarMenu>
              <TreeStructureGroup />
              <VisualStyle />
              <ViewModeSection />
            </SidebarMenu>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel>{TOOLS_SIDEBAR_GROUP_LABELS[2]}</SidebarGroupLabel>
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
            <SidebarGroupLabel>{TOOLS_SIDEBAR_GROUP_LABELS[3]}</SidebarGroupLabel>
            <SidebarMenu>
              <TaxaAndHighlightsSection onOpenTaxaColoring={onOpenTaxaColoring} />
              <TaxaGroupsLegend />
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
