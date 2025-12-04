import React from "react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export function CSVPreview({ csvValidation, csvGroups }) {
  if (!csvValidation) return null;
  const ok = csvValidation.isValid;
  return (
    <div className="space-y-3">
      <Alert>
        <div className="flex items-start gap-2">
          {ok ? <CheckCircle2 className="size-4 mt-0.5 text-green-600" /> : <AlertTriangle className="size-4 mt-0.5 text-yellow-600" />}
          <div>
            <AlertTitle>{ok ? "CSV Loaded Successfully" : "CSV Loaded with Warnings"}</AlertTitle>
            <AlertDescription>
              {csvGroups.length} groups • {csvValidation.matched.length} matched taxa ({csvValidation.matchPercentage}%)
            </AlertDescription>
          </div>
        </div>
      </Alert>
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-sm">Group Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[1fr_auto] gap-y-2 text-sm">
            <div className="text-muted-foreground">Group Name • Taxa Count • Sample Members</div>
            <div />
            <Separator className="col-span-2 my-2" />
            <ScrollArea className="h-64 pr-2">
              <div className="space-y-2">
                {csvGroups.slice(0, 20).map((g) => (
                  <div key={g.name} className="grid grid-cols-[1fr_auto] items-start gap-x-2">
                    <div>
                      <div className="font-medium">{g.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {g.count} taxa • {g.members.slice(0,3).join(", ")}{g.members.length>3?"...":""}
                      </div>
                    </div>
                    <div className="justify-self-end text-xs text-muted-foreground">{g.count}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
