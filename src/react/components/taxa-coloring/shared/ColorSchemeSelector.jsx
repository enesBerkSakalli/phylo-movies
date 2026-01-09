import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { CATEGORICAL_PALETTES, getPaletteInfo } from "@/js/constants/ColorPalettes.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ColorSchemeSelector({ onApply, title = "Apply a Color Scheme", description = "Browse curated palettes to jump-start coloring." }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="gap-0 py-0 border-border/40 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 px-4">
          <div>
            <CardTitle className="text-[13px] font-bold">{title}</CardTitle>
            {description && <CardDescription className="text-[10px] text-muted-foreground">{description}</CardDescription>}
          </div>
          <CollapsibleTrigger asChild>
            <Button size="sm" variant="secondary" className="h-7 text-[11px] shrink-0">
              <Palette className="mr-1.5 size-3.5" />
              {open ? (<>Hide <ChevronUp className="ml-1 size-3" /></>) : (<>Browse Palettes <ChevronDown className="ml-1 size-3" /></>)}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="grid grid-cols-1 gap-2 p-3 pt-0 md:grid-cols-2">
            {Object.entries(CATEGORICAL_PALETTES).map(([id, colors]) => {
              const info = getPaletteInfo(id);
              return (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto w-full flex flex-col items-start gap-2 text-left hover:bg-accent/50 transition-colors py-3"
                      onClick={() => onApply(id)}
                    >
                      <div className="h-4 w-full rounded" style={{ background: `linear-gradient(to right, ${colors.join(", ")})` }} />
                      <div className="flex items-center gap-1 text-xs">
                        <span className="font-medium text-foreground">{id}</span>
                        {info.colorBlindSafe && (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <Eye className="size-3" />
                            CB-safe
                          </span>
                        )}
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[300px]">
                    <p className="font-medium mb-1">{id}</p>
                    <p className="text-xs opacity-90 leading-tight">{info.description}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
