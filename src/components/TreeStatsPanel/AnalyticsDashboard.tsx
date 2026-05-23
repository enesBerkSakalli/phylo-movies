import React, { type ReactNode, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Rnd } from 'react-rnd';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Activity, ListTree, BookOpen, Download, X } from 'lucide-react';
import { SprActivityTimeline } from './SubtreeAnalytics/SprActivityTimeline';
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
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
    selectFileName,
    selectActiveTreeList,
    selectLeafNamesByIndex,
    selectMarkedNodes,
    selectPairMetrics,
    selectPairs,
    selectTemporalEvents,
    selectTimelineFrames,
    useAppStore
} from '../../state/phyloStore/store.js';
import {
    buildSprAnalyticsModel,
    formatSubtreeLabel,
} from '../../domain/spr/sprAnalytics';
import type { SprAnalyticsModel } from '../../domain/spr/sprAnalytics';
import { buildBranchSupportIndex } from '../../domain/tree/branchSupportIndex';
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

export const AnalyticsDashboard = ({ isOpen = false, isActive = false, onOpen, onClose, onFocus }: AnalyticsDashboardProps) => {
    const [windowRect, setWindowRect] = React.useState(getInitialWindowRect);
    const fittedWindow = fitAnalyticsWindowRect(windowRect);

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
                    onFocusCapture={onFocus}
                    role="region"
                    aria-labelledby="spr-analytics-title"
                    aria-describedby="spr-analytics-description"
                    className={`fixed ${isActive ? 'z-[1200]' : 'z-[1100]'} pointer-events-auto overflow-hidden rounded-md border border-border bg-card shadow-xl`}
                >
                    <div className="flex h-full flex-col overflow-hidden bg-card">
                        <div className="spr-analytics-drag-handle flex shrink-0 cursor-move select-none items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <Activity className="size-4 text-primary shrink-0" aria-hidden />
                                <div className="flex flex-col min-w-0">
                                    <div id="spr-analytics-title" className="truncate text-sm font-semibold leading-tight">
                                        {SPR_ANALYTICS_COPY.title}
                                    </div>
                                    <div id="spr-analytics-description" className="truncate text-xs leading-tight text-muted-foreground">
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
                                <X className="size-4" aria-hidden />
                            </Button>
                        </div>

                        <AnalyticsDashboardBody />
                    </div>
                </Rnd>
                ,
                portalRoot
            )}
        </>
    );
};

const AnalyticsDashboardBody = () => {
    const pairs = useAppStore(selectPairs);
    const leafNamesByIndex = useAppStore(selectLeafNamesByIndex);
    const fileName = useAppStore(selectFileName) || 'dataset';
    const pairMetrics = useAppStore(selectPairMetrics);
    const temporalEvents = useAppStore(selectTemporalEvents);
    const interpolatedTrees = useAppStore(selectActiveTreeList);
    const frames = useAppStore(selectTimelineFrames);
    const selectedMovedSubtreeIndices = useAppStore(selectMarkedNodes);

    const branchSupportIndex = useMemo(() => buildBranchSupportIndex({
        interpolatedTrees,
        frames,
    }), [interpolatedTrees, frames]);

    const sprOptions = useMemo(() => ({
        pairMetrics,
        temporalEvents,
        branchSupportIndex,
    }), [pairMetrics, temporalEvents, branchSupportIndex]);

    const analyticsModel = useMemo<SprAnalyticsModel>(() => {
        return buildSprAnalyticsModel(pairs, sprOptions);
    }, [pairs, sprOptions]);

    const {
        eventRows: sprMoveEvents,
        movedSubtreeRecurrences,
        pairActivityRows,
        summary: sprSummary,
    } = analyticsModel;

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

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
            <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <TabsList className="mb-4 grid w-full shrink-0 grid-cols-3" aria-label="Moving subtree analytics views">
                    <TabsTrigger value="overview" className="text-xs font-medium">{SPR_ANALYTICS_COPY.tabs.overview}</TabsTrigger>
                    <TabsTrigger value="events" className="text-xs font-medium">{SPR_ANALYTICS_COPY.tabs.events}</TabsTrigger>
                    <TabsTrigger value="details" className="text-xs font-medium">{SPR_ANALYTICS_COPY.tabs.details}</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-0 min-h-0 flex-1 focus-visible:outline-none">
                    <ScrollArea className="h-full">
                        <div className="flex flex-col gap-4 pb-6 pr-3">
                            <Card className="gap-2 border-primary/20 bg-primary/5 p-3 shadow-none">
                                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                                    <BookOpen className="size-3.5" aria-hidden />
                                    {SPR_ANALYTICS_COPY.countedTitle}
                                </div>
                                <p className="text-xs leading-relaxed text-muted-foreground">
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

                            <AnalyticsSectionCard
                                title={SPR_ANALYTICS_COPY.activityTitle}
                                description={SPR_ANALYTICS_COPY.activityDescription}
                                icon={<Activity className="size-4 text-primary" aria-hidden />}
                                className="h-80"
                                contentClassName="p-2"
                            >
                                <div className="h-full min-h-0">
                                    <SprActivityTimeline rows={pairActivityRows} />
                                </div>
                            </AnalyticsSectionCard>
                        </div>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="events" className="mt-0 flex min-h-0 flex-1 flex-col focus-visible:outline-none">
                    <AnalyticsSectionCard
                        title={SPR_ANALYTICS_COPY.eventTitle}
                        description={SPR_ANALYTICS_COPY.eventDescription}
                        icon={<Activity className="size-4 text-primary" aria-hidden />}
                        className="min-h-0 flex-1"
                        contentClassName="overflow-hidden p-0"
                        action={(
                            <ExportCsvButton
                                onClick={handleExportEventCsv}
                                disabled={sprMoveEvents.length === 0}
                                label="Export movement events CSV"
                            />
                        )}
                    >
                        <div className="h-full min-h-0">
                            <SprMoveEventTable
                                events={sprMoveEvents}
                                leafNamesByIndex={leafNamesByIndex}
                                selectedMovedSubtreeIndices={selectedMovedSubtreeIndices}
                            />
                        </div>
                    </AnalyticsSectionCard>
                </TabsContent>

                <TabsContent value="details" className="mt-0 flex min-h-0 flex-1 flex-col focus-visible:outline-none">
                    <AnalyticsSectionCard
                        title={SPR_ANALYTICS_COPY.recurrenceTableTitle}
                        description={SPR_ANALYTICS_COPY.recurrenceTableDescription}
                        icon={<ListTree className="size-4 text-primary" aria-hidden />}
                        className="min-h-0 flex-1"
                        contentClassName="overflow-y-auto p-0"
                        action={(
                            <div className="flex items-center gap-2">
                                {movedSubtreeRecurrences.length > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                        {movedSubtreeRecurrences.length} rows
                                    </span>
                                )}
                                <ExportCsvButton
                                    onClick={handleExportRecurrenceCsv}
                                    disabled={movedSubtreeRecurrences.length === 0}
                                    label="Export recurrent subtrees CSV"
                                />
                            </div>
                        )}
                    >
                        <MovedSubtreeRecurrenceTable recurrences={movedSubtreeRecurrences} leafNamesByIndex={leafNamesByIndex} />
                    </AnalyticsSectionCard>
                </TabsContent>
            </Tabs>
        </div>
    );
};

interface AnalyticsSectionCardProps {
    title: string;
    description: string;
    icon: ReactNode;
    children: ReactNode;
    action?: ReactNode;
    className?: string;
    contentClassName?: string;
}

const AnalyticsSectionCard = ({
    title,
    description,
    icon,
    children,
    action,
    className = '',
    contentClassName = '',
}: AnalyticsSectionCardProps) => (
    <Card className={`flex min-h-0 flex-col gap-0 bg-muted/10 py-0 shadow-sm ${className}`}>
        <CardHeader className="shrink-0 border-b border-border/40 bg-muted/20 p-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                {icon}
                {title}
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
                {description}
            </CardDescription>
            {action && (
                <CardAction className="spr-analytics-no-drag">
                    {action}
                </CardAction>
            )}
        </CardHeader>
        <CardContent className={`min-h-0 flex-1 ${contentClassName}`}>
            {children}
        </CardContent>
    </Card>
);

interface ExportCsvButtonProps {
    onClick: () => void;
    disabled: boolean;
    label: string;
}

const ExportCsvButton = ({ onClick, disabled, label }: ExportCsvButtonProps) => (
    <Button
        type="button"
        variant="outline"
        size="xs"
        className="gap-1"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
    >
        <Download className="size-3" aria-hidden />
        Export CSV
    </Button>
);

export default AnalyticsDashboard;
