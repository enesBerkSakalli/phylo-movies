import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { CATEGORICAL_PALETTES, getPaletteInfo } from "@/js/constants/ColorPalettes.js";

export function ColorSchemeSelector({ onApply, title = "Apply a Color Scheme", description = "Browse curated palettes to jump-start coloring." }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {description && <CardDescription className="text-xs text-muted-foreground">{description}</CardDescription>}
          </div>
          <CollapsibleTrigger asChild>
            <Button size="sm" variant="secondary" className="shrink-0">
              <Palette className="mr-2 size-4" />
              {open ? (<>Hide <ChevronUp className="ml-1 size-4" /></>) : (<>Browse Palettes <ChevronDown className="ml-1 size-4" /></>)}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="grid grid-cols-1 gap-3 pt-0 md:grid-cols-2">
            {Object.entries(CATEGORICAL_PALETTES).map(([id, colors]) => {
              const info = getPaletteInfo(id);
              return (
                <Button
                  key={id}
                  type="button"
                  variant="outline"
                  className="h-auto flex flex-col items-start gap-2 text-left"
                  onClick={() => onApply(id)}
                  title={info.description}
                >
                  <div className="h-4 w-full rounded" style={{ background: `linear-gradient(to right, ${colors.join(", ")})` }} />
                  <div className="flex items-center gap-1 text-xs">
                    <span className="font-medium">{id}</span>
                    {info.colorBlindSafe && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Eye className="size-3" />
                        CB-safe
                      </span>
                    )}
                  </div>
                </Button>
              );
            })}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
