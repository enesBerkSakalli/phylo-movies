import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Line } from '@nivo/line';
import { useAppStore } from '../../../js/core/store.js';

const CHART_MARGINS = { top: 8, right: 8, bottom: 20, left: 36 };
const BASE_LAYERS = ['grid', 'axes', 'areas', 'lines', 'mesh'];

const buildSeriesPoints = (barOptionValue, robinsonFouldsDistances, weightedRobinsonFouldsDistances, scaleList) => {
  if (barOptionValue === 'rfd') {
    return {
      points: robinsonFouldsDistances.map((value, index) => ({ x: index + 1, y: Number(value) })),
      yMax: 1,
    };
  }

  if (barOptionValue === 'w-rfd') {
    return {
      points: weightedRobinsonFouldsDistances.map((value, index) => ({ x: index + 1, y: Number(value) })),
      yMax: 'auto',
    };
  }

  if (barOptionValue === 'scale') {
    return {
      points: scaleList.map((entry, index) => ({ x: index + 1, y: entry?.value || 0 })),
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

// Bundles chart data prep so the render path stays minimal.
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
    const seriesId = barOptionValue || 'series';

    return {
      series: hasData ? [{ id: seriesId, data: points }] : [],
      yDomain: [0, yMax],
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

// Tracks container resize so the chart always fills the available space.
const useContainerSize = () => {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver((entries) => {
      const contentRect = entries[0]?.contentRect;
      if (contentRect) {
        setSize({
          w: Math.max(0, contentRect.width),
          h: Math.max(0, contentRect.height),
        });
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { containerRef, size };
};

// Renders the vertical cursor aligned to the current index.
const useCursorLayer = (currentX) =>
  useMemo(
    () =>
      ({ xScale, innerHeight }) => {
        const cx = xScale(currentX);
        return (
          <g pointerEvents="none">
            <line x1={cx} x2={cx} y1={0} y2={innerHeight} stroke="var(--primary)" strokeWidth={3} />
          </g>
        );
      },
    [currentX],
  );

export function DistanceChart() {
  const barOptionValue = useAppStore((s) => s.barOptionValue);
  const currentTreeIndex = useAppStore((s) => s.currentTreeIndex);
  const transitionResolver = useAppStore((s) => s.transitionResolver);
  const fullTreeIndices = useAppStore((s) => s.movieData?.fullTreeIndices);
  const robinsonFouldsDistances = useAppStore((s) => s.distanceRfd);
  const weightedRobinsonFouldsDistances = useAppStore((s) => s.distanceWeightedRfd);
  const scaleList = useAppStore((s) => s.scaleValues || []);
  const goToPosition = useAppStore((s) => s.goToPosition);

  const { series, yDomain, currentX, hasData } = useTimelineData({
    barOptionValue,
    currentTreeIndex,
    fullTreeIndices,
    robinsonFouldsDistances,
    weightedRobinsonFouldsDistances,
    scaleList,
  });

  const cursorLayer = useCursorLayer(currentX);
  const chartLayers = useMemo(() => [...BASE_LAYERS, cursorLayer], [cursorLayer]);
  const { containerRef, size } = useContainerSize();

  // Map a click on the mesh back to the correct tree index.
  const handleClick = useCallback(
    (point) => {
      const xValue = point?.data?.x;
      const xNumber = typeof xValue === 'number' ? xValue : Number(xValue);
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

  return (
    <div
      id="lineChart"
      className="chart-canvas"
      role="img"
      aria-label="Interactive distance chart"
      title="Interactive chart: Click points or drag indicator to navigate"
      data-react-chart="nivo"
      ref={containerRef}
    >
      {hasData && (
        <Line
          width={size.w}
          height={size.h}
          data={series}
          margin={CHART_MARGINS}
          xScale={{ type: 'point' }} // enforce discrete integer positions on the x-axis
          yScale={{ type: 'linear', min: yDomain[0], max: yDomain[1] }}
          colors={['var(--primary)']}
          curve="linear"
          enableGridX
          enableGridY
          axisBottom={{ tickSize: 0, tickPadding: 4 }}
          axisLeft={{ tickSize: 0, tickPadding: 4 }}
          enablePoints={false}
          pointSize={0}
          pointColor="var(--primary)"
          pointBorderWidth={0}
          pointBorderColor="var(--primary)"
          enablePointLabel={false}
          pointLabel="y"
          enableSlices={false}
          debugSlices={false}
          enableArea
          areaBlendMode="normal"
          areaBaselineValue={0}
          areaOpacity={0.2}
          lineWidth={2}
          useMesh
          debugMesh={false}
          enableCrosshair
          isInteractive
          crosshairType="bottom-left"
          onClick={handleClick}
          sliceTooltip={() => null}
          tooltip={() => null}
          defs={[]}
          fill={[]}
          legends={[]}
          role="img"
          layers={chartLayers}
          theme={{
            textColor: 'var(--foreground)',
            grid: {
              line: {
                stroke: 'color-mix(in oklab, var(--foreground) 10%, transparent)',
              },
            },
            crosshair: {
              line: {
                stroke: 'var(--border)',
                strokeWidth: 1,
              },
            },
          }}
          motionConfig="gentle"
        />
      )}
      {!hasData && (
        <div
          className="chart-empty-state"
          style={{
            display: 'grid',
            placeItems: 'center',
            width: '100%',
            height: '100%',
            color: 'var(--border)',
            fontSize: '0.85rem',
          }}
        >
          No chart data available.
        </div>
      )}
    </div>
  );
}
