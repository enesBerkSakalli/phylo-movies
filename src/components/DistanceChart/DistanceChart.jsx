import React, { useCallback, useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';
import {
  selectBarOptionValue,
  selectCurrentTreeIndex,
  selectDistanceRfd,
  selectDistanceWeightedRfd,
  selectFullTreeIndices,
  selectGoToPosition,
  selectMovieTimelineManager,
  selectPairInterpolationRanges,
  selectScaleList,
  selectTransitionResolver,
  useAppStore
} from '../../state/phyloStore/store.js';

import { ChartContainer, ChartTooltip } from '../ui/chart';
import {
  buildSeriesPoints,
  buildPointValueText,
  resolveActivePointIndex,
  resolveCursorX,
  resolveNavigationTarget,
} from './distanceChartModel.js';
import {
  formatMetricValue,
  getDistanceChartMetric,
} from './distanceChartLanguage.js';

const CHART_MARGINS = { top: 4, right: 8, bottom: 0, left: 2 };
const X_AXIS_HEIGHT = 16;
const Y_AXIS_WIDTH = 34;

const useTimelineData = ({
  barOptionValue,
  currentTreeIndex,
  fullTreeIndices,
  robinsonFouldsDistances,
  weightedRobinsonFouldsDistances,
  pairInterpolationRanges,
  scaleList,
}) =>
  useMemo(() => {
    const { points, yMax } = buildSeriesPoints(
      barOptionValue,
      robinsonFouldsDistances,
      weightedRobinsonFouldsDistances,
      scaleList,
      pairInterpolationRanges,
    );

    const inputTreeIndices = fullTreeIndices || [];
    const hasData = points.length > 0;
    const activePointIndex = resolveActivePointIndex(barOptionValue, currentTreeIndex, inputTreeIndices, points);
    const currentX = resolveCursorX(points, activePointIndex);

    return {
      points,
      yMax,
      currentX,
      activePointIndex,
      hasData,
    };
  }, [
    barOptionValue,
    currentTreeIndex,
    fullTreeIndices,
    robinsonFouldsDistances,
    weightedRobinsonFouldsDistances,
    pairInterpolationRanges,
    scaleList,
  ]);

export function DistanceChart() {
  const barOptionValue = useAppStore(selectBarOptionValue);
  const currentTreeIndex = useAppStore(selectCurrentTreeIndex);
  const transitionResolver = useAppStore(selectTransitionResolver);
  const fullTreeIndices = useAppStore(selectFullTreeIndices);
  const pairInterpolationRanges = useAppStore(selectPairInterpolationRanges);
  const movieTimelineManager = useAppStore(selectMovieTimelineManager);
  const robinsonFouldsDistances = useAppStore(selectDistanceRfd);
  const weightedRobinsonFouldsDistances = useAppStore(selectDistanceWeightedRfd);
  const scaleList = useAppStore(selectScaleList);
  const goToPosition = useAppStore(selectGoToPosition);

  const { points, yMax, currentX, activePointIndex, hasData } = useTimelineData({
    barOptionValue,
    currentTreeIndex,
    fullTreeIndices,
    robinsonFouldsDistances,
    weightedRobinsonFouldsDistances,
    pairInterpolationRanges,
    scaleList,
  });

  const metric = getDistanceChartMetric(barOptionValue);
  const activePoint = points[activePointIndex] ?? null;
  const activeValueText = buildPointValueText(metric, activePoint, points.length);

  const chartConfig = useMemo(() => ({
    y: {
      label: metric.label,
      color: metric.color,
    },
  }), [metric]);

  const navigateToPoint = useCallback(
    (point) => {
      const target = resolveNavigationTarget(barOptionValue, point, transitionResolver, movieTimelineManager);
      if (target && Number.isInteger(target.treeIndex)) {
        goToPosition(target.treeIndex, undefined, target.seekOptions);
      }
    },
    [barOptionValue, goToPosition, movieTimelineManager, transitionResolver],
  );

  const handleClick = useCallback(
    (data) => {
      if (!data || !data.activePayload || data.activePayload.length === 0) return;
      navigateToPoint(data.activePayload[0].payload);
    },
    [navigateToPoint],
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (!points.length) return;

      let nextIndex = activePointIndex;

      if (event.key === 'ArrowLeft') {
        nextIndex -= 1;
      } else if (event.key === 'ArrowRight') {
        nextIndex += 1;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = points.length - 1;
      } else if (event.key === 'Enter' || event.key === ' ') {
        navigateToPoint(points[activePointIndex]);
        event.preventDefault();
        return;
      } else {
        return;
      }

      event.preventDefault();
      navigateToPoint(points[Math.min(Math.max(nextIndex, 0), points.length - 1)]);
    },
    [activePointIndex, navigateToPoint, points],
  );

  if (!hasData) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground/50">
        No chart data available.
      </div>
    );
  }

  return (
    <div
      id="lineChart"
      className="h-full w-full cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
      role="slider"
      tabIndex={0}
      aria-label={`${metric.label} input-tree metric chart`}
      aria-orientation="horizontal"
      aria-valuemin={1}
      aria-valuemax={points.length}
      aria-valuenow={activePointIndex + 1}
      aria-valuetext={activeValueText}
      onKeyDown={handleKeyDown}
    >
      <ChartContainer config={chartConfig} className="h-full w-full">
        <AreaChart
          data={points}
          margin={CHART_MARGINS}
          onClick={handleClick}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/20" />
          <XAxis
            dataKey="x"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickLine={false}
            axisLine
            tickMargin={4}
            tickCount={8}
            fontSize={9}
            height={X_AXIS_HEIGHT}
          />
          <YAxis
            type="number"
            width={Y_AXIS_WIDTH}
            domain={[0, yMax === 'auto' ? 'auto' : yMax]}
            tickLine={false}
            axisLine
            tickMargin={4}
            tickCount={6}
            fontSize={9}
            tickFormatter={(value) => value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          />
          <ChartTooltip
            cursor={false}
            content={<DistanceChartTooltip metric={metric} />}
          />
          <Area
            dataKey="y"
            type="stepAfter"
            fill="var(--color-y)"
            fillOpacity={0.2}
            stroke="var(--color-y)"
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <ReferenceLine
            x={currentX}
            stroke="var(--color-y)"
            strokeWidth={2}
            isFront
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

function DistanceChartTooltip({ active, payload, metric }) {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  const point = item?.payload;
  if (!point) return null;

  return (
    <div className="border-border/50 bg-background grid min-w-[10rem] gap-1 rounded-md border px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium text-foreground">{metric.label}</div>
      <div className="text-muted-foreground">{point.contextLabel}</div>
      <div className="font-mono font-medium tabular-nums text-foreground">
        {formatMetricValue(item.value)}
      </div>
    </div>
  );
}
