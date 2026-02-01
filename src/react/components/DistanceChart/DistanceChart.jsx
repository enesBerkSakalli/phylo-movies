import React, { useCallback, useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppStore } from '../../../js/core/store.js';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../../components/ui/chart.tsx';

const CHART_MARGINS = { top: 2, right: 8, bottom: 4, left: 8 };

const buildSeriesPoints = (barOptionValue, robinsonFouldsDistances, weightedRobinsonFouldsDistances, scaleList) => {
  if (barOptionValue === 'rfd') {
    return {
      points: (robinsonFouldsDistances || []).map((value, index) => {
        const y = Number(value);
        return { x: index + 1, y: Number.isFinite(y) ? y : 0 };
      }),
      yMax: 1,
    };
  }

  if (barOptionValue === 'w-rfd') {
    return {
      points: (weightedRobinsonFouldsDistances || []).map((value, index) => {
        const y = Number(value);
        return { x: index + 1, y: Number.isFinite(y) ? y : 0 };
      }),
      yMax: 'auto',
    };
  }

  if (barOptionValue === 'scale') {
    return {
      points: (scaleList || []).map((entry, index) => {
        const y = Number(entry?.value);
        return { x: index + 1, y: Number.isFinite(y) ? y : 0 };
      }),
      yMax: 'auto',
    };
  }

  return { points: [], yMax: 'auto' };
};

const findActiveAnchorIndex = (anchors, currentTreeIndex) => {
  const currentIndex = currentTreeIndex ?? 0;
  let activeIndex = 0;

  for (let i = 0; i < anchors.length; i++) {
    if (anchors[i] <= currentIndex) {
      activeIndex = i;
    } else {
      break;
    }
  }

  return activeIndex;
};

const resolveCursorX = (barOptionValue, currentTreeIndex, anchors, pointCount) => {
  if (barOptionValue === 'scale') {
    return (currentTreeIndex ?? 0) + 1;
  }

  const lastDistanceIndex = Math.max(0, pointCount - 1);
  const anchorIndex = findActiveAnchorIndex(anchors, currentTreeIndex);
  const distanceIndex = Math.min(lastDistanceIndex, anchorIndex);

  return distanceIndex + 1;
};

const useTimelineData = ({
  barOptionValue,
  currentTreeIndex,
  fullTreeIndices,
  robinsonFouldsDistances,
  weightedRobinsonFouldsDistances,
  scaleList,
}) =>
  useMemo(() => {
    const { points, yMax } = buildSeriesPoints(
      barOptionValue,
      robinsonFouldsDistances,
      weightedRobinsonFouldsDistances,
      scaleList,
    );

    const anchors = fullTreeIndices || [];
    const hasData = points.length > 0;
    const seriesLength = Math.max(points.length, 1);
    const currentX = Math.min(
      Math.max(resolveCursorX(barOptionValue, currentTreeIndex, anchors, seriesLength), 1),
      seriesLength,
    );

    return {
      points,
      yMax,
      currentX,
      hasData,
    };
  }, [
    barOptionValue,
    currentTreeIndex,
    fullTreeIndices,
    robinsonFouldsDistances,
    weightedRobinsonFouldsDistances,
    scaleList,
  ]);

export function DistanceChart() {
  const barOptionValue = useAppStore((s) => s.barOptionValue);
  const currentTreeIndex = useAppStore((s) => s.currentTreeIndex);
  const transitionResolver = useAppStore((s) => s.transitionResolver);
  const fullTreeIndices = useAppStore((s) => s.movieData?.fullTreeIndices);
  const robinsonFouldsDistances = useAppStore((s) => s.distanceRfd);
  const weightedRobinsonFouldsDistances = useAppStore((s) => s.distanceWeightedRfd);
  const scaleList = useAppStore((s) => s.scaleValues || []);
  const goToPosition = useAppStore((s) => s.goToPosition);

  const { points, yMax, currentX, hasData } = useTimelineData({
    barOptionValue,
    currentTreeIndex,
    fullTreeIndices,
    robinsonFouldsDistances,
    weightedRobinsonFouldsDistances,
    scaleList,
  });

  const chartConfig = useMemo(() => ({
    dist: {
      label: barOptionValue === 'rfd' ? 'RFD' : barOptionValue === 'w-rfd' ? 'W-RFD' : 'Scale',
      color: '#2563eb',
    },
  }), [barOptionValue]);

  const handleClick = useCallback(
    (data) => {
      if (!data || !data.activePayload || data.activePayload.length === 0) return;
      const point = data.activePayload[0].payload;
      const xNumber = point.x;
      if (!Number.isFinite(xNumber)) return;

      const idx0 = Math.max(0, Math.round(xNumber) - 1);
      if (barOptionValue === 'scale') {
        goToPosition(idx0);
        return;
      }

      const target = transitionResolver?.getTreeIndexForDistanceIndex?.(idx0);
      if (typeof target === 'number') {
        goToPosition(target);
      }
    },
    [barOptionValue, goToPosition, transitionResolver],
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
      className="h-full w-full"
      role="img"
      aria-label="Interactive distance chart"
      title="Interactive chart: Click points to navigate"
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
          />
          <YAxis
            type="number"
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
            content={<ChartTooltipContent hideLabel />}
          />
          <Area
            dataKey="y"
            type="stepAfter"
            fill="#2563eb"
            fillOpacity={0.2}
            stroke="#2563eb"
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <ReferenceLine
            x={currentX}
            stroke="#2563eb"
            strokeWidth={2}
            isFront
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
