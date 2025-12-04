import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Info } from "lucide-react";

export function GroupingPreview({ groupingResult, isOpen, onToggle }) {
  if (!groupingResult) return null;

  const { groups, ungroupedCount, ungroupedPercent, totalTaxa } = groupingResult;
  const hasGroups = groups.length > 0;
  const groupedCount = totalTaxa - ungroupedCount;

  // Determine status for alert
  const getStatus = () => {
    if (!hasGroups) return { variant: "destructive", icon: AlertTriangle, message: "No groups detected" };
    if (ungroupedPercent > 50) return { variant: "destructive", icon: AlertTriangle, message: `${ungroupedPercent}% of taxa ungrouped` };
    if (ungroupedPercent > 20) return { variant: "default", icon: Info, message: `${ungroupedPercent}% of taxa ungrouped` };
    return { variant: "default", icon: CheckCircle2, message: "Grouping looks good" };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Group Preview
                {hasGroups && (
                  <Badge variant="secondary">
                    {groups.length} group{groups.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                {hasGroups ? (
                  <>
                    {groupedCount} of {totalTaxa} taxa grouped
                    {ungroupedCount > 0 && ` · ${ungroupedCount} ungrouped`}
                  </>
                ) : (
                  "Configure separators to see grouping preview"
                )}
              </CardDescription>
            </div>
            <CollapsibleTrigger asChild>
              <button className="p-2 hover:bg-accent rounded-md transition-colors">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-3">
            {hasGroups && (
              <Alert variant={status.variant} className="py-2">
                <StatusIcon className="h-4 w-4" />
                <AlertDescription className="text-xs">{status.message}</AlertDescription>
              </Alert>
            )}

            {hasGroups ? (
              <ScrollArea className="h-[200px] w-full rounded-md border">
                <div className="p-3 space-y-2">
                  {groups.slice(0, 20).map((group, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1 hover:bg-accent/50 px-2 rounded">
                      <span className="text-sm font-mono truncate flex-1">{group.name}</span>
                      <Badge variant="outline" className="ml-2 shrink-0">
                        {group.count}
                      </Badge>
                    </div>
                  ))}
                  {groups.length > 20 && (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      + {groups.length - 20} more groups
                    </div>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Select a strategy and add separators to generate groups
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
