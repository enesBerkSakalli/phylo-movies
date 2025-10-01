import React, { useMemo, useRef, useLayoutEffect, useState } from 'react';
import { Line } from '@nivo/line';
import { useAppStore } from '../../js/core/store.js';

export function TimelineChart() {
  const barOptionValue = useAppStore((s) => s.barOptionValue);
  const currentTreeIndex = useAppStore((s) => s.currentTreeIndex);
  const transitionResolver = useAppStore((s) => s.transitionResolver);
  const fullTreeIndices = useAppStore((s) => s.movieData?.fullTreeIndices);
  const robinsonFouldsDistances = useAppStore((s) => s.movieData?.distances?.robinson_foulds);
  const weightedRobinsonFouldsDistances = useAppStore((s) => s.movieData?.distances?.weighted_robinson_foulds);
  const scaleList = useAppStore((s) => s.movieData?.scaleList);
  const goToPosition = useAppStore((s) => s.goToPosition);

  const { series, xDomain, yDomain, currentX, hasData } = useMemo(() => {
    let rawData = [];
    let sampleCount = 0;
    let yMax = 'auto';

    if (barOptionValue === 'rfd') {
      const arr = Array.isArray(robinsonFouldsDistances) ? robinsonFouldsDistances : [];
      sampleCount = arr.length;
      rawData = arr.map((v, i) => ({ x: i + 1, y: Number.isFinite(v) ? v : null }));
      yMax = 1;
    } else if (barOptionValue === 'w-rfd') {
      const arr = Array.isArray(weightedRobinsonFouldsDistances) ? weightedRobinsonFouldsDistances : [];
      sampleCount = arr.length;
      rawData = arr.map((v, i) => ({ x: i + 1, y: Number.isFinite(v) ? v : null }));
    } else if (barOptionValue === 'scale') {
      const arr = Array.isArray(scaleList) ? scaleList.map((s) => (Number.isFinite(s?.value) ? s.value : 0)) : [];
      sampleCount = arr.length;
      rawData = arr.map((v, i) => ({ x: i + 1, y: Number.isFinite(v) ? v : null }));
    }

    const data = rawData.filter((point) => Number.isFinite(point.y));
    const hasData = data.length > 0;

    if (barOptionValue === 'w-rfd' || barOptionValue === 'scale') {
      const maxY = data.length ? Math.max(...data.map((d) => d.y)) : null;
      yMax = Number.isFinite(maxY) ? Math.max(0, maxY) : 'auto';
    }

    const length = sampleCount || data.length || 1;
    const xDomain = [1, length];
    const yDomain = [0, yMax];

    let cx = 1;
    if (barOptionValue === 'scale') {
      cx = (currentTreeIndex ?? 0) + 1;
    } else {
      try {
        const srcIdx = transitionResolver?.getSourceTreeIndex?.(currentTreeIndex ?? 0);
        if (Number.isFinite(srcIdx) && srcIdx >= 0) {
          cx = srcIdx + 1;
        } else if (Array.isArray(fullTreeIndices)) {
          const anchorPos = fullTreeIndices.indexOf(currentTreeIndex ?? -1);
          // For anchors, place indicator at preceding transition (first anchor -> 1)
          cx = anchorPos >= 0 ? Math.max(1, anchorPos) : 1;
        } else {
          cx = 1;
        }
      } catch (_) {
        cx = 1;
      }
    }

    // Clamp to domain to avoid NaN from xScale
    cx = Math.min(Math.max(cx, 1), length);

    const seriesId = barOptionValue || 'series';

    return {
      series: hasData ? [{ id: seriesId, data }] : [],
      xDomain,
      yDomain,
      currentX: cx,
      hasData,
    };
  }, [
    barOptionValue,
    currentTreeIndex,
    robinsonFouldsDistances,
    weightedRobinsonFouldsDistances,
    scaleList,
    transitionResolver,
    fullTreeIndices,
  ]);

  const cursorLayer = useMemo(
    () => (props) => {
      const { xScale, innerHeight } = props;
      const cx = xScale(currentX);
      if (!Number.isFinite(cx)) return null;
      return (
        <g pointerEvents="none">
          <line
            x1={cx}
            x2={cx}
            y1={0}
            y2={innerHeight}
            stroke="var(--primary)"
            strokeWidth={1}
          />
        </g>
      );
    },
    [currentX]
  );

  const handleClick = (p) => {
    const x = p?.data?.x;
    if (typeof x !== 'number') return;
    const idx0 = Math.max(0, Math.round(x) - 1);
    if (barOptionValue === 'scale') {
      goToPosition(idx0);
      return;
    }
    try {
      const target = transitionResolver?.getTreeIndexForDistanceIndex?.(idx0);
      if (typeof target === 'number' && Number.isFinite(target)) {
        goToPosition(target);
      }
    } catch (_) {}
  };

  const containerRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) setSize({ w: Math.max(0, cr.width), h: Math.max(0, cr.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      id="lineChart"
      className="chart-canvas chart-inline"
      role="img"
      aria-label="Interactive distance chart"
      title="Interactive chart: Click points or drag indicator to navigate"
      data-react-chart="nivo"
      ref={containerRef}
    >
      {size.w > 0 && size.h > 0 && hasData && (
        <Line
          width={size.w}
          height={size.h}
          data={series}
          margin={{ top: 8, right: 8, bottom: 20, left: 36 }}
          xScale={{ type: 'linear', min: xDomain[0], max: xDomain[1] }}
          yScale={{ type: 'linear', min: yDomain[0], max: yDomain[1] }}
          enableGridX={true}
          enableGridY={true}
          axisBottom={{ tickSize: 0, tickPadding: 4 }}
          axisLeft={{ tickSize: 0, tickPadding: 4 }}
          enablePoints={false}
          pointSize={0}
          pointBorderWidth={0}
          pointBorderColor={{ theme: 'background' }}
          pointColor={{ from: 'color' }}
          enablePointLabel={false}
          pointLabel="y"
          pointLabelYOffset={0}
          enableArea={true}
          areaOpacity={0.2}
          areaBlendMode="normal"
          areaBaselineValue={0}
          lineWidth={2}
          legends={[]}
          isInteractive={true}
          useMesh={true}
          enableSlices={false}
          debugSlices={false}
          enableCrosshair={true}
          crosshairType="bottom-left"
          role="img"
          enableTouchCrosshair={false}
          sliceTooltip={() => null}
          defs={[]}
          fill={[]}
          tooltip={() => null}
          curve="linear"
          debugMesh={false}
          onClick={handleClick}
          colors={{ scheme: 'category10' }}
          layers={[
            'grid',
            'axes',
            'areas',
            'lines',
            'mesh',
            'legends',
            cursorLayer,
          ]}
          theme={{
            textColor: 'var(--foreground)',
            grid: {
              line: {
                stroke:
                  'color-mix(in oklab, var(--foreground) 10%, transparent)',
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
      {size.w > 0 && size.h > 0 && !hasData && (
        <div
          className="chart-empty-state"
          role="presentation"
          style={{
            display: 'grid',
            placeItems: 'center',
            width: '100%',
            height: '100%',
            color: 'var(--border)',
            fontSize: '0.85rem',
            letterSpacing: '0.02em',
          }}
        >
          No chart data available.
        </div>
      )}
    </div>
  );
}
