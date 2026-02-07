// TreeStatsPanel.tsx - Main component for phylogenetic scale tracking and visualization

import React from 'react';
import { useAppStore } from '@/js/core/store';
import { useScaleMetrics } from './ScaleTracking/useScaleMetrics';
import { CurrentScaleDisplay } from './ScaleTracking/CurrentScaleDisplay';
import { BranchLengthHistogram } from './BranchLengths/BranchLengthHistogram';
import { SubtreeFrequencyList } from './SubtreeAnalytics/SubtreeFrequencyList';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight, BarChart3 } from 'lucide-react';
import { SidebarMenuItem, SidebarMenuButton, SidebarMenuSub, SidebarMenuSubItem } from '@/components/ui/sidebar';
import type { AppStoreState } from '@/types/store';

// ==========================================================================
// STORE SELECTORS
// ==========================================================================
const selectCurrentTreeIndex = (s: AppStoreState) => s.currentTreeIndex;
const selectTreeList = (s: AppStoreState) => s.treeList;
const selectScaleList = (s: AppStoreState) => s.movieData?.scaleList;
const selectMaxScale = (s: AppStoreState) => s.movieData?.maxScale || 0;
const selectFullTreeIndices = (s: AppStoreState) => s.movieData?.fullTreeIndices;
const selectTransitionResolver = (s: AppStoreState) => s.transitionResolver;
const selectBranchTransformation = (s: AppStoreState) => s.branchTransformation;

/**
 * TreeStatsPanel component displays phylogenetic scale metrics for the current tree:
 * - Current tree scale (maximum root-to-tip distance)
 * - Branch length distribution histogram
 * - Relative scale magnitude indicator
 * - Taxa groups legend
 *
 * This component uses source-target trees (not interpolated trees) for histogram calculations
 * to prevent visual jitter during animation playback.
 */
export const TreeStatsPanel: React.FC = () => {
  // Zustand state: Use granular selectors to minimize re-renders
  const currentTreeIndex = useAppStore(selectCurrentTreeIndex);
  const treeList = useAppStore(selectTreeList);
  const scaleList = useAppStore(selectScaleList);
  const maxScale = useAppStore(selectMaxScale);
  const fullTreeIndices = useAppStore(selectFullTreeIndices);
  const transitionResolver = useAppStore(selectTransitionResolver);
  const branchTransformation = useAppStore(selectBranchTransformation);

  // Compute scale metrics and histogram (memoized)
  const {
    formattedCurrent,
    formattedMax,
    progress: scaleRatio,
    histogramBins,
    histogramMax,
    histogramStats
  } = useScaleMetrics({
    currentTreeIndex,
    treeList,
    scaleList,
    maxScale,
    fullTreeIndices,
    transitionResolver,
  });

  const showBranchLengths = branchTransformation !== 'ignore' && histogramBins.length > 0;

  return (
    <Collapsible defaultOpen asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip="View Phylogenetic Statistics">
            <BarChart3 className="size-4 text-primary" />
            <span>Tree Statistics</span>
            <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            <SidebarMenuSubItem>
              <div className="space-y-4 px-2 py-2">
                {/* Current scale value and relative magnitude */}
                <CurrentScaleDisplay
                  formattedCurrent={formattedCurrent}
                  formattedMax={formattedMax}
                  magnitudeFactor={scaleRatio}
                />

                {/* Branch length histogram */}
                {showBranchLengths ? (
                  <BranchLengthHistogram
                    bins={histogramBins}
                    maxCount={histogramMax}
                    stats={histogramStats}
                  />
                ) : null}

                {/* SPR Event Analytics */}
                <SubtreeFrequencyList />
              </div>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
};
