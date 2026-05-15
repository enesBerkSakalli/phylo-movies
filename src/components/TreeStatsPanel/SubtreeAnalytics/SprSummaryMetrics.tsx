import React from 'react';
import { Activity, Hash, Info, ListTree, Split, Zap } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '../../ui/tooltip';

interface SprSummaryMetricsProps {
    uniqueMovedSubtreeCount: number;
    sprMovementCount: number;
    transitionEventCount: number;
    activePairCount: number;
    singleTaxonMoveEventPercentage: number;
    topMovedSubtreePercentage: number | null;
    sprMoveEventCount: number;
    totalPathHops: number;
    averagePathHops: number;
    totalPathLength: number;
    averagePathLength: number;
    farthestMovedSubtree: {
        label: string;
        fullLabel: string;
        totalPathHops: number;
        totalPathLength: number;
        averagePathHops: number;
        averagePathLength: number;
    } | null;
}

interface SummaryTileProps {
    icon: React.ReactNode;
    label: string;
    children: React.ReactNode;
}

const SummaryTile = ({ icon, label, children }: SummaryTileProps) => (
    <div className="bg-muted/10 p-3 flex flex-col rounded-md">
        <div className="flex items-center gap-2 text-2xs font-bold uppercase tracking-wider text-muted-foreground/80 mb-2">
            {icon}
            {label}
        </div>
        {children}
    </div>
);

export const SprSummaryMetrics = ({
    uniqueMovedSubtreeCount,
    sprMovementCount,
    transitionEventCount,
    activePairCount,
    singleTaxonMoveEventPercentage,
    topMovedSubtreePercentage,
    sprMoveEventCount,
    totalPathHops,
    averagePathHops,
    totalPathLength,
    averagePathLength,
    farthestMovedSubtree,
}: SprSummaryMetricsProps) => (
    <div className="grid grid-cols-3 gap-3 mb-4">
        <SummaryTile
            icon={<Hash className="size-3 text-primary" />}
            label="Unique Moved Subtrees"
        >
            <div className="text-2xl font-black tracking-tighter tabular-nums">{uniqueMovedSubtreeCount}</div>
        </SummaryTile>

        <SummaryTile
            icon={<Zap className="size-3 text-primary" />}
            label="SPR Movements"
        >
            <div className="text-2xl font-black tracking-tighter tabular-nums">{sprMovementCount}</div>
        </SummaryTile>

        <SummaryTile
            icon={<ListTree className="size-3 text-primary" />}
            label="Solver Steps"
        >
            <div className="text-2xl font-black tracking-tighter tabular-nums">{transitionEventCount}</div>
        </SummaryTile>

        <SummaryTile
            icon={<Activity className="size-3 text-primary" />}
            label="Tree Pairs With Moves"
        >
            <div className="text-2xl font-black tracking-tighter tabular-nums">{activePairCount}</div>
        </SummaryTile>

        <SummaryTile
            icon={<Split className="size-3 text-primary" />}
            label="Single-Taxon Moves"
        >
            <div className="text-2xl font-black tracking-tighter tabular-nums">{singleTaxonMoveEventPercentage.toFixed(1)}%</div>
        </SummaryTile>

        <SummaryTile
            icon={<Info className="size-3 text-primary" />}
            label="Top Subtree Share"
        >
            {topMovedSubtreePercentage !== null ? (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="text-2xl font-black tracking-tighter tabular-nums cursor-help text-primary hover:text-primary/80 transition-colors">
                            {topMovedSubtreePercentage.toFixed(1)}%
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-2xs font-mono bg-popover border-border">
                        <div className="space-y-1">
                            <div>Full Precision:</div>
                            <div className="font-bold text-primary">
                                {topMovedSubtreePercentage.toFixed(6)}%
                            </div>
                        </div>
                    </TooltipContent>
                </Tooltip>
            ) : (
                <div className="text-2xl font-black tracking-tighter tabular-nums">0%</div>
            )}
        </SummaryTile>

        <SummaryTile
            icon={<Activity className="size-3 text-primary" />}
            label="Path Hops"
        >
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="text-2xl font-black tracking-tighter tabular-nums cursor-help text-primary hover:text-primary/80 transition-colors">
                        {totalPathHops}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-2xs font-mono bg-popover border-border">
                    <div className="space-y-1">
                        <div>Average per movement:</div>
                        <div className="font-bold text-primary">
                            {averagePathHops.toFixed(3)}
                        </div>
                        <div className="text-muted-foreground">
                            Movements: {sprMoveEventCount}
                        </div>
                    </div>
                </TooltipContent>
            </Tooltip>
        </SummaryTile>

        <SummaryTile
            icon={<ListTree className="size-3 text-primary" />}
            label="Path Length"
        >
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="text-2xl font-black tracking-tighter tabular-nums cursor-help text-primary hover:text-primary/80 transition-colors">
                        {totalPathLength.toFixed(3)}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-2xs font-mono bg-popover border-border">
                    <div className="space-y-1">
                        <div>Average per movement:</div>
                        <div className="font-bold text-primary">
                            {averagePathLength.toFixed(6)}
                        </div>
                        <div className="text-muted-foreground">
                            Movements: {sprMoveEventCount}
                        </div>
                    </div>
                </TooltipContent>
            </Tooltip>
        </SummaryTile>

        <SummaryTile
            icon={<Split className="size-3 text-primary" />}
            label="Farthest Subtree"
        >
            {farthestMovedSubtree ? (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="cursor-help">
                            <div className="truncate text-sm font-black tracking-tight text-primary hover:text-primary/80 transition-colors">
                                {farthestMovedSubtree.label}
                            </div>
                            <div className="text-2xs font-mono text-muted-foreground/80 tabular-nums">
                                {farthestMovedSubtree.totalPathLength.toFixed(3)} length · {farthestMovedSubtree.totalPathHops} hops
                            </div>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-2xs bg-popover border-border max-w-sm">
                        <div className="space-y-1">
                            <div className="font-bold text-primary break-words">{farthestMovedSubtree.fullLabel}</div>
                            <div className="font-mono">Total length: {farthestMovedSubtree.totalPathLength.toFixed(6)}</div>
                            <div className="font-mono">Average length: {farthestMovedSubtree.averagePathLength.toFixed(6)}</div>
                            <div className="font-mono">Total hops: {farthestMovedSubtree.totalPathHops}</div>
                            <div className="font-mono">Average hops: {farthestMovedSubtree.averagePathHops.toFixed(3)}</div>
                        </div>
                    </TooltipContent>
                </Tooltip>
            ) : (
                <div className="text-2xl font-black tracking-tighter tabular-nums">-</div>
            )}
        </SummaryTile>
    </div>
);
