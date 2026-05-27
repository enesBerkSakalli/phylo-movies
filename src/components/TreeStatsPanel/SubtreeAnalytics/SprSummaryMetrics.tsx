import React from 'react';
import { Activity, Hash, Info, ListTree, Split, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import { SPR_SUMMARY_LABELS } from './SprSummaryMetrics.contract';

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

interface SummaryMetricCardProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

const SummaryMetricCard = ({ icon, label, children }: SummaryMetricCardProps) => (
  <Card className="gap-2 rounded-md bg-muted/10 p-3 py-3 shadow-none">
    <CardHeader className="flex flex-row items-center gap-2 p-0">
      {icon}
      <CardTitle className="text-2xs font-bold uppercase tracking-wider text-muted-foreground/80">
        {label}
      </CardTitle>
    </CardHeader>
    <CardContent className="p-0">{children}</CardContent>
  </Card>
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
  <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
    <SummaryMetricCard
      icon={<Hash className="size-3 text-primary" />}
      label={SPR_SUMMARY_LABELS.uniqueMovedSubtrees}
    >
      <div className="text-xl font-semibold tabular-nums">{uniqueMovedSubtreeCount}</div>
    </SummaryMetricCard>

    <SummaryMetricCard
      icon={<Zap className="size-3 text-primary" />}
      label={SPR_SUMMARY_LABELS.movementEvents}
    >
      <div className="text-xl font-semibold tabular-nums">{sprMovementCount}</div>
    </SummaryMetricCard>

    <SummaryMetricCard
      icon={<ListTree className="size-3 text-primary" />}
      label={SPR_SUMMARY_LABELS.solverSteps}
    >
      <div className="text-xl font-semibold tabular-nums">{transitionEventCount}</div>
    </SummaryMetricCard>

    <SummaryMetricCard
      icon={<Activity className="size-3 text-primary" />}
      label={SPR_SUMMARY_LABELS.treePairsWithMoves}
    >
      <div className="text-xl font-semibold tabular-nums">{activePairCount}</div>
    </SummaryMetricCard>

    <SummaryMetricCard
      icon={<Split className="size-3 text-primary" />}
      label={SPR_SUMMARY_LABELS.singleTaxonMoves}
    >
      <div className="text-xl font-semibold tabular-nums">
        {singleTaxonMoveEventPercentage.toFixed(1)}%
      </div>
    </SummaryMetricCard>

    <SummaryMetricCard
      icon={<Info className="size-3 text-primary" />}
      label={SPR_SUMMARY_LABELS.topSubtreeShare}
    >
      {topMovedSubtreePercentage !== null ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help text-xl font-semibold tabular-nums text-primary transition-colors hover:text-primary/80">
              {topMovedSubtreePercentage.toFixed(1)}%
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-2xs font-mono bg-popover border-border">
            <div className="flex flex-col gap-1">
              <div>Full Precision:</div>
              <div className="font-bold text-primary">{topMovedSubtreePercentage.toFixed(6)}%</div>
            </div>
          </TooltipContent>
        </Tooltip>
      ) : (
        <div className="text-xl font-semibold tabular-nums">0%</div>
      )}
    </SummaryMetricCard>

    <SummaryMetricCard icon={<Activity className="size-3 text-primary" />} label="Path Hops">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help text-xl font-semibold tabular-nums text-primary transition-colors hover:text-primary/80">
            {totalPathHops}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-2xs font-mono bg-popover border-border">
          <div className="flex flex-col gap-1">
            <div>Average per movement:</div>
            <div className="font-bold text-primary">{averagePathHops.toFixed(3)}</div>
            <div className="text-muted-foreground">Movements: {sprMoveEventCount}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </SummaryMetricCard>

    <SummaryMetricCard icon={<ListTree className="size-3 text-primary" />} label="Path Length">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help text-xl font-semibold tabular-nums text-primary transition-colors hover:text-primary/80">
            {totalPathLength.toFixed(3)}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-2xs font-mono bg-popover border-border">
          <div className="flex flex-col gap-1">
            <div>Average per movement:</div>
            <div className="font-bold text-primary">{averagePathLength.toFixed(6)}</div>
            <div className="text-muted-foreground">Movements: {sprMoveEventCount}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </SummaryMetricCard>

    <SummaryMetricCard icon={<Split className="size-3 text-primary" />} label="Farthest Subtree">
      {farthestMovedSubtree ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">
              <div className="truncate text-sm font-black tracking-tight text-primary hover:text-primary/80 transition-colors">
                {farthestMovedSubtree.label}
              </div>
              <div className="text-2xs font-mono text-muted-foreground/80 tabular-nums">
                {farthestMovedSubtree.totalPathLength.toFixed(3)} length ·{' '}
                {farthestMovedSubtree.totalPathHops} hops
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-2xs bg-popover border-border max-w-sm">
            <div className="flex flex-col gap-1">
              <div className="font-bold text-primary break-words">
                {farthestMovedSubtree.fullLabel}
              </div>
              <div className="font-mono">
                Total length: {farthestMovedSubtree.totalPathLength.toFixed(6)}
              </div>
              <div className="font-mono">
                Average length: {farthestMovedSubtree.averagePathLength.toFixed(6)}
              </div>
              <div className="font-mono">Total hops: {farthestMovedSubtree.totalPathHops}</div>
              <div className="font-mono">
                Average hops: {farthestMovedSubtree.averagePathHops.toFixed(3)}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      ) : (
        <div className="text-xl font-semibold tabular-nums">-</div>
      )}
    </SummaryMetricCard>
  </div>
);
