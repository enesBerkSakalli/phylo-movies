import React, { useMemo, useState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground" htmlFor={controlId}>{label}</Label>
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={controlId}
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7 border border-input"
              style={{ backgroundColor: color || "#000000" }}
              aria-label={`Select color for ${label}`}
            />
          </PopoverTrigger>
          <PopoverContent className="w-64 space-y-3" align="start">
            <div className="grid grid-cols-10 gap-1">
              {quickColors.map((c) => (
                <Button
                  key={c}
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 border border-input p-0 hover:opacity-80"
                  style={{ backgroundColor: c }}
                  aria-label={`Use color ${c}`}
                  onClick={() => { onChange(c); setOpen(false); }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={color || "#000000"}
                aria-label="Pick custom color"
                onChange={(e) => onChange(e.target.value)}
                className="h-8 w-[4.5rem] cursor-pointer p-1"
              />
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Close</Button>
            </div>
          </PopoverContent>
        </Popover>
        <span className="text-xs text-muted-foreground">{color || "#000000"}</span>
      </div>
    </div>
  );
}
