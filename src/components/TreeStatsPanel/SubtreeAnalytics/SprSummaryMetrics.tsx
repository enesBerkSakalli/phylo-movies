import React from 'react';
import { Activity, Hash, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { SPR_SUMMARY_LABELS } from './SprSummaryMetrics.contract';

interface SprSummaryMetricsProps {
  uniqueMovedSubtreeCount: number;
  sprMovementCount: number;
  activePairCount: number;
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
  activePairCount,
}: SprSummaryMetricsProps) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
      icon={<Activity className="size-3 text-primary" />}
      label={SPR_SUMMARY_LABELS.treePairsWithMoves}
    >
      <div className="text-xl font-semibold tabular-nums">{activePairCount}</div>
    </SummaryMetricCard>
  </div>
);
