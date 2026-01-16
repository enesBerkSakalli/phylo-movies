import React, { useMemo } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { useAppStore } from '../../../../js/core/store';
import { calculateSubtreeFrequencies, getTopSubtrees, formatSubtreeLabel } from '../../../../js/domain/tree/subtreeFrequencyUtils';
import { TREE_COLOR_CATEGORIES } from '../../../../js/constants/TreeColors';

/**
 * SubtreeFrequencyBarChart
 *
 * Bar chart showing top N most frequent jumping subtrees.
 * Matches the data displayed in SubtreeFrequencyList.
 */
export const SubtreeFrequencyBarChart = () => {
    const pairSolutions = useAppStore(s => s.pairSolutions);
    const sortedLeaves = useAppStore(s => s.movieData?.sorted_leaves || []);

    const data = useMemo(() => {
        if (!pairSolutions) return [];

        const allFreqs = calculateSubtreeFrequencies(pairSolutions);
        const topSubtrees = getTopSubtrees(allFreqs, 10); // Top 10 for chart

        return topSubtrees.map(item => ({
            subtree: formatSubtreeLabel(item.splitIndices, sortedLeaves),
            count: item.count,
            percentage: item.percentage
        }));
    }, [pairSolutions, sortedLeaves]);

    const labelLayout = useMemo(() => {
        const maxLabelLength = data.reduce((max, item) => Math.max(max, item.subtree.length), 0);
        const leftMargin = Math.min(280, Math.max(140, Math.round(maxLabelLength * 6.5)));
        return { leftMargin, maxLabelLength };
    }, [data]);

    const truncateLabel = (value) => {
        const maxChars = 28;
        return value.length > maxChars ? `${value.slice(0, maxChars - 1)}…` : value;
    };

    if (!data || data.length === 0) {
        return <div className="text-center text-muted-foreground p-4">No frequency data available.</div>;
    }

    return (
        <div className="w-full h-full min-h-[350px]">
            <ResponsiveBar
                data={data}
                keys={['count']}
                indexBy="subtree"
                margin={{ top: 20, right: 30, bottom: 50, left: labelLayout.leftMargin }}
                padding={0.3}
                layout="horizontal"
                valueScale={{ type: 'linear' }}
                indexScale={{ type: 'band', round: true }}
                colors={[TREE_COLOR_CATEGORIES.markedColor]}
                borderRadius={4}
                borderColor={{ from: 'color', modifiers: [['darker', 0.6]] }}
                axisTop={null}
                axisRight={null}
                axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Jump Count',
                    legendPosition: 'middle',
                    legendOffset: 36
                }}
                axisLeft={{
                    tickSize: 5,
                    tickPadding: 8,
                    tickRotation: 0,
                    legend: '',
                    legendPosition: 'middle',
                    legendOffset: -50,
                    format: truncateLabel
                }}
                labelSkipWidth={12}
                labelSkipHeight={12}
                labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                animate={true}
                motionConfig="gentle"
                tooltip={({ indexValue, value }) => (
                    <div className="rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow">
                        <div className="font-medium">{indexValue}</div>
                        <div>Jump count: {value}</div>
                    </div>
                )}
            />
        </div>
    );
};
