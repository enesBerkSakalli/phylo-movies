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
  let status = { icon: CheckCircle2, color: "text-emerald-500", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20" };
  if (!hasGroups) {
    status = { icon: AlertTriangle, color: "text-destructive", bgColor: "bg-destructive/10", borderColor: "border-destructive/20" };
  } else if (ungroupedPercent > 50) {
    status = { icon: AlertTriangle, color: "text-amber-500", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/20" };
  } else if (ungroupedPercent > 20) {
    status = { icon: Info, color: "text-blue-500", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/20" };
  }

  const StatusIcon = status.icon;

  return (
    <div className={cn("flex items-center justify-between py-1.5 px-2.5 rounded-md border text-xs", status.bgColor, status.borderColor)}>
      <div className="flex items-center gap-2">
        <StatusIcon className={cn("size-3.5", status.color)} />
        <span className="font-medium text-foreground/90">
          {hasGroups ? `${groups.length} Groups Found` : "No Groups"}
        </span>
      </div>

      {hasGroups && (
        <div className="flex items-center gap-2.5 text-[10px] sm:text-xs">
          <span className="text-muted-foreground/80 font-medium">
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
