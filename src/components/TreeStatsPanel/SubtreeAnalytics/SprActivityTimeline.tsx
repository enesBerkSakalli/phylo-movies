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
} from '@/components/ui/chart';
import { buildSprActivityTimelinePoints } from '@/domain/tree/sprAnalyticsUtils';

interface SprActivityTimelineProps {
    rows: any[];
}

const chartConfig = {
    moverOccurrences: {
        label: 'Mover occurrences',
        color: '#0072B2',
    },
    transitionEvents: {
        label: 'Transition events',
        color: '#009E73',
    },
    rfDistance: {
        label: 'RFD',
        color: '#E69F00',
    },
    weightedRfDistance: {
        label: 'W-RFD',
        color: '#D55E00',
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
            aria-label="SPR activity timeline showing mover occurrences, transition events, RFD, and W-RFD by tree pair"
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
                            value: 'Mover occurrences',
                            angle: -90,
                            position: 'insideLeft',
                            style: { fontSize: 10, fill: 'currentColor' },
                        }}
                    />
                    <YAxis
                        yAxisId="distance"
                        type="number"
                        orientation="right"
                        domain={[0, 'auto']}
                        tickLine={false}
                        axisLine
                        tickMargin={4}
                        tickCount={5}
                        fontSize={9}
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
                        dataKey="moverOccurrences"
                        name="Mover occurrences"
                        fill="var(--color-moverOccurrences)"
                        radius={[2, 2, 0, 0]}
                        isAnimationActive={false}
                    />
                    <Line
                        yAxisId="activity"
                        dataKey="transitionEvents"
                        name="Transition events"
                        type="monotone"
                        stroke="var(--color-transitionEvents)"
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                    />
                    <Line
                        yAxisId="distance"
                        dataKey="rfDistance"
                        name="RFD"
                        type="monotone"
                        stroke="var(--color-rfDistance)"
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                        connectNulls
                    />
                    <Line
                        yAxisId="distance"
                        dataKey="weightedRfDistance"
                        name="W-RFD"
                        type="monotone"
                        stroke="var(--color-weightedRfDistance)"
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                        connectNulls
                    />
                </ComposedChart>
            </ChartContainer>
        </div>
    );
};
