import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export function CSVPreview({ csvValidation, csvGroups }) {
  if (!csvValidation) return null;
  const ok = csvValidation.isValid;

  return (
    <Card className="border-border/30 shadow-none bg-accent/5 gap-0 py-0">
      <CardHeader className="pb-1.5 pt-2 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            {ok ? (
              <CheckCircle2 className="size-3 text-emerald-600" />
            ) : (
              <AlertTriangle className="size-3 text-amber-600" />
            )}
            {ok ? "Mapping Preview" : "Partial Mapping"}
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-2xs font-bold text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded border border-border/40 tabular-nums cursor-help hover:bg-background/70 transition-colors">
                  {csvValidation.matched.length} Matched • {csvValidation.matchPercentage}%
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-2xs">
                {csvValidation.matched.length} CSV categories assigned to taxa for subtree coloring
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="px-2.5 pb-2">
        <div className="rounded-lg border border-border/40 bg-background/50 overflow-hidden">
          <ScrollArea className="h-40">
            <div className="divide-y divide-border/20">
              {csvGroups.map((g) => (
                <div key={g.name} className="p-1.5 px-2.5 hover:bg-accent/30 transition-colors group">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] font-bold truncate pr-2">{g.name}</span>
                    <span className="text-2xs font-mono text-muted-foreground bg-muted/40 px-2 rounded uppercase tabular-nums">
                      {g.count} taxa
                    </span>
                  </div>
                  <div className="text-2xs text-muted-foreground/70 truncate italic">
                    {g.members.slice(0, 4).join(", ")}{g.members.length > 4 ? "..." : ""}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
