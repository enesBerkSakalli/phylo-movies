
import React, { useMemo } from 'react';
import { ResponsiveBoxPlot } from '@nivo/boxplot';
import { useAppStore } from '../../../../js/core/store';
import { calculateSubtreeFrequencies } from '../../../../js/domain/tree/subtreeFrequencyUtils';

/**
 * SubtreeFrequencyBoxplot
 *
 * Visualizes the distribution of jump frequencies grouped by Subtree Size (number of leaves).
 * Tests the hypothesis: "Do smaller or larger subtrees jump more often?"
 */
export const SubtreeFrequencyBoxplot = () => {
    const pairSolutions = useAppStore(s => s.pairSolutions);

    // Transform data for Nivo BoxPlot
    const data = useMemo(() => {
        const freqs = calculateSubtreeFrequencies(pairSolutions);
        if (freqs.length === 0) return [];

        // Group by size (number of leaves)
        // Format: Array<{ group: "Size 2", value: frequency }>
        const plotData: {
            group: string; subGroup: string; // Single subgroup
            value: any;
        }[] = [];

        freqs.forEach(item => {
            const size = item.splitIndices.length;
            // Only consider meaningful sizes (e.g. < 20 leaves to avoid too many groups)
            // or just group all > 10
            let group = `Size ${size}`;
            if (size > 8) group = "Size > 8";

            plotData.push({
                group: group,
                subGroup: "Count", // Single subgroup
                value: item.count
            });
        });

        // Sort data so groups appear in order? Nivo aggregates based on input.
        // It might handle sorting automatically or we might need to sort by group string.
        return plotData.sort((a, b) => {
            const sizeA = a.group.includes('>') ? 99 : parseInt(a.group.split(' ')[1]);
            const sizeB = b.group.includes('>') ? 99 : parseInt(b.group.split(' ')[1]);
            return sizeA - sizeB;
        });

    }, [pairSolutions]);

    if (!data || data.length === 0) return <div className="text-center text-muted-foreground p-4">No frequency data available.</div>;

    return (
        <div className="w-full h-full min-h-[350px]">
            <ResponsiveBoxPlot
                data={data}
                margin={{ top: 50, right: 60, bottom: 60, left: 60 }}
                minValue={0}
                padding={0.12}
                enableGridX={true}
                axisTop={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Subtree Size (Number of Leaves)',
                    legendPosition: 'middle',
                    legendOffset: -36
                }}
                axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Subtree Size',
                    legendPosition: 'middle',
                    legendOffset: 32
                }}
                axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Jump Frequency',
                    legendPosition: 'middle',
                    legendOffset: -40
                }}
                colors={{ scheme: 'nivo' }}
                borderRadius={2}
                borderWidth={2}
                borderColor={{ from: 'color', modifiers: [ [ 'darker', 0.2 ] ] }}
                medianWidth={2}
                medianColor={{ from: 'color', modifiers: [ [ 'darker', 0.2 ] ] }}
                whiskerEndSize={0.6}
                whiskerColor={{ from: 'color', modifiers: [ [ 'darker', 0.2 ] ] }}
                motionConfig="stiff"
            />
        </div>
    );
};
