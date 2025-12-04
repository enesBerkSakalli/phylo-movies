import React from "react";
import { ColorSwatchInput } from "./ColorSwatchInput.jsx";

export function ColorInputGrid({ items, isGroup, colorManager, onColorChange }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {items.map((item) => {
        const name = isGroup ? item.name : item;
        const label = isGroup ? `${name} (${item.count})` : name;
        const colorMap = isGroup ? colorManager.groupColorMap : colorManager.taxaColorMap;
        const color = colorMap.get(name) || (isGroup ? colorManager.getRandomColor() : "#000000");

        return (
          <ColorSwatchInput
            key={name}
            label={label}
            color={color}
            onChange={(c) => onColorChange(name, c, isGroup)}
          />
        );
      })}
    </div>
  );
}
