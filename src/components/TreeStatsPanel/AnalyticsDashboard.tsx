import React, { type ReactNode, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Rnd } from 'react-rnd';
import { useShallow } from 'zustand/react/shallow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Activity, ListTree, BookOpen, Download, X } from 'lucide-react';
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
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import {
  selectFileName,
  selectActiveTreeList,
  selectBranchAnnotationLabelKey,
  selectHasMsa,
  selectLeafNamesByIndex,
  selectMarkedNodes,
  selectMsaColumnCount,
  selectMsaStepSize,
  selectMsaWindowSize,
  selectPairMetrics,
  selectPairs,
  selectTemporalEvents,
  selectTimelineFrames,
  useAppStore,
} from '../../state/phyloStore/store.js';
import { buildSprAnalyticsModel } from '../../domain/spr/sprAnalytics';
import type { SprAnalyticsModel } from '../../domain/spr/sprAnalytics';
import { buildBranchSupportIndex } from '../../domain/tree/branchSupportIndex';
import { Button } from '../ui/button';
import {
  fitFloatingWindowRect,
  getBrowserViewportSize,
  hasFloatingWindowRectChanged,
  toFloatingWindowRect,
} from '../ui/floatingWindowGeometry.js';
import {
  FLOATING_WINDOW_SURFACE_CLASS,
  getFloatingWindowLayerClass,
} from '../ui/floating-window-layer.js';
import { ANALYTICS_WINDOW_BOUNDS, SPR_ANALYTICS_COPY } from './AnalyticsDashboard.contract';
import { cn } from '../../lib/utils';

interface AnalyticsDashboardProps {
  isOpen?: boolean;
  isActive?: boolean;
  onClose?: () => void;
  onFocus?: () => void;
}

const fitAnalyticsWindowRect = (rect: { x: number; y: number; width: number; height: number }) => {
  const viewport = getBrowserViewportSize();
  return fitFloatingWindowRect(rect, {
    ...ANALYTICS_WINDOW_BOUNDS,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
  });
};

const getInitialWindowRect = () =>
  toFloatingWindowRect(fitAnalyticsWindowRect({ x: 280, y: 40, width: 900, height: 720 }));
const DEFAULT_BRANCH_VALUE_THRESHOLD = 70;

export const AnalyticsDashboard = ({
  isOpen = false,
  isActive = false,
  onClose,
  onFocus,
}: AnalyticsDashboardProps) => {
  const [windowRect, setWindowRect] = React.useState(getInitialWindowRect);
  const fittedWindow = fitAnalyticsWindowRect(windowRect);

  const portalRoot = typeof document !== 'undefined' ? document.body : null;

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

  if (!isOpen || !portalRoot) return null;

  return createPortal(
    <Rnd
      bounds="window"
      minWidth={fittedWindow.minWidth}
      minHeight={fittedWindow.minHeight}
      size={{ width: fittedWindow.width, height: fittedWindow.height }}
      position={{ x: fittedWindow.x, y: fittedWindow.y }}
      onMouseDown={onFocus}
      onDragStop={(_event, data) =>
        setWindowRect((current) =>
          toFloatingWindowRect(
            fitAnalyticsWindowRect({
              ...current,
              x: data.x,
              y: data.y,
            })
          )
        )
      }
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
      className={cn(FLOATING_WINDOW_SURFACE_CLASS, getFloatingWindowLayerClass(isActive))}
    >
      <div className="flex h-full flex-col overflow-hidden bg-card">
        <div className="spr-analytics-drag-handle flex shrink-0 cursor-move select-none items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <Activity className="size-4 shrink-0 text-primary" aria-hidden />
            <div className="flex min-w-0 flex-col">
              <div
                id="spr-analytics-title"
                className="truncate text-sm font-semibold leading-tight"
              >
                {SPR_ANALYTICS_COPY.title}
              </div>
              <div
                id="spr-analytics-description"
                className="truncate text-xs leading-tight text-muted-foreground"
              >
                {SPR_ANALYTICS_COPY.description}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            aria-label="Close moved subtrees"
            title="Close moved subtrees"
            className="spr-analytics-no-drag hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <X aria-hidden />
          </Button>
        </div>

        <AnalyticsDashboardBody />
      </div>
    </Rnd>,
    portalRoot
  );
};

const AnalyticsDashboardBody = () => {
  const [branchValueThreshold, setBranchValueThreshold] = React.useState(
    DEFAULT_BRANCH_VALUE_THRESHOLD
  );
  const {
    pairs,
    leafNamesByIndex,
    fileName,
    pairMetrics,
    temporalEvents,
    interpolatedTrees,
    frames,
    hasMsa,
    msaStepSize,
    msaWindowSize,
    msaColumnCount,
    selectedMovedSubtreeIndices,
    branchAnnotationValueKey,
  } = useAppStore(
    useShallow((state) => ({
      pairs: selectPairs(state),
      leafNamesByIndex: selectLeafNamesByIndex(state),
      fileName: selectFileName(state) || 'dataset',
      pairMetrics: selectPairMetrics(state),
      temporalEvents: selectTemporalEvents(state),
      interpolatedTrees: selectActiveTreeList(state),
      frames: selectTimelineFrames(state),
      hasMsa: selectHasMsa(state),
      msaStepSize: selectMsaStepSize(state),
      msaWindowSize: selectMsaWindowSize(state),
      msaColumnCount: selectMsaColumnCount(state),
      selectedMovedSubtreeIndices: selectMarkedNodes(state),
      branchAnnotationValueKey: selectBranchAnnotationLabelKey(state),
    }))
  );
  const windowRangeOptions = useMemo(
    () => ({
      hasMsa,
      msaStepSize,
      msaWindowSize,
      msaColumnCount,
    }),
    [hasMsa, msaColumnCount, msaStepSize, msaWindowSize]
  );

  const branchSupportIndex = useMemo(
    () =>
      buildBranchSupportIndex({
        interpolatedTrees,
        frames,
      }),
    [interpolatedTrees, frames]
  );

  const sprOptions = useMemo(
    () => ({
      pairMetrics,
      temporalEvents,
      branchSupportIndex,
      interpolatedTrees,
      branchAnnotationValueKey,
      branchValueThreshold,
    }),
    [
      pairMetrics,
      temporalEvents,
      branchSupportIndex,
      interpolatedTrees,
      branchAnnotationValueKey,
      branchValueThreshold,
    ]
  );

  const analyticsModel = useMemo<SprAnalyticsModel>(() => {
    return buildSprAnalyticsModel(pairs, sprOptions);
  }, [pairs, sprOptions]);

  const { eventRows: sprMoveEvents, movedSubtreeRecurrences, summary: sprSummary } = analyticsModel;

  const handleExportRecurrenceCsv = () => {
    const recurrenceCsvContent = createSprMovedSubtreeRecurrenceCsv(
      movedSubtreeRecurrences,
      leafNamesByIndex
    );
    if (!recurrenceCsvContent) return;
    downloadCsvFile(recurrenceCsvContent, createSprMovedSubtreeRecurrenceExportName(fileName));
  };

  const handleExportEventCsv = () => {
    const eventCsvContent = createSprMoveEventCsv(
      sprMoveEvents,
      leafNamesByIndex,
      windowRangeOptions
    );
    if (!eventCsvContent) return;
    downloadCsvFile(eventCsvContent, createSprMoveEventExportName(fileName));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
      <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TabsList
          className="mb-4 grid w-full shrink-0 grid-cols-3"
          aria-label="Moved subtree analytics views"
        >
          <TabsTrigger value="overview" className="text-xs font-medium">
            {SPR_ANALYTICS_COPY.tabs.overview}
          </TabsTrigger>
          <TabsTrigger value="events" className="text-xs font-medium">
            {SPR_ANALYTICS_COPY.tabs.events}
          </TabsTrigger>
          <TabsTrigger value="details" className="text-xs font-medium">
            {SPR_ANALYTICS_COPY.tabs.details}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 min-h-0 flex-1 focus-visible:outline-none">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-4 pb-6 pr-3">
              <Alert className="border-primary/20 bg-primary/5">
                <BookOpen className="text-primary" aria-hidden />
                <AlertTitle>{SPR_ANALYTICS_COPY.countedTitle}</AlertTitle>
                <AlertDescription className="text-xs leading-relaxed">
                  {SPR_ANALYTICS_COPY.countedDescription}
                </AlertDescription>
              </Alert>

              <SprSummaryMetrics
                uniqueMovedSubtreeCount={sprSummary.uniqueMovedSubtreeCount}
                sprMovementCount={sprSummary.sprMoveEventCount}
                activePairCount={sprSummary.activePairCount}
              />

              <Alert className="border-border/70 bg-muted/20">
                <AlertTitle>{SPR_ANALYTICS_COPY.distanceChartTitle}</AlertTitle>
                <AlertDescription className="text-xs leading-relaxed">
                  {SPR_ANALYTICS_COPY.distanceChartDescription}
                </AlertDescription>
              </Alert>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent
          value="events"
          className="mt-0 flex min-h-0 flex-1 flex-col focus-visible:outline-none"
        >
          <AnalyticsSectionCard
            title={SPR_ANALYTICS_COPY.eventTitle}
            description={SPR_ANALYTICS_COPY.eventDescription}
            icon={<Activity className="size-4 text-primary" aria-hidden />}
            className="min-h-0 flex-1"
            contentClassName="overflow-hidden p-0"
            action={
              <ExportCsvButton
                onClick={handleExportEventCsv}
                disabled={sprMoveEvents.length === 0}
                label="Export SPR moves CSV"
              />
            }
          >
            <div className="h-full min-h-0">
              <SprMoveEventTable
                events={sprMoveEvents}
                leafNamesByIndex={leafNamesByIndex}
                selectedMovedSubtreeIndices={selectedMovedSubtreeIndices}
                branchValueThreshold={branchValueThreshold}
                onBranchValueThresholdChange={setBranchValueThreshold}
                windowRangeOptions={windowRangeOptions}
              />
            </div>
          </AnalyticsSectionCard>
        </TabsContent>

        <TabsContent
          value="details"
          className="mt-0 flex min-h-0 flex-1 flex-col focus-visible:outline-none"
        >
          <AnalyticsSectionCard
            title={SPR_ANALYTICS_COPY.recurrenceTableTitle}
            description={SPR_ANALYTICS_COPY.recurrenceTableDescription}
            icon={<ListTree className="size-4 text-primary" aria-hidden />}
            className="min-h-0 flex-1"
            contentClassName="overflow-y-auto p-0"
            action={
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
            }
          >
            <MovedSubtreeRecurrenceTable
              recurrences={movedSubtreeRecurrences}
              leafNamesByIndex={leafNamesByIndex}
            />
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
  <Card className={cn('flex min-h-0 flex-col gap-0 bg-muted/10 py-0 shadow-sm', className)}>
    <CardHeader className="shrink-0 border-b border-border/40 bg-muted/20 p-3">
      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </CardTitle>
      <CardDescription className="text-xs leading-relaxed">{description}</CardDescription>
      {action && <CardAction className="spr-analytics-no-drag">{action}</CardAction>}
    </CardHeader>
    <CardContent className={cn('min-h-0 flex-1', contentClassName)}>{children}</CardContent>
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
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
  >
    <Download data-icon="inline-start" aria-hidden />
    Export CSV
  </Button>
);

export default AnalyticsDashboard;
