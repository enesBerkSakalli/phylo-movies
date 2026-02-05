import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart, Activity, Info, ListTree, Hash, Zap, BookOpen, ChevronDown, Download } from 'lucide-react';
import { SubtreeFrequencyBarChart } from './SubtreeAnalytics/SubtreeFrequencyBarChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/js/core/store';
import { calculateSubtreeFrequencies, formatSubtreeLabel } from '@/js/domain/tree/subtreeFrequencyUtils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { AppStoreState } from '@/types/store';
import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';

// ==========================================================================
// STORE SELECTORS
// ==========================================================================
const EMPTY_ARRAY: any[] = [];
const selectPairSolutions = (s: AppStoreState) => s.pairSolutions;
const selectSortedLeaves = (s: AppStoreState) => s.movieData?.sorted_leaves || EMPTY_ARRAY;
const selectFileName = (s: AppStoreState) => s.fileName || s.movieData?.file_name || 'dataset';

const escapeCsvValue = (value: unknown): string => {
    const str = value === null || value === undefined ? '' : String(value);
    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

export const AnalyticsDashboard = () => {
    const pairSolutions = useAppStore(selectPairSolutions);
    const sortedLeaves = useAppStore(selectSortedLeaves);
    const fileName = useAppStore(selectFileName);

    const allFreqs = useMemo(() => {
        if (!pairSolutions || Object.keys(pairSolutions).length === 0) return [];
        return calculateSubtreeFrequencies(pairSolutions);
    }, [pairSolutions]);

    const totalSprEvents = useMemo(() => {
        return allFreqs.reduce((sum: number, item: any) => sum + item.count, 0);
    }, [allFreqs]);

    const csvContent = useMemo(() => {
        const headers = [
            'Rank',
            'Subtree',
            'Taxa Count',
            'SPR Event Count',
            '% of Total',
            'Split Indices',
            'Signature'
        ];

        const rows = allFreqs.map((item, idx) => {
            const label = formatSubtreeLabel(item.splitIndices, sortedLeaves);
            return [
                idx + 1,
                label,
                item.splitIndices.length,
                item.count,
                item.percentage.toFixed(6),
                item.splitIndices.join(' '),
                item.signature
            ];
        });

        return [headers, ...rows]
            .map(row => row.map(escapeCsvValue).join(','))
            .join('\n');
    }, [allFreqs, sortedLeaves]);

    const handleExportCsv = () => {
        if (!csvContent) return;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const dateStamp = new Date().toISOString().slice(0, 10);
        const baseName = (fileName || 'dataset')
            .replace(/\.[^/.]+$/, '')
            .replace(/[^a-zA-Z0-9_-]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '') || 'dataset';
        link.href = url;
        link.download = `${baseName}-${dateStamp}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <Dialog>
            <SidebarMenuItem>
                <DialogTrigger asChild>
                    <SidebarMenuButton tooltip="Open SPR Event Analytics" aria-label="Open SPR Event Analytics">
                        <Activity className="text-primary" />
                        <span>SPR Event Analytics</span>
                    </SidebarMenuButton>
                </DialogTrigger>
            </SidebarMenuItem>
            <DialogContent className="sm:max-w-4xl max-h-[85vh] h-full flex flex-col overflow-hidden">
                <DialogHeader className="shrink-0 pr-10 pb-4 border-b border-border/20">
                    <DialogTitle className="text-xl font-bold tracking-tight">SPR Event Analytics</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground/80">
                        Identify regions where subtrees undergo frequent SPR events across the transition path.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="overview" className="flex flex-col flex-1 min-h-0 pt-4 overflow-hidden">
                    <TabsList className="w-full justify-start mb-4 shrink-0 bg-muted/30 p-1">
                        <TabsTrigger value="overview" className="px-6 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Overview</TabsTrigger>
                        <TabsTrigger value="details" className="px-6 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Detailed Stats</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="flex-1 min-h-0 mt-0 focus-visible:outline-none">
                        <ScrollArea className="h-full -mx-6 px-6">
                            <div className="pb-6 space-y-4">
                                <Card className="bg-primary/5 border-primary/20 p-3 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-2xs font-bold uppercase tracking-wider text-primary">
                                        <BookOpen className="size-3" />
                                        What is an SPR event?
                                    </div>
                                    <p className="text-2xs leading-relaxed text-muted-foreground">
                                        A <strong>Subtree Prune and Regraft (SPR)</strong> event occurs when a subtree's logical attachment point changes between source-target trees in the phylogeny. This is a fundamental topological rearrangement operation in tree space. The BranchArchitect engine tracks these SPR events to identify which groups of taxa are the most mobile across the transition path.
                                    </p>
                                </Card>

                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    <div className="bg-muted/10 p-3 flex flex-col rounded-md">
                                        <div className="flex items-center gap-2 text-2xs font-bold uppercase tracking-wider text-muted-foreground/80 mb-2">
                                            <Hash className="size-3 text-primary" />
                                            Distinct SPR Event Subtrees
                                        </div>
                                        <div className="text-2xl font-black tracking-tighter tabular-nums">{allFreqs.length}</div>
                                    </div>
                                    <div className="bg-muted/10 p-3 flex flex-col rounded-md">
                                        <div className="flex items-center gap-2 text-2xs font-bold uppercase tracking-wider text-muted-foreground/80 mb-2">
                                            <Zap className="size-3 text-primary" />
                                            Total SPR Events
                                        </div>
                                        <div className="text-2xl font-black tracking-tighter tabular-nums">{totalSprEvents}</div>
                                    </div>
                                    <div className="bg-muted/10 p-3 flex flex-col rounded-md">
                                        <div className="flex items-center gap-2 text-2xs font-bold uppercase tracking-wider text-muted-foreground/80 mb-2">
                                            <Info className="size-3 text-primary" />
                                            Top SPR Event %
                                        </div>
                                        {allFreqs[0] ? (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="text-2xl font-black tracking-tighter tabular-nums cursor-help text-primary hover:text-primary/80 transition-colors">
                                                        {allFreqs[0].percentage.toFixed(1)}%
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="text-2xs font-mono bg-popover border-border">
                                                    <div className="space-y-1">
                                                        <div>Full Precision:</div>
                                                        <div className="font-bold text-primary">
                                                            {allFreqs[0].percentage.toFixed(6)}%
                                                        </div>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        ) : (
                                            <div className="text-2xl font-black tracking-tighter tabular-nums">0%</div>
                                        )}
                                    </div>
                                </div>

                                <Card className="shadow-sm bg-muted/10 h-96 flex flex-col">
                                    <CardHeader className="pb-3 bg-muted/20 shrink-0">
                                        <CardTitle className="flex items-center gap-2 text-base font-bold">
                                            <BarChart className="size-4 text-primary" />
                                            Subtrees with Most SPR Events
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Frequency distribution of the most mobile subtrees identified by the BranchArchitect engine.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1 min-h-0 p-2">
                                        <SubtreeFrequencyBarChart />
                                    </CardContent>
                                </Card>
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="details" className="flex-1 min-h-0 mt-0 focus-visible:outline-none flex flex-col">
                        <Card className="shadow-sm bg-muted/10 flex-1 flex flex-col min-h-0">
                            <CardHeader className="pb-3 bg-muted/20 shrink-0">
                                <CardTitle className="flex items-center gap-2 text-base font-bold">
                                    <ListTree className="size-4 text-primary" />
                                    Complete SPR Event Frequency List
                                </CardTitle>
                                <CardDescription className="text-xs flex items-center justify-between gap-2">
                                    <span>Individual SPR event counts for every unique subtree detected across all transition microsteps.</span>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {allFreqs.length > 5 && (
                                            <span className="flex items-center gap-1 text-muted-foreground/60 shrink-0 ml-2">
                                                <ChevronDown className="size-3 animate-bounce" />
                                                <span className="text-2xs">{allFreqs.length} items · scroll</span>
                                            </span>
                                        )}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="xs"
                                            className="gap-1"
                                            onClick={handleExportCsv}
                                            disabled={allFreqs.length === 0}
                                        >
                                            <Download className="size-3" />
                                            Export CSV
                                        </Button>
                                    </div>
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 min-h-0 overflow-y-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-muted/40 text-muted-foreground font-bold sticky top-0 z-10">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left font-bold uppercase tracking-wider text-2xs">Rank</th>
                                                        <th className="px-4 py-2 text-left font-bold uppercase tracking-wider text-2xs">Subtree</th>
                                                        <th className="px-4 py-2 text-right font-bold uppercase tracking-wider text-2xs">Count</th>
                                                        <th className="px-4 py-2 text-right font-bold uppercase tracking-wider text-2xs">% of total SPR events</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/10">
                                                    {allFreqs.map((item, idx) => (
                                                        <tr key={item.signature} className="hover:bg-primary/5 transition-colors">
                                                            <td className="px-4 py-2 font-medium text-muted-foreground/60 tabular-nums text-right">{idx + 1}</td>
                                                            <td className="px-4 py-2 font-semibold">
                                                                {formatSubtreeLabel(item.splitIndices, sortedLeaves)}
                                                                <div className="text-2xs font-normal text-muted-foreground/70 mt-1">
                                                                    {item.splitIndices.length} taxa
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2 text-right">
                                                                <Badge variant="secondary" className="font-mono tabular-nums">{item.count}</Badge>
                                                            </td>
                                                            <td className="px-4 py-2 text-right font-mono text-muted-foreground tabular-nums">
                                                                <Tooltip>
                                                                    <TooltipTrigger className="cursor-help hover:text-foreground transition-colors">
                                                                        {item.percentage.toFixed(1)}%
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="left" className="text-2xs font-mono bg-popover border-border">
                                                                        <div className="space-y-1">
                                                                            <div>Full Precision:</div>
                                                                            <div className="font-bold text-primary">
                                                                                {item.percentage.toFixed(6)}%
                                                                            </div>
                                                                        </div>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {allFreqs.length === 0 && (
                                                        <tr>
                                                            <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground italic">
                                                                No SPR events detected for this dataset.
                                                            </td>
                                                        </tr>
                                                    )}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

export default AnalyticsDashboard;
