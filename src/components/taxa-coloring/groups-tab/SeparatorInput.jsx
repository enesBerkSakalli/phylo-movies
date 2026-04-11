import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function SeparatorInput({ separators = [], onChange, detectedSeparators = [] }) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addSeparator();
    } else if (e.key === "Backspace" && inputValue === "" && separators.length > 0) {
      // Remove last separator on backspace when input is empty
      removeSeparator(separators.length - 1);
    }
  };

  const addSeparator = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !separators.includes(trimmed)) {
      onChange([...separators, trimmed]);
      setInputValue("");
    }
  };

  const removeSeparator = (index) => {
    onChange(separators.filter((_, i) => i !== index));
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    // If multiple characters pasted, treat each as a separator
    if (value.length > 1 && !inputValue) {
      const chars = value.split("").filter(c => c.trim());
      const unique = [...new Set([...separators, ...chars])];
      onChange(unique);
      setInputValue("");
    } else {
      setInputValue(value);
    }
  };

  const addDetectedSeparator = (sep) => {
    if (!separators.includes(sep)) {
      onChange([...separators, sep]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-md bg-background">
        {separators.map((sep, idx) => (
          <Badge key={idx} variant="secondary" className="gap-1 pr-1">
            <span className="font-mono">{sep === " " ? "Space" : sep}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => removeSeparator(idx)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={addSeparator}
          placeholder={separators.length === 0 ? "Type separators: _, -, ., etc." : ""}
          className="flex-1 min-w-[120px] border-0 shadow-none focus-visible:ring-0 px-0"
        />
      </div>
      {detectedSeparators.length > 0 && separators.length === 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Suggested:</span>
          {detectedSeparators.slice(0, 3).map((item, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => addDetectedSeparator(item.separator)}
            >
              <span className="font-mono">{item.separator === " " ? "Space" : item.separator}</span>
              <span className="ml-1 text-muted-foreground">({Math.round(item.usage)}%)</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
