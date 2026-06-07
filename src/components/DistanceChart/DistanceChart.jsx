import React, { useCallback, useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from 'recharts';
import { useShallow } from 'zustand/react/shallow';
import {
  selectBarOptionValue,
  selectHasMsa,
  selectInputFrameIndices,
  selectGoToPosition,
  selectMsaColumnCount,
  selectMsaStepSize,
  selectMsaWindowSize,
  selectPairMetrics,
  selectPairs,
  selectScaleList,
  selectTimelineCursor,
  useAppStore,
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
  getDistanceChartAriaLabel,
  getDistanceChartMetric,
} from './distanceChartLanguage.js';

const CHART_MARGINS = { top: 4, right: 8, bottom: 0, left: 2 };
const X_AXIS_HEIGHT = 16;
const Y_AXIS_WIDTH = 34;

const useSeriesData = ({
  barOptionValue,
  hasMsa,
  msaStepSize,
  msaWindowSize,
  msaColumnCount,
  pairMetrics,
  pairs,
  scaleList,
}) =>
  useMemo(() => {
    const { points, yMax } = buildSeriesPoints(barOptionValue, pairMetrics, scaleList, pairs, {
      hasMsa,
      msaStepSize,
      msaWindowSize,
      msaColumnCount,
    });

    return {
      points,
      yMax,
      hasData: points.length > 0,
    };
  }, [
    barOptionValue,
    hasMsa,
    msaStepSize,
    msaWindowSize,
    msaColumnCount,
    pairMetrics,
    pairs,
    scaleList,
  ]);

const useCursorData = ({ barOptionValue, timelineCursor, inputFrameIndices, points }) =>
  useMemo(() => {
    const activePointIndex = resolveActivePointIndex(
      barOptionValue,
      timelineCursor,
      inputFrameIndices,
      points
    );

    return {
      activePointIndex,
      currentX: resolveCursorX(points, activePointIndex),
    };
  }, [barOptionValue, timelineCursor, inputFrameIndices, points]);

export function DistanceChart() {
  const {
    barOptionValue,
    timelineCursor,
    inputFrameIndices,
    hasMsa,
    msaStepSize,
    msaWindowSize,
    msaColumnCount,
    pairs,
    pairMetrics,
    scaleList,
    goToPosition,
  } = useAppStore(
    useShallow((state) => ({
      barOptionValue: selectBarOptionValue(state),
      timelineCursor: selectTimelineCursor(state),
      inputFrameIndices: selectInputFrameIndices(state),
      hasMsa: selectHasMsa(state),
      msaStepSize: selectMsaStepSize(state),
      msaWindowSize: selectMsaWindowSize(state),
      msaColumnCount: selectMsaColumnCount(state),
      pairs: selectPairs(state),
      pairMetrics: selectPairMetrics(state),
      scaleList: selectScaleList(state),
      goToPosition: selectGoToPosition(state),
    }))
  );

  const { points, yMax, hasData } = useSeriesData({
    barOptionValue,
    hasMsa,
    msaStepSize,
    msaWindowSize,
    msaColumnCount,
    pairMetrics,
    pairs,
    scaleList,
  });
  const { currentX, activePointIndex } = useCursorData({
    barOptionValue,
    timelineCursor,
    inputFrameIndices,
    points,
  });

  const metric = getDistanceChartMetric(barOptionValue);
  const chartAriaLabel = getDistanceChartAriaLabel(metric, barOptionValue, hasMsa);
  const activePoint = points[activePointIndex] ?? null;
  const activeValueText = buildPointValueText(metric, activePoint, points.length);

  const chartConfig = useMemo(
    () => ({
      y: {
        label: metric.label,
        color: metric.color,
      },
    }),
    [metric]
  );

  const navigateToPoint = useCallback(
    (point) => {
      const target = resolveNavigationTarget(barOptionValue, point);
      if (target && Number.isInteger(target.frameIndex)) {
        goToPosition(target.frameIndex, undefined, target.seekOptions);
      }
    },
    [barOptionValue, goToPosition]
  );

  const handleClick = useCallback(
    (data) => {
      if (!data || !data.activePayload || data.activePayload.length === 0) return;
      navigateToPoint(data.activePayload[0].payload);
    },
    [navigateToPoint]
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
    [activePointIndex, navigateToPoint, points]
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
      aria-label={chartAriaLabel}
      aria-orientation="horizontal"
      aria-valuemin={1}
      aria-valuemax={points.length}
      aria-valuenow={activePointIndex + 1}
      aria-valuetext={activeValueText}
      onKeyDown={handleKeyDown}
    >
      <ChartContainer config={chartConfig} className="h-full w-full">
        <AreaChart data={points} margin={CHART_MARGINS} onClick={handleClick}>
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
          <ChartTooltip cursor={false} content={<DistanceChartTooltip metric={metric} />} />
          <Area
            dataKey="y"
            type="stepAfter"
            fill="var(--color-y)"
            fillOpacity={0.2}
            stroke="var(--color-y)"
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <ReferenceLine x={currentX} stroke="var(--color-y)" strokeWidth={2} isFront />
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
      {metric.description ? (
        <div className="max-w-[16rem] text-2xs leading-snug text-muted-foreground/80">
          {metric.description}
        </div>
      ) : null}
    </div>
  );
}
