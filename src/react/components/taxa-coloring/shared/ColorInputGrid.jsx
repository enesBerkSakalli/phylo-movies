import React from "react";
import { ColorSwatchInput } from "./ColorSwatchInput.jsx";

export function ColorInputGrid({ items, isGroup, colorManager, onColorChange }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2 sm:gap-4">
      {items.map((item) => {
        const name = isGroup ? item.name : item;
        const label = isGroup ? `${name} (${item.count})` : name;
        const colorMap = isGroup ? colorManager.groupColorMap : colorManager.taxaColorMap;
        const currentColor = colorMap?.[name] || "#000000";

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
