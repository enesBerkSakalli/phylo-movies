// TreeStatsPanel.tsx - Main component for phylogenetic scale tracking and visualization

import React from 'react';
import {
  selectActiveTreeList,
  selectBranchTransformation,
  selectMaxScale,
  selectScaleList,
  selectTimelineCursor,
  useAppStore,
} from '../../state/phyloStore/store.js';
import { useScaleMetrics } from './ScaleTracking/useScaleMetrics';
import { CurrentScaleDisplay } from './ScaleTracking/CurrentScaleDisplay';
import { BranchLengthHistogram } from './BranchLengths/BranchLengthHistogram';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ChevronDown, BarChart3 } from 'lucide-react';
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from '../ui/sidebar';
/**
 * TreeStatsPanel component displays phylogenetic scale metrics for the current tree:
 * - Current tree scale (maximum root-to-tip distance)
 * - Branch length distribution histogram
 * - Relative scale magnitude indicator
 * - Taxa groups legend
 *
 * This component uses input trees (not transition frames) for histogram calculations
 * to prevent visual jitter during animation playback.
 */
export const TreeStatsPanel: React.FC = () => {
  return (
    <Collapsible asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip="Tree Metrics">
            <BarChart3 className="text-primary" />
            <span>Tree Metrics</span>
            <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <TreeStatsPanelBody />
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
};

const selectSourceFrameIndex = (state: Parameters<typeof selectTimelineCursor>[0]) =>
  selectTimelineCursor(state)?.sourceFrameIndex ?? 0;

const TreeStatsPanelBody: React.FC = () => {
  const sourceFrameIndex = useAppStore(selectSourceFrameIndex);
  const treeList = useAppStore(selectActiveTreeList);
  const scaleList = useAppStore(selectScaleList);
  const maxScale = useAppStore(selectMaxScale);
  const branchTransformation = useAppStore(selectBranchTransformation);

  const {
    formattedCurrent,
    formattedMax,
    progress: scaleRatio,
    histogramBins,
    histogramMax,
    histogramStats,
  } = useScaleMetrics({
    sourceFrameIndex,
    treeList,
    scaleList,
    maxScale,
  });

  const showBranchLengths = branchTransformation !== 'ignore' && histogramBins.length > 0;

  return (
    <SidebarMenuSub>
      <SidebarMenuSubItem>
        <div className="flex flex-col gap-4 px-2 py-2">
          <CurrentScaleDisplay
            formattedCurrent={formattedCurrent}
            formattedMax={formattedMax}
            magnitudeFactor={scaleRatio}
          />

          {showBranchLengths ? (
            <BranchLengthHistogram
              bins={histogramBins}
              maxCount={histogramMax}
              stats={histogramStats}
            />
          ) : null}
        </div>
      </SidebarMenuSubItem>
    </SidebarMenuSub>
  );
};
