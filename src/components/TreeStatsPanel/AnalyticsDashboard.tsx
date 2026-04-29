import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart, Activity, ListTree, BookOpen, ChevronDown, Download } from 'lucide-react';
import { SprActivityTimeline } from './SubtreeAnalytics/SprActivityTimeline';
import { SubtreeFrequencyBarChart } from './SubtreeAnalytics/SubtreeFrequencyBarChart';
import { SprFrequencyTable } from './SubtreeAnalytics/SprFrequencyTable';
import { SprPairActivityTable } from './SubtreeAnalytics/SprPairActivityTable';
import { SprSummaryMetrics } from './SubtreeAnalytics/SprSummaryMetrics';
import {
    createSprFrequencyCsv,
    createSprFrequencyExportName,
    downloadCsvFile,
} from './SubtreeAnalytics/sprFrequencyCsv';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/state/phyloStore/store.js';
import {
    calculateSprDatasetSummary,
    calculateSprMoverFrequencies,
    calculateSprPairActivity,
} from '@/domain/tree/sprAnalyticsUtils';
import { Button } from '@/components/ui/button';
import { AppStoreState } from '@/types/store';
import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';

// ==========================================================================
// STORE SELECTORS
// ==========================================================================
const EMPTY_ARRAY: any[] = [];
const selectPairSolutions = (s: AppStoreState) => s.pairSolutions;
const selectSortedLeaves = (s: AppStoreState) => s.movieData?.sorted_leaves || EMPTY_ARRAY;
const selectFileName = (s: AppStoreState) => s.fileName || s.movieData?.file_name || 'dataset';
const selectDistanceRfd = (s: AppStoreState) => s.distanceRfd || EMPTY_ARRAY;
const selectDistanceWeightedRfd = (s: AppStoreState) => s.distanceWeightedRfd || EMPTY_ARRAY;
const selectPairInterpolationRanges = (s: AppStoreState) => s.pairInterpolationRanges || EMPTY_ARRAY;
const selectMarkedNodes = (s: AppStoreState) => s.manuallyMarkedNodes || EMPTY_ARRAY;

interface SprDatasetSummary {
    pairCount: number;
    activePairCount: number;
    transitionEventCount: number;
    moverOccurrenceCount: number;
    uniqueMovingSubtreeCount: number;
    singletonMoverOccurrences: number;
    cladeMoverOccurrences: number;
    maxPairMoverOccurrenceCount: number;
    topMoverSharePercentage: number;
}

export const AnalyticsDashboard = () => {
    const pairSolutions = useAppStore(selectPairSolutions);
    const sortedLeaves = useAppStore(selectSortedLeaves);
    const fileName = useAppStore(selectFileName);
    const robinsonFouldsDistances = useAppStore(selectDistanceRfd);
    const weightedRobinsonFouldsDistances = useAppStore(selectDistanceWeightedRfd);
    const pairInterpolationRanges = useAppStore(selectPairInterpolationRanges);
    const selectedMoverIndices = useAppStore(selectMarkedNodes);

    const sprOptions = useMemo(() => ({
        robinsonFouldsDistances,
        weightedRobinsonFouldsDistances,
        pairInterpolationRanges,
    }), [robinsonFouldsDistances, weightedRobinsonFouldsDistances, pairInterpolationRanges]);

    const allFreqs = useMemo(() => {
        if (!pairSolutions || Object.keys(pairSolutions).length === 0) return [];
        return calculateSprMoverFrequencies(pairSolutions);
    }, [pairSolutions]);

    const sprSummary = useMemo<SprDatasetSummary>(() => {
        return calculateSprDatasetSummary(pairSolutions, sprOptions) as SprDatasetSummary;
    }, [pairSolutions, sprOptions]);

    const pairActivityRows = useMemo(() => {
        return calculateSprPairActivity(pairSolutions, sprOptions);
    }, [pairSolutions, sprOptions]);

    const singletonMoverPercentage = sprSummary.moverOccurrenceCount > 0
        ? (sprSummary.singletonMoverOccurrences / sprSummary.moverOccurrenceCount) * 100
        : 0;

    const csvContent = useMemo(() => {
        return createSprFrequencyCsv(allFreqs, sortedLeaves);
    }, [allFreqs, sortedLeaves]);

    const handleExportCsv = () => {
        if (!csvContent) return;
        downloadCsvFile(csvContent, createSprFrequencyExportName(fileName));
    };

    return (
        <Dialog>
            <SidebarMenuItem>
                <DialogTrigger asChild>
                    <SidebarMenuButton tooltip="Open SPR Moves" aria-label="Open SPR Moves">
                        <Activity className="text-primary" />
                        <span>SPR Moves</span>
                    </SidebarMenuButton>
                </DialogTrigger>
            </SidebarMenuItem>
            <DialogContent className="sm:max-w-6xl max-h-[85vh] h-full flex flex-col overflow-hidden">
                <DialogHeader className="shrink-0 pr-10 pb-4 border-b border-border/20">
                    <DialogTitle className="text-xl font-bold tracking-tight">SPR Moves</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground/80">
                        See which groups of taxa move between neighboring trees.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="overview" className="flex flex-col flex-1 min-h-0 pt-4 overflow-hidden">
                    <TabsList className="w-full justify-start mb-4 shrink-0 bg-muted/30 p-1">
                        <TabsTrigger value="overview" className="px-6 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Overview</TabsTrigger>
                        <TabsTrigger value="pairs" className="px-6 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Tree Pairs</TabsTrigger>
                        <TabsTrigger value="details" className="px-6 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">All Groups</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="flex-1 min-h-0 mt-0 focus-visible:outline-none">
                        <ScrollArea className="h-full -mx-6 px-6">
                            <div className="pb-6 space-y-4">
                                <Card className="bg-primary/5 border-primary/20 p-3 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-2xs font-bold uppercase tracking-wider text-primary">
                                        <BookOpen className="size-3" />
                                        What is being counted?
                                    </div>
                                    <p className="text-2xs leading-relaxed text-muted-foreground">
                                        <strong>SPR</strong> is the solver operation that moves a group of taxa from one attachment point to another between neighboring trees. Each count is one moved group, not an animation frame.
                                    </p>
                                </Card>

                                <SprSummaryMetrics
                                    distinctMoverCount={sprSummary.uniqueMovingSubtreeCount}
                                    totalMoverOccurrences={sprSummary.moverOccurrenceCount}
                                    transitionEventCount={sprSummary.transitionEventCount}
                                    activePairCount={sprSummary.activePairCount}
                                    singletonMoverPercentage={singletonMoverPercentage}
                                    topMoverPercentage={sprSummary.topMoverSharePercentage}
                                />

                                <Card className="shadow-sm bg-muted/10 h-80 flex flex-col">
                                    <CardHeader className="pb-3 bg-muted/20 shrink-0">
                                        <CardTitle className="flex items-center gap-2 text-base font-bold">
                                            <Activity className="size-4 text-primary" />
                                            Moves Across Tree Pairs
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Moved groups per neighboring tree pair, with tree-change scores for context.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1 min-h-0 p-2">
                                        <SprActivityTimeline rows={pairActivityRows} />
                                    </CardContent>
                                </Card>

                                <Card className="shadow-sm bg-muted/10 h-96 flex flex-col">
                                    <CardHeader className="pb-3 bg-muted/20 shrink-0">
                                        <CardTitle className="flex items-center gap-2 text-base font-bold">
                                            <BarChart className="size-4 text-primary" />
                                            Groups That Move Most Often
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Top taxa groups that moved in the SPR solver results.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1 min-h-0 p-2">
                                        <SubtreeFrequencyBarChart />
                                    </CardContent>
                                </Card>
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="pairs" className="flex-1 min-h-0 mt-0 focus-visible:outline-none flex flex-col">
                        <Card className="shadow-sm bg-muted/10 flex-1 flex flex-col min-h-0">
                            <CardHeader className="pb-3 bg-muted/20 shrink-0">
                                <CardTitle className="flex items-center gap-2 text-base font-bold">
                                    <Activity className="size-4 text-primary" />
                                    Moves by Tree Pair
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Moves, solver steps, tree-change scores, and from/to attachment context for each neighboring tree pair.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
                                <SprPairActivityTable
                                    rows={pairActivityRows}
                                    sortedLeaves={sortedLeaves}
                                    selectedMoverIndices={selectedMoverIndices}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="details" className="flex-1 min-h-0 mt-0 focus-visible:outline-none flex flex-col">
                        <Card className="shadow-sm bg-muted/10 flex-1 flex flex-col min-h-0">
                            <CardHeader className="pb-3 bg-muted/20 shrink-0">
                                <CardTitle className="flex items-center gap-2 text-base font-bold">
                                    <ListTree className="size-4 text-primary" />
                                    All Moved Groups
                                </CardTitle>
                                <CardDescription className="text-xs flex items-center justify-between gap-2">
                                    <span>Every moved group counted from SPR solver results.</span>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {allFreqs.length > 5 && (
                                            <span className="flex items-center gap-1 text-muted-foreground/60 shrink-0 ml-2">
                                                <ChevronDown className="size-3 animate-bounce" />
                                                <span className="text-2xs">{allFreqs.length} items · scroll</span>
                                            </span>
                                        )}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="xs"
                                            className="gap-1"
                                            onClick={handleExportCsv}
                                            disabled={allFreqs.length === 0}
                                        >
                                            <Download className="size-3" />
                                            Export CSV
                                        </Button>
                                    </div>
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 min-h-0 overflow-y-auto">
                                <SprFrequencyTable frequencies={allFreqs} sortedLeaves={sortedLeaves} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

export default AnalyticsDashboard;
