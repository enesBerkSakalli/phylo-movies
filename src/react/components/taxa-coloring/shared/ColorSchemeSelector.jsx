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
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 px-3">
          <div>
            <CardTitle className="text-xs font-bold uppercase tracking-wide">{title}</CardTitle>
            {description && <CardDescription className="text-2xs text-muted-foreground">{description}</CardDescription>}
          </div>
          <CollapsibleTrigger asChild>
            <Button size="sm" variant="secondary" className="h-7 text-[11px] shrink-0">
              <Palette className="mr-1.5 size-3.5" />
              {open ? (<>Hide <ChevronUp className="ml-1 size-3" /></>) : (<>Browse Palettes <ChevronDown className="ml-1 size-3" /></>)}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="grid grid-cols-2 gap-2 p-2 pt-0 md:grid-cols-3">
            {Object.entries(CATEGORICAL_PALETTES).map(([id, colors]) => {
              const info = getPaletteInfo(id);
              return (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 w-full flex items-center justify-start gap-2 px-2 hover:bg-accent/50 transition-colors"
                      onClick={() => onApply(id)}
                    >
                      <div className="h-4 w-12 shrink-0 rounded-sm shadow-sm" style={{ background: `linear-gradient(to right, ${colors.join(", ")})` }} />
                      <div className="flex-1 truncate text-left text-2xs font-medium leading-none">
                        {id}
                      </div>
                      {info.colorBlindSafe && <Eye className="size-2.5 text-emerald-500 shrink-0" />}
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
