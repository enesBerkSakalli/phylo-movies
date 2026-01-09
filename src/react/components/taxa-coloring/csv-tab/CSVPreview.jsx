import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export function CSVPreview({ csvValidation, csvGroups }) {
  if (!csvValidation) return null;
  const ok = csvValidation.isValid;

  return (
    <Card className="border-border/30 shadow-none bg-accent/5 gap-0 py-0">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {ok ? (
              <div className="size-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="size-3 text-emerald-600" />
              </div>
            ) : (
              <div className="size-5 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="size-3 text-amber-600" />
              </div>
            )}
            <CardTitle className="text-xs font-bold uppercase tracking-wider">
              {ok ? "Mapping Preview" : "Partial Mapping"}
            </CardTitle>
          </div>
          <div className="text-[10px] font-bold text-muted-foreground bg-background/50 px-2 py-0.5 rounded border border-border/40">
            {csvValidation.matched.length} Matched • {csvValidation.matchPercentage}%
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="rounded-lg border border-border/40 bg-background/50 overflow-hidden">
          <ScrollArea className="h-48">
            <div className="divide-y divide-border/20">
              {csvGroups.map((g) => (
                <div key={g.name} className="p-2.5 px-3 hover:bg-accent/30 transition-colors group">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] font-bold truncate pr-2">{g.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted/40 px-1.5 rounded uppercase">
                      {g.count} taxa
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 truncate italic">
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
