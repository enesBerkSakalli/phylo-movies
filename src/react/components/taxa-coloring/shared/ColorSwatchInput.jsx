import React, { useMemo, useState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CATEGORICAL_PALETTES } from "@/js/constants/ColorPalettes.js";

export function ColorSwatchInput({ label, color, onChange }) {
  const [open, setOpen] = useState(false);
  const controlId = useId();

  // Quick colors: first 4 palettes, first 5 colors each
  const quickColors = useMemo(() => {
    const set = new Set();
    Object.values(CATEGORICAL_PALETTES).slice(0, 4).forEach(p => p.slice(0, 5).forEach(c => set.add(c)));
    return Array.from(set);
  }, []);

  return (
    <div className="flex flex-col gap-1 p-1.5 rounded-md border border-transparent hover:border-border/20 hover:bg-accent/5 transition-all group/swatch">
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={controlId}
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7 border border-input/60 shadow-sm hover:scale-110 transition-transform duration-200"
              style={{ backgroundColor: color || "#000000" }}
              aria-label={`Select color for ${label}`}
            />
          </PopoverTrigger>
          <PopoverContent className="w-64 space-y-4 p-4 border-border/60" align="start">
            <div className="space-y-2">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground/70">Quick Colors</p>
              <div className="grid grid-cols-10 gap-1.5">
                {quickColors.map((c) => (
                  <Tooltip key={c}>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 border border-input p-0 hover:scale-110 transition-transform active:scale-95"
                        style={{ backgroundColor: c }}
                        onClick={() => { onChange(c); setOpen(false); }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-2xs py-1 px-2">{c}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-1 border-t border-border/40">
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground/70">Custom Color</p>
              <div className="flex items-center gap-2">
                <div className="relative group">
                  <Input
                    type="color"
                    value={color || "#000000"}
                    aria-label="Pick custom color"
                    onChange={(e) => onChange(e.target.value)}
                    className="h-9 w-14 cursor-pointer p-0.5 border-none bg-transparent"
                  />
                  <div className="absolute inset-0 pointer-events-none rounded ring-1 ring-border group-hover:ring-primary/40 transition-shadow" />
                </div>
                <Input
                  value={color || "#000000"}
                  onChange={(e) => onChange(e.target.value)}
                  className="h-8 font-mono text-[11px] uppercase"
                />
                <Button size="sm" variant="secondary" className="h-8 px-3 text-xs" onClick={() => setOpen(false)}>Done</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <div className="flex flex-col min-w-0 leading-tight">
          <span className="text-[10.5px] font-medium text-foreground truncate">{label}</span>
          <span className="text-[9px] font-mono text-muted-foreground/70 uppercase tracking-tighter">{color || "#000000"}</span>
        </div>
      </div>
    </div>
  );
}
