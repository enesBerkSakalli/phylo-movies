import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { BarChart, Activity, Info, ListTree, Hash, Zap, BookOpen } from 'lucide-react';
import { SubtreeFrequencyBarChart } from './SubtreeAnalytics/SubtreeFrequencyBarChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/js/core/store';
import { calculateSubtreeFrequencies, formatSubtreeLabel } from '@/js/domain/tree/subtreeFrequencyUtils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AppStoreState } from '@/types/store';
import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';

// ==========================================================================
// STORE SELECTORS
// ==========================================================================
const EMPTY_ARRAY: any[] = [];
const selectPairSolutions = (s: AppStoreState) => s.pairSolutions;
const selectSortedLeaves = (s: AppStoreState) => s.movieData?.sorted_leaves || EMPTY_ARRAY;

export const AnalyticsDashboard = () => {
    const pairSolutions = useAppStore(selectPairSolutions);
    const sortedLeaves = useAppStore(selectSortedLeaves);

    const allFreqs = useMemo(() => {
        if (!pairSolutions || Object.keys(pairSolutions).length === 0) return [];
        return calculateSubtreeFrequencies(pairSolutions);
    }, [pairSolutions]);

    const totalJumps = useMemo(() => {
        return allFreqs.reduce((sum: number, item: any) => sum + item.count, 0);
    }, [allFreqs]);

    return (
        <Dialog>
            <SidebarMenuItem>
                <DialogTrigger asChild>
                    <SidebarMenuButton tooltip="Open Advanced Analytics Dashboard">
                        <Activity className="text-primary" />
                        <span>Analytics Dashboard</span>
                    </SidebarMenuButton>
                </DialogTrigger>
            </SidebarMenuItem>
            <DialogContent className="sm:max-w-[800px] max-h-[85vh] h-full flex flex-col overflow-hidden border-border/40">
                <DialogHeader className="shrink-0 pr-10 pb-4 border-b border-border/40">
                    <DialogTitle className="text-xl font-bold tracking-tight">Topological Analytics</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground/80">
                        Identify "hotspots" where subtrees frequently relocate across the phylogeny during the inferred transition path.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="overview" className="flex flex-col flex-1 min-h-0 pt-4 overflow-hidden">
                    <TabsList className="w-full justify-start mb-4 shrink-0 bg-muted/30 p-1 border border-border/40">
                        <TabsTrigger value="overview" className="px-6 py-1.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Overview</TabsTrigger>
                        <TabsTrigger value="details" className="px-6 py-1.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Detailed Stats</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="flex-1 min-h-0 mt-0 focus-visible:outline-none">
                        <ScrollArea className="h-full -mx-6 px-6">
                            <div className="pb-6 space-y-4">
                                <Card className="bg-primary/5 border-primary/20 p-3 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-2xs font-bold uppercase tracking-wider text-primary">
                                        <BookOpen className="size-3" />
                                        What are Jumping Subtrees?
                                    </div>
                                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                                        A <strong>Subtree</strong> is defined by a unique set of taxa (leaves). In the BranchArchitect engine, a "Jump" occurs when a subtree's logical attachment point changes between anchor trees. This dashboard tracks these topological rearrangements to identify which groups of taxa are the most mobile across the transition path.
                                    </p>
                                </Card>

                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    <Card className="bg-muted/10 border-border/40 p-3 flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-2xs font-bold uppercase tracking-wider text-muted-foreground/80">
                                            <Hash className="size-3 text-primary" />
                                            Unique Subtrees
                                        </div>
                                        <div className="text-2xl font-black tracking-tighter tabular-nums">{allFreqs.length}</div>
                                    </Card>
                                    <Card className="bg-muted/10 border-border/40 p-3 flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-2xs font-bold uppercase tracking-wider text-muted-foreground/80">
                                            <Zap className="size-3 text-primary" />
                                            Total Jump Events
                                        </div>
                                        <div className="text-2xl font-black tracking-tighter tabular-nums">{totalJumps}</div>
                                    </Card>
                                    <Card className="bg-muted/10 border-border/40 p-3 flex flex-col gap-1">
                                        <div className="flex items-center gap-2 text-2xs font-bold uppercase tracking-wider text-muted-foreground/80">
                                            <Info className="size-3 text-primary" />
                                            Top Freq
                                        </div>
                                        <div className="text-2xl font-black tracking-tighter tabular-nums">
                                            {allFreqs[0] ? `${Math.round(allFreqs[0].percentage)}%` : '0%'}
                                        </div>
                                    </Card>
                                </div>

                                <Card className="border-border/40 shadow-sm bg-muted/10 h-[500px] flex flex-col">
                                    <CardHeader className="pb-3 border-b border-border/40 bg-muted/20 shrink-0">
                                        <CardTitle className="flex items-center gap-2 text-base font-bold">
                                            <BarChart className="size-4 text-primary" />
                                            Top Jumping Subtrees
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

                    <TabsContent value="details" className="flex-1 min-h-0 mt-0 focus-visible:outline-none">
                        <ScrollArea className="h-full -mx-6 px-6">
                            <div className="pb-6">
                                <Card className="border-border/40 shadow-sm bg-muted/10">
                                    <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                                        <CardTitle className="flex items-center gap-2 text-base font-bold">
                                            <ListTree className="size-4 text-primary" />
                                            Complete Frequency List
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Individual jump counts for every unique subtree detected across all transition microsteps.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="w-full overflow-auto">
                                            <table className="w-full text-xs">
                                                <thead className="bg-muted/40 text-muted-foreground font-bold border-b border-border/40">
                                                    <tr>
                                                        <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider text-2xs">Rank</th>
                                                        <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider text-2xs">Subtree</th>
                                                        <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider text-2xs">Count</th>
                                                        <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider text-2xs">Freq %</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/20">
                                                    {allFreqs.map((item, idx) => (
                                                        <tr key={item.signature} className="hover:bg-primary/5 transition-colors">
                                                            <td className="px-4 py-2 font-medium text-muted-foreground/60 tabular-nums">{idx + 1}</td>
                                                            <td className="px-4 py-2 font-semibold">
                                                                {formatSubtreeLabel(item.splitIndices, sortedLeaves)}
                                                                <div className="text-2xs font-normal text-muted-foreground/70 mt-0.5">
                                                                    {item.splitIndices.length} taxa
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2 text-right">
                                                                <Badge variant="secondary" className="font-mono tabular-nums">{item.count}</Badge>
                                                            </td>
                                                            <td className="px-4 py-2 text-right font-mono text-muted-foreground tabular-nums">
                                                                {item.percentage.toFixed(1)}%
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {allFreqs.length === 0 && (
                                                        <tr>
                                                            <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground italic">
                                                                No jumping events detected for this dataset.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

export default AnalyticsDashboard;
