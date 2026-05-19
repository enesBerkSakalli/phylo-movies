import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Rnd } from 'react-rnd';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { BarChart, Activity, ListTree, BookOpen, ChevronDown, Download, X } from 'lucide-react';
import { SprActivityTimeline } from './SubtreeAnalytics/SprActivityTimeline';
import { MovedSubtreeRecurrenceChart } from './SubtreeAnalytics/MovedSubtreeRecurrenceChart';
import { MovedSubtreeRecurrenceTable } from './SubtreeAnalytics/MovedSubtreeRecurrenceTable';
import { SprMoveEventTable } from './SubtreeAnalytics/SprMoveEventTable';
import { SprSummaryMetrics } from './SubtreeAnalytics/SprSummaryMetrics';
import {
    createSprMovedSubtreeRecurrenceCsv,
    createSprMovedSubtreeRecurrenceExportName,
    createSprMoveEventCsv,
    createSprMoveEventExportName,
    downloadCsvFile,
} from './SubtreeAnalytics/sprAnalyticsCsv';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
    selectDistanceRfd,
    selectDistanceWeightedRfd,
    selectFileName,
    selectLeafNamesByIndex,
    selectMarkedNodes,
    selectPairInterpolationRanges,
    selectPairSolutions,
    selectSplitChangeTimeline,
    useAppStore
} from '../../state/phyloStore/store.js';
import {
    buildSprMoveEventRows,
    calculateSprDatasetSummary,
    calculateSprMovedSubtreeRecurrences,
    calculateSprPairActivity,
    formatSubtreeLabel,
} from '../../domain/spr/sprAnalytics';
import { Button } from '../ui/button';
import { SidebarMenuItem, SidebarMenuButton } from '../ui/sidebar';
import {
    fitFloatingWindowRect,
    getBrowserViewportSize,
    getFloatingWindowViewportInsets,
    hasFloatingWindowRectChanged,
    toFloatingWindowRect,
} from '../ui/floatingWindowGeometry.js';
import {
    ANALYTICS_WINDOW_BOUNDS,
    SPR_ANALYTICS_COPY,
} from './AnalyticsDashboard.contract';

// ==========================================================================
// STORE SELECTORS
// ==========================================================================
interface AnalyticsDashboardProps {
    isOpen?: boolean;
    isActive?: boolean;
    onOpen?: () => void;
    onClose?: () => void;
    onFocus?: () => void;
}

const fitAnalyticsWindowRect = (rect: { x: number; y: number; width: number; height: number }) => {
    const viewport = getBrowserViewportSize();
    const insets = getFloatingWindowViewportInsets();
    return fitFloatingWindowRect(rect, {
        ...ANALYTICS_WINDOW_BOUNDS,
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
        leftInset: insets.left,
        rightInset: insets.right,
        topInset: insets.top,
        bottomInset: insets.bottom,
    });
};

const getInitialWindowRect = () => toFloatingWindowRect(fitAnalyticsWindowRect({ x: 280, y: 40, width: 900, height: 720 }));

interface SprDatasetSummary {
    pairCount: number;
    activePairCount: number;
    transitionEventCount: number;
    uniqueMovedSubtreeCount: number;
    singleTaxonMoveEventCount: number;
    multiTaxonMoveEventCount: number;
    topMovedSubtreeSharePercentage: number;
    sprMoveEventCount: number;
    totalPathHops: number;
    averagePathHops: number;
    totalPathLength: number;
    averagePathLength: number;
    farthestMovedSubtree: {
        signature: string;
        splitIndices: number[];
        count: number;
        totalPathHops: number;
        averagePathHops: number;
        totalPathLength: number;
        averagePathLength: number;
    } | null;
}

export const AnalyticsDashboard = ({ isOpen = false, isActive = false, onOpen, onClose, onFocus }: AnalyticsDashboardProps) => {
    const [windowRect, setWindowRect] = React.useState(getInitialWindowRect);
    const fittedWindow = fitAnalyticsWindowRect(windowRect);
    const pairSolutions = useAppStore(selectPairSolutions);
    const leafNamesByIndex = useAppStore(selectLeafNamesByIndex);
    const fileName = useAppStore(selectFileName) || 'dataset';
    const robinsonFouldsDistances = useAppStore(selectDistanceRfd);
    const weightedRobinsonFouldsDistances = useAppStore(selectDistanceWeightedRfd);
    const pairInterpolationRanges = useAppStore(selectPairInterpolationRanges);
    const splitChangeTimeline = useAppStore(selectSplitChangeTimeline);
    const selectedMovedSubtreeIndices = useAppStore(selectMarkedNodes);

    const sprOptions = useMemo(() => ({
        robinsonFouldsDistances,
        weightedRobinsonFouldsDistances,
        pairInterpolationRanges,
        splitChangeTimeline,
    }), [robinsonFouldsDistances, weightedRobinsonFouldsDistances, pairInterpolationRanges, splitChangeTimeline]);

    const movedSubtreeRecurrences = useMemo(() => {
        if (!pairSolutions || Object.keys(pairSolutions).length === 0) return [];
        return calculateSprMovedSubtreeRecurrences(pairSolutions);
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

    const singleTaxonMoveEventPercentage = sprSummary.sprMoveEventCount > 0
        ? (sprSummary.singleTaxonMoveEventCount / sprSummary.sprMoveEventCount) * 100
        : 0;

    const farthestMovedSubtree = useMemo(() => {
        if (!sprSummary.farthestMovedSubtree) return null;

        const fullLabel = formatSubtreeLabel(sprSummary.farthestMovedSubtree.splitIndices, leafNamesByIndex);
        const label = fullLabel.length > 28
            ? `${fullLabel.slice(0, 25)}...`
            : fullLabel;

        return {
            label,
            fullLabel,
            totalPathHops: sprSummary.farthestMovedSubtree.totalPathHops,
            totalPathLength: sprSummary.farthestMovedSubtree.totalPathLength,
            averagePathHops: sprSummary.farthestMovedSubtree.averagePathHops,
            averagePathLength: sprSummary.farthestMovedSubtree.averagePathLength,
        };
    }, [sprSummary.farthestMovedSubtree, leafNamesByIndex]);

    const recurrenceCsvContent = useMemo(() => {
        return createSprMovedSubtreeRecurrenceCsv(movedSubtreeRecurrences, leafNamesByIndex);
    }, [movedSubtreeRecurrences, leafNamesByIndex]);

    const eventCsvContent = useMemo(() => {
        return createSprMoveEventCsv(sprMoveEvents, leafNamesByIndex);
    }, [sprMoveEvents, leafNamesByIndex]);

    const handleExportRecurrenceCsv = () => {
        if (!recurrenceCsvContent) return;
        downloadCsvFile(recurrenceCsvContent, createSprMovedSubtreeRecurrenceExportName(fileName));
    };

    const handleExportEventCsv = () => {
        if (!eventCsvContent) return;
        downloadCsvFile(eventCsvContent, createSprMoveEventExportName(fileName));
    };

    const portalRoot = typeof document !== 'undefined'
        ? document.body
        : null;

    React.useEffect(() => {
        if (!isOpen) return undefined;

        const fitWindow = () => {
            setWindowRect((current) => {
                const nextRect = fitAnalyticsWindowRect(current);
                return hasFloatingWindowRectChanged(current, nextRect)
                    ? toFloatingWindowRect(nextRect)
                    : current;
            });
        };

        fitWindow();
        window.addEventListener('resize', fitWindow);
        return () => window.removeEventListener('resize', fitWindow);
    }, [isOpen]);

    React.useEffect(() => {
        if (isOpen) onFocus?.();
    }, [isOpen, onFocus]);

    return (
        <>
            <SidebarMenuItem>
                <SidebarMenuButton
                    tooltip={SPR_ANALYTICS_COPY.openLabel}
                    aria-label={SPR_ANALYTICS_COPY.openLabel}
                    onClick={onOpen}
                >
                    <Activity className="text-primary" />
                    <span>{SPR_ANALYTICS_COPY.title}</span>
                </SidebarMenuButton>
            </SidebarMenuItem>

            {isOpen && portalRoot && createPortal(
                <Rnd
                    bounds="window"
                    minWidth={fittedWindow.minWidth}
                    minHeight={fittedWindow.minHeight}
                    size={{ width: fittedWindow.width, height: fittedWindow.height }}
                    position={{ x: fittedWindow.x, y: fittedWindow.y }}
                    onMouseDown={onFocus}
                    onDragStop={(_event, data) => setWindowRect((current) => toFloatingWindowRect(fitAnalyticsWindowRect({
                        ...current,
                        x: data.x,
                        y: data.y,
                    })))}
                    onResizeStop={(_event, _direction, ref, _delta, position) => {
                        const nextRect = fitAnalyticsWindowRect({
                            width: parseInt(ref.style.width, 10),
                            height: parseInt(ref.style.height, 10),
                            x: position.x,
                            y: position.y,
                        });
                        setWindowRect(toFloatingWindowRect(nextRect));
                    }}
                    dragHandleClassName="spr-analytics-drag-handle"
                    cancel=".spr-analytics-no-drag"
                    className={`fixed ${isActive ? 'z-[1200]' : 'z-[1100]'} pointer-events-auto shadow-2xl border border-border/60 rounded-md bg-card overflow-hidden`}
                >
                <div className="flex flex-col h-full overflow-hidden bg-card">
                    <div className="spr-analytics-drag-handle flex items-center justify-between gap-2 px-3 py-2 border-b border-border/40 bg-muted/20 backdrop-blur-sm shrink-0 cursor-move select-none">
                            <div className="flex items-center gap-2 min-w-0">
                                <Activity className="size-4 text-primary shrink-0" aria-hidden />
                                <div className="flex flex-col min-w-0">
                                    <div className="text-xs font-bold leading-tight tracking-tight uppercase">{SPR_ANALYTICS_COPY.title}</div>
                                    <div className="text-[9px] text-muted-foreground/80 leading-tight font-medium truncate">
                                        {SPR_ANALYTICS_COPY.description}
                                    </div>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={onClose}
                                aria-label="Close moving subtrees"
                                className="spr-analytics-no-drag hover:bg-destructive/10 hover:text-destructive transition-colors"
                            >
                                <X className="size-4" />
                            </Button>
                        </div>

                        <div className="flex flex-col flex-1 min-h-0 overflow-hidden p-4">
                            <Tabs defaultValue="overview" className="flex flex-col flex-1 min-h-0 overflow-hidden">
                                <TabsList className="w-full justify-start mb-4 shrink-0 bg-muted/30 p-1">
                                    <TabsTrigger value="overview" className="px-6 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">{SPR_ANALYTICS_COPY.tabs.overview}</TabsTrigger>
                                    <TabsTrigger value="events" className="px-6 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">{SPR_ANALYTICS_COPY.tabs.events}</TabsTrigger>
                                    <TabsTrigger value="details" className="px-6 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">{SPR_ANALYTICS_COPY.tabs.details}</TabsTrigger>
                                </TabsList>

                                <TabsContent value="overview" className="flex-1 min-h-0 mt-0 focus-visible:outline-none">
                                    <ScrollArea className="h-full">
                                        <div className="pb-6 space-y-4 pr-3">
                                            <Card className="bg-primary/5 border-primary/20 p-3 flex flex-col gap-2">
                                                <div className="flex items-center gap-2 text-2xs font-bold uppercase tracking-wider text-primary">
                                                    <BookOpen className="size-3" />
                                                    {SPR_ANALYTICS_COPY.countedTitle}
                                                </div>
                                                <p className="text-2xs leading-relaxed text-muted-foreground">
                                                    {SPR_ANALYTICS_COPY.countedDescription}
                                                </p>
                                            </Card>

                                            <SprSummaryMetrics
                                                uniqueMovedSubtreeCount={sprSummary.uniqueMovedSubtreeCount}
                                                sprMovementCount={sprSummary.sprMoveEventCount}
                                                transitionEventCount={sprSummary.transitionEventCount}
                                                activePairCount={sprSummary.activePairCount}
                                                singleTaxonMoveEventPercentage={singleTaxonMoveEventPercentage}
                                                topMovedSubtreePercentage={sprSummary.topMovedSubtreeSharePercentage}
                                                sprMoveEventCount={sprSummary.sprMoveEventCount}
                                                totalPathHops={sprSummary.totalPathHops}
                                                averagePathHops={sprSummary.averagePathHops}
                                                totalPathLength={sprSummary.totalPathLength}
                                                averagePathLength={sprSummary.averagePathLength}
                                                farthestMovedSubtree={farthestMovedSubtree}
                                            />

                                            <Card className="shadow-sm bg-muted/10 h-80 flex flex-col">
                                                <CardHeader className="pb-3 bg-muted/20 shrink-0">
                                                    <CardTitle className="flex items-center gap-2 text-base font-bold">
                                                        <Activity className="size-4 text-primary" />
                                                        {SPR_ANALYTICS_COPY.activityTitle}
                                                    </CardTitle>
                                                    <CardDescription className="text-xs">
                                                        {SPR_ANALYTICS_COPY.activityDescription}
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
                                                        {SPR_ANALYTICS_COPY.recurrenceChartTitle}
                                                    </CardTitle>
                                                    <CardDescription className="text-xs">
                                                        {SPR_ANALYTICS_COPY.recurrenceChartDescription}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="flex-1 min-h-0 p-2">
                                                    <MovedSubtreeRecurrenceChart />
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
                                                {SPR_ANALYTICS_COPY.eventTitle}
                                            </CardTitle>
                                            <CardDescription className="text-xs flex items-center justify-between gap-2">
                                                <span>{SPR_ANALYTICS_COPY.eventDescription}</span>
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
                                                selectedMovedSubtreeIndices={selectedMovedSubtreeIndices}
                                            />
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="details" className="flex-1 min-h-0 mt-0 focus-visible:outline-none flex flex-col">
                                    <Card className="shadow-sm bg-muted/10 flex-1 flex flex-col min-h-0">
                                        <CardHeader className="pb-3 bg-muted/20 shrink-0">
                                            <CardTitle className="flex items-center gap-2 text-base font-bold">
                                                <ListTree className="size-4 text-primary" />
                                                {SPR_ANALYTICS_COPY.recurrenceTableTitle}
                                            </CardTitle>
                                            <CardDescription className="text-xs flex items-center justify-between gap-2">
                                                <span>{SPR_ANALYTICS_COPY.recurrenceTableDescription}</span>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {movedSubtreeRecurrences.length > 5 && (
                                                        <span className="flex items-center gap-1 text-muted-foreground/60 shrink-0 ml-2">
                                                            <ChevronDown className="size-3 animate-bounce" />
                                                            <span className="text-2xs">{movedSubtreeRecurrences.length} items · scroll</span>
                                                        </span>
                                                    )}
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="xs"
                                                        className="gap-1"
                                                        onClick={handleExportRecurrenceCsv}
                                                        disabled={movedSubtreeRecurrences.length === 0}
                                                    >
                                                        <Download className="size-3" />
                                                        Export CSV
                                                    </Button>
                                                </div>
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-0 flex-1 min-h-0 overflow-y-auto">
                                            <MovedSubtreeRecurrenceTable recurrences={movedSubtreeRecurrences} leafNamesByIndex={leafNamesByIndex} />
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
