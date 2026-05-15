import React, { useMemo } from 'react';
import {
    Bar,
    CartesianGrid,
    ComposedChart,
    Line,
    XAxis,
    YAxis,
} from 'recharts';
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from '../../ui/chart';
import { buildSprActivityTimelinePoints } from '../../../domain/spr/sprAnalytics';

interface SprActivityTimelineProps {
    rows: any[];
}

const chartConfig = {
    sprMoveEvents: {
        label: 'Movements',
        color: '#0072B2',
    },
    uniqueMovedSubtrees: {
        label: 'Unique subtrees',
        color: '#009E73',
    },
};

const formatTick = (value: unknown): string => {
    const number = Number(value);
    return Number.isFinite(number) ? String(number) : '';
};

export const SprActivityTimeline = ({ rows }: SprActivityTimelineProps) => {
    const points = useMemo(() => buildSprActivityTimelinePoints(rows), [rows]);

    if (!points.length) {
        return (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground italic">
                No pair-level SPR activity available.
            </div>
        );
    }

    return (
        <div
            className="h-full w-full"
            role="img"
            aria-label="Chart showing movement counts and unique moved subtree counts by tree pair"
        >
            <ChartContainer config={chartConfig} className="h-full w-full">
                <ComposedChart
                    data={points}
                    margin={{ top: 8, right: 12, bottom: 4, left: 8 }}
                >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/20" />
                    <XAxis
                        dataKey="pairIndex"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        tickLine={false}
                        axisLine
                        tickMargin={4}
                        tickCount={8}
                        fontSize={9}
                        tickFormatter={formatTick}
                    />
                    <YAxis
                        yAxisId="activity"
                        type="number"
                        domain={[0, 'auto']}
                        tickLine={false}
                        axisLine
                        tickMargin={4}
                        tickCount={5}
                        fontSize={9}
                        label={{
                            value: 'Movements',
                            angle: -90,
                            position: 'insideLeft',
                            style: { fontSize: 10, fill: 'currentColor' },
                        }}
                    />
                    <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                    />
                    <ChartLegend
                        verticalAlign="top"
                        content={<ChartLegendContent className="text-2xs" />}
                    />
                    <Bar
                        yAxisId="activity"
                        dataKey="sprMoveEvents"
                        name="Movements"
                        fill="var(--color-sprMoveEvents)"
                        radius={[2, 2, 0, 0]}
                        isAnimationActive={false}
                    />
                    <Line
                        yAxisId="activity"
                        dataKey="uniqueMovedSubtrees"
                        name="Unique subtrees"
                        type="monotone"
                        stroke="var(--color-uniqueMovedSubtrees)"
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                    />
                </ComposedChart>
            </ChartContainer>
        </div>
    );
};
