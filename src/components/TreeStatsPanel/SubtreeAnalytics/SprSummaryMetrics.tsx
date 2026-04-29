import React from 'react';
import { Activity, Hash, Info, ListTree, Split, Zap } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface SprSummaryMetricsProps {
    distinctMoverCount: number;
    totalMoverOccurrences: number;
    transitionEventCount: number;
    activePairCount: number;
    singletonMoverPercentage: number;
    topMoverPercentage: number | null;
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
    distinctMoverCount,
    totalMoverOccurrences,
    transitionEventCount,
    activePairCount,
    singletonMoverPercentage,
    topMoverPercentage,
}: SprSummaryMetricsProps) => (
    <div className="grid grid-cols-3 gap-3 mb-4">
        <SummaryTile
            icon={<Hash className="size-3 text-primary" />}
            label="Unique Moved Groups"
        >
            <div className="text-2xl font-black tracking-tighter tabular-nums">{distinctMoverCount}</div>
        </SummaryTile>

        <SummaryTile
            icon={<Zap className="size-3 text-primary" />}
            label="Total Moves"
        >
            <div className="text-2xl font-black tracking-tighter tabular-nums">{totalMoverOccurrences}</div>
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
            <div className="text-2xl font-black tracking-tighter tabular-nums">{singletonMoverPercentage.toFixed(1)}%</div>
        </SummaryTile>

        <SummaryTile
            icon={<Info className="size-3 text-primary" />}
            label="Largest Group Share"
        >
            {topMoverPercentage !== null ? (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="text-2xl font-black tracking-tighter tabular-nums cursor-help text-primary hover:text-primary/80 transition-colors">
                            {topMoverPercentage.toFixed(1)}%
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-2xs font-mono bg-popover border-border">
                        <div className="space-y-1">
                            <div>Full Precision:</div>
                            <div className="font-bold text-primary">
                                {topMoverPercentage.toFixed(6)}%
                            </div>
                        </div>
                    </TooltipContent>
                </Tooltip>
            ) : (
                <div className="text-2xl font-black tracking-tighter tabular-nums">0%</div>
            )}
        </SummaryTile>
    </div>
);
