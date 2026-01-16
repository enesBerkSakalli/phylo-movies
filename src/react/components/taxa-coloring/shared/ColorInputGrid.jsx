import React from "react";
import { ColorSwatchInput } from "./ColorSwatchInput.jsx";
import { rgbToHex } from "@/js/services/ui/colorUtils.js";

export function ColorInputGrid({ items, isGroup, colorManager, onColorChange }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2">
      {items.map((item) => {
        const name = isGroup ? item.name : item;
        const label = isGroup ? `${name} (${item.count})` : name;
        const colorMap = isGroup ? colorManager.groupColorMap : colorManager.taxaColorMap;
        let currentColor = colorMap?.[name] || "#000000";

        if (Array.isArray(currentColor)) {
          currentColor = rgbToHex(currentColor);
        }

        return (
          <ColorSwatchInput
            key={name}
            label={label}
            color={currentColor}
            onChange={(c) => onColorChange(name, c, isGroup)}
          />
        );
      })}
    </div>
  );
}
