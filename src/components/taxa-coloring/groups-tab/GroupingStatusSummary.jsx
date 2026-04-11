import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function GroupingStatusSummary({ groupingResult }) {
  if (!groupingResult) return null;

  const { groups, ungroupedCount, ungroupedPercent, totalTaxa } = groupingResult;
  const hasGroups = groups.length > 0;
  const groupedCount = totalTaxa - ungroupedCount;

  // Determine status
  let status = { icon: CheckCircle2, color: "text-primary", bgColor: "bg-primary/10", borderColor: "border-primary/20" };
  if (!hasGroups) {
    status = { icon: AlertTriangle, color: "text-destructive", bgColor: "bg-destructive/10", borderColor: "border-destructive/20" };
  } else if (ungroupedPercent > 50) {
    status = { icon: AlertTriangle, color: "text-foreground", bgColor: "bg-muted/60", borderColor: "border-border" };
  } else if (ungroupedPercent > 20) {
    status = { icon: Info, color: "text-muted-foreground", bgColor: "bg-accent/40", borderColor: "border-border" };
  }

  const StatusIcon = status.icon;

  return (
    <div className={cn("flex items-center justify-between py-2 px-2 rounded-md border text-xs", status.bgColor, status.borderColor)}>
      <div className="flex items-center gap-2">
        <StatusIcon className={cn("size-3.5", status.color)} />
        <span className="font-medium text-foreground/90">
          {hasGroups ? `${groups.length} Groups Found` : "No Groups"}
        </span>
      </div>

      {hasGroups && (
        <div className="flex items-center gap-2 text-2xs sm:text-xs">
          <span className="text-muted-foreground/80 font-medium tabular-nums">
             {groupedCount}/{totalTaxa} Taxa
          </span>
          {ungroupedCount > 0 && (
             <Badge variant="outline" className={cn("h-4 px-1 text-[9px] border-0 bg-background/50", status.color)}>
               {ungroupedPercent}% Ungrouped
             </Badge>
          )}
        </div>
      )}
    </div>
  );
}
