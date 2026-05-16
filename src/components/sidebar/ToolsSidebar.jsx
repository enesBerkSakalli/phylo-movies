import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, ArrowLeft } from 'lucide-react';
import { ButtonsMSA } from '../nav/ButtonsMSA.jsx';
import { TreeStructureGroup } from '../appearance/layout/TreeStructureGroup.jsx';
import { VisualStyle } from '../appearance/controls/VisualStyle/VisualStyle.jsx';
import { ViewModeSection } from '../appearance/ViewModeSection.jsx';
import { VisualElements } from '../appearance/controls/VisualElements/VisualElements.jsx';
import { Appearance } from '../appearance/Appearance.jsx';
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

export function ToolsSidebar({
  fileName,
  error,
  sprAnalyticsOpen,
  isSprAnalyticsActive,
  onOpenSprAnalytics,
  onCloseSprAnalytics,
  onFocusSprAnalytics,
}) {
  const navigate = useNavigate();
  const handleReturnHome = React.useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
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
          <SidebarGroupLabel>Dataset</SidebarGroupLabel>
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
            <ButtonsMSA />
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Tree View</SidebarGroupLabel>
          <SidebarMenu>
            <TreeStructureGroup />
            <VisualStyle />
            <ViewModeSection />
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Analysis</SidebarGroupLabel>
          <SidebarMenu>
            <AnalyticsDashboard
              isOpen={sprAnalyticsOpen}
              isActive={isSprAnalyticsActive}
              onOpen={onOpenSprAnalytics}
              onClose={onCloseSprAnalytics}
              onFocus={onFocusSprAnalytics}
            />
            <TreeStatsPanel />
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Color & Focus</SidebarGroupLabel>
          <SidebarMenu>
            <VisualElements />
            <TaxaGroupsLegend />
            <Appearance />
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

export default ToolsSidebar;
