import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Rnd } from 'react-rnd';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart, Activity, ListTree, BookOpen, ChevronDown, Download, X } from 'lucide-react';
import { SprActivityTimeline } from './SubtreeAnalytics/SprActivityTimeline';
import { SubtreeFrequencyBarChart } from './SubtreeAnalytics/SubtreeFrequencyBarChart';
import { SprFrequencyTable } from './SubtreeAnalytics/SprFrequencyTable';
import { SprMoveEventTable } from './SubtreeAnalytics/SprMoveEventTable';
import { SprSummaryMetrics } from './SubtreeAnalytics/SprSummaryMetrics';
import {
    createSprFrequencyCsv,
    createSprFrequencyExportName,
    createSprMoveEventCsv,
    createSprMoveEventExportName,
    downloadCsvFile,
} from './SubtreeAnalytics/sprFrequencyCsv';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    selectDistanceRfd,
    selectDistanceWeightedRfd,
    selectFileName,
    selectLeafNamesByIndex,
    selectMarkedNodes,
    selectPairInterpolationRanges,
    selectPairSolutions,
    useAppStore
} from '@/state/phyloStore/store.js';
import {
    buildSprMoveEventRows,
    calculateSprDatasetSummary,
    calculateSprMoverFrequencies,
    calculateSprPairActivity,
    formatSubtreeLabel,
} from '@/domain/spr/sprAnalytics';
import { Button } from '@/components/ui/button';
import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';

// ==========================================================================
// STORE SELECTORS
// ==========================================================================
interface AnalyticsDashboardProps {
    isOpen?: boolean;
    onOpen?: () => void;
    onClose?: () => void;
}

const getInitialWindowRect = () => {
    if (typeof window === 'undefined') {
        return { x: 280, y: 40, width: 900, height: 720 };
    }

    const width = Math.min(900, Math.max(620, window.innerWidth - 80));
    const height = Math.min(720, Math.max(480, window.innerHeight - 80));
    return {
        x: Math.max(24, Math.min(280, window.innerWidth - width - 24)),
        y: 40,
        width,
        height,
    };
};

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
    sprMoveEventCount: number;
    pathEventCount: number;
    totalPathHops: number;
    averagePathHops: number;
    totalPathLength: number;
    averagePathLength: number;
    farthestMover: {
        signature: string;
        splitIndices: number[];
        count: number;
        pathEventCount: number;
        totalPathHops: number;
        averagePathHops: number;
        totalPathLength: number;
        averagePathLength: number;
    } | null;
}

export const AnalyticsDashboard = ({ isOpen = false, onOpen, onClose }: AnalyticsDashboardProps) => {
    const [windowRect, setWindowRect] = React.useState(getInitialWindowRect);
    const pairSolutions = useAppStore(selectPairSolutions);
    const leafNamesByIndex = useAppStore(selectLeafNamesByIndex);
    const fileName = useAppStore(selectFileName) || 'dataset';
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

    const sprMoveEvents = useMemo(() => {
        return buildSprMoveEventRows(pairSolutions, sprOptions);
    }, [pairSolutions, sprOptions]);

    const singletonMoverPercentage = sprSummary.moverOccurrenceCount > 0
        ? (sprSummary.singletonMoverOccurrences / sprSummary.moverOccurrenceCount) * 100
        : 0;

    const farthestMover = useMemo(() => {
        if (!sprSummary.farthestMover) return null;

        const fullLabel = formatSubtreeLabel(sprSummary.farthestMover.splitIndices, leafNamesByIndex);
        const label = fullLabel.length > 28
            ? `${fullLabel.slice(0, 25)}...`
            : fullLabel;

        return {
            label,
            fullLabel,
            totalPathHops: sprSummary.farthestMover.totalPathHops,
            totalPathLength: sprSummary.farthestMover.totalPathLength,
            averagePathHops: sprSummary.farthestMover.averagePathHops,
            averagePathLength: sprSummary.farthestMover.averagePathLength,
        };
    }, [sprSummary.farthestMover, leafNamesByIndex]);

    const frequencyCsvContent = useMemo(() => {
        return createSprFrequencyCsv(allFreqs, leafNamesByIndex);
    }, [allFreqs, leafNamesByIndex]);

    const eventCsvContent = useMemo(() => {
        return createSprMoveEventCsv(sprMoveEvents, leafNamesByIndex);
    }, [sprMoveEvents, leafNamesByIndex]);

    const handleExportFrequencyCsv = () => {
        if (!frequencyCsvContent) return;
        downloadCsvFile(frequencyCsvContent, createSprFrequencyExportName(fileName));
    };

    const handleExportEventCsv = () => {
        if (!eventCsvContent) return;
        downloadCsvFile(eventCsvContent, createSprMoveEventExportName(fileName));
    };

    const portalRoot = typeof document !== 'undefined'
        ? document.body
        : null;

    return (
        <>
            <SidebarMenuItem>
                <SidebarMenuButton
                    tooltip="Open movements"
                    aria-label="Open movements"
                    onClick={onOpen}
                >
                    <Activity className="text-primary" />
                    <span>Movements</span>
                </SidebarMenuButton>
            </SidebarMenuItem>

            {isOpen && portalRoot && createPortal(
                <Rnd
                    bounds="window"
                    minWidth={620}
                    minHeight={480}
                    size={{ width: windowRect.width, height: windowRect.height }}
                    position={{ x: windowRect.x, y: windowRect.y }}
                    onDragStop={(_event, data) => setWindowRect((current) => ({
                        ...current,
                        x: data.x,
                        y: data.y,
                    }))}
                    onResizeStop={(_event, _direction, ref, _delta, position) => {
                        setWindowRect({
                            width: parseInt(ref.style.width, 10),
                            height: parseInt(ref.style.height, 10),
                            x: position.x,
                            y: position.y,
                        });
                    }}
                    dragHandleClassName="spr-analytics-drag-handle"
                    cancel=".spr-analytics-no-drag"
                    className="fixed z-[1200] pointer-events-auto shadow-2xl border border-border/60 rounded-md bg-card overflow-hidden"
                >
                <div className="flex flex-col h-full overflow-hidden bg-card">
                    <div className="spr-analytics-drag-handle flex items-center justify-between gap-2 px-3 py-2 border-b border-border/40 bg-muted/20 backdrop-blur-sm shrink-0 cursor-move select-none">
                            <div className="flex items-center gap-2 min-w-0">
                                <Activity className="size-4 text-primary shrink-0" aria-hidden />
                                <div className="flex flex-col min-w-0">
                                    <div className="text-xs font-bold leading-tight tracking-tight uppercase">Movements</div>
                                    <div className="text-[9px] text-muted-foreground/80 leading-tight font-medium truncate">
                                        Review what moved between neighboring trees and which subtrees move repeatedly.
                                    </div>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={onClose}
                                aria-label="Close movements"
                                className="spr-analytics-no-drag hover:bg-destructive/10 hover:text-destructive transition-colors"
                            >
                                <X className="size-4" />
                            </Button>
                        </div>

                        <div className="flex flex-col flex-1 min-h-0 overflow-hidden p-4">
                            <Tabs defaultValue="overview" className="flex flex-col flex-1 min-h-0 overflow-hidden">
                                <TabsList className="w-full justify-start mb-4 shrink-0 bg-muted/30 p-1">
                                    <TabsTrigger value="overview" className="px-6 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Overview</TabsTrigger>
                                    <TabsTrigger value="events" className="px-6 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Movements</TabsTrigger>
                                    <TabsTrigger value="details" className="px-6 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Recurrent Subtrees</TabsTrigger>
                                </TabsList>

                                <TabsContent value="overview" className="flex-1 min-h-0 mt-0 focus-visible:outline-none">
                                    <ScrollArea className="h-full">
                                        <div className="pb-6 space-y-4 pr-3">
                                            <Card className="bg-primary/5 border-primary/20 p-3 flex flex-col gap-2">
                                                <div className="flex items-center gap-2 text-2xs font-bold uppercase tracking-wider text-primary">
                                                    <BookOpen className="size-3" />
                                                    What is being counted?
                                                </div>
                                                <p className="text-2xs leading-relaxed text-muted-foreground">
                                                    A movement is one subtree that changes attachment between two neighboring trees. Each row shows what moved, where it moved from, and where it moved to.
                                                </p>
                                            </Card>

                                            <SprSummaryMetrics
                                                distinctMoverCount={sprSummary.uniqueMovingSubtreeCount}
                                                sprMovementCount={sprSummary.sprMoveEventCount}
                                                transitionEventCount={sprSummary.transitionEventCount}
                                                activePairCount={sprSummary.activePairCount}
                                                singletonMoverPercentage={singletonMoverPercentage}
                                                topMoverPercentage={sprSummary.topMoverSharePercentage}
                                                sprMoveEventCount={sprSummary.sprMoveEventCount}
                                                pathEventCount={sprSummary.pathEventCount}
                                                totalPathHops={sprSummary.totalPathHops}
                                                averagePathHops={sprSummary.averagePathHops}
                                                totalPathLength={sprSummary.totalPathLength}
                                                averagePathLength={sprSummary.averagePathLength}
                                                farthestMover={farthestMover}
                                            />

                                            <Card className="shadow-sm bg-muted/10 h-80 flex flex-col">
                                                <CardHeader className="pb-3 bg-muted/20 shrink-0">
                                                    <CardTitle className="flex items-center gap-2 text-base font-bold">
                                                        <Activity className="size-4 text-primary" />
                                                        Movements Across Tree Pairs
                                                    </CardTitle>
                                                    <CardDescription className="text-xs">
                                                        Movements and unique moved subtrees per neighboring tree pair.
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
                                                        Subtrees That Move Most Often
                                                    </CardTitle>
                                                    <CardDescription className="text-xs">
                                                        Recurrent moved subtrees ranked by how often they move.
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="flex-1 min-h-0 p-2">
                                                    <SubtreeFrequencyBarChart />
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                                <TabsContent value="events" className="flex-1 min-h-0 mt-0 focus-visible:outline-none flex flex-col">
                                    <Card className="shadow-sm bg-muted/10 flex-1 flex flex-col min-h-0">
                                        <CardHeader className="pb-3 bg-muted/20 shrink-0">
                                            <CardTitle className="flex items-center gap-2 text-base font-bold">
                                                <Activity className="size-4 text-primary" />
                                                SPR Movements
                                            </CardTitle>
                                            <CardDescription className="text-xs flex items-center justify-between gap-2">
                                                <span>One row per movement, including moved subtree, pivot, and from/to attachments.</span>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="xs"
                                                    className="gap-1 shrink-0"
                                                    onClick={handleExportEventCsv}
                                                    disabled={sprMoveEvents.length === 0}
                                                >
                                                    <Download className="size-3" />
                                                    Export CSV
                                                </Button>
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
                                            <SprMoveEventTable
                                                events={sprMoveEvents}
                                                leafNamesByIndex={leafNamesByIndex}
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
                                                Recurrent Moved Subtrees
                                            </CardTitle>
                                            <CardDescription className="text-xs flex items-center justify-between gap-2">
                                                <span>Moved subtrees summarized from movements, ranked by repeat count.</span>
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
                                                        onClick={handleExportFrequencyCsv}
                                                        disabled={allFreqs.length === 0}
                                                    >
                                                        <Download className="size-3" />
                                                        Export CSV
                                                    </Button>
                                                </div>
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-0 flex-1 min-h-0 overflow-y-auto">
                                            <SprFrequencyTable frequencies={allFreqs} leafNamesByIndex={leafNamesByIndex} />
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </Rnd>
                ,
                portalRoot
            )}
        </>
    );
};

export default AnalyticsDashboard;
