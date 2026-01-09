import * as React from "react"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

export interface ToggleWithLabelProps extends React.HTMLAttributes<HTMLLabelElement> {
  id: string
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  switchPosition?: "left" | "right"
}

export const ToggleWithLabel = React.forwardRef<HTMLLabelElement, ToggleWithLabelProps>(
  ({ id, label, description, checked, onCheckedChange, disabled, switchPosition = "right", className, ...props }, ref) => {

    // Handler to toggle when clicking the row, but avoid double-toggle if clicking the switch directly
    const handleClick = (e: React.MouseEvent) => {
      // If the click target is the switch itself or part of it, let the switch handle it
      if ((e.target as HTMLElement).closest('[button]')) return
      if ((e.target as HTMLElement).closest('[role="switch"]')) return
      if (disabled) return

      onCheckedChange(!checked)
    }

    return (
      <label
        ref={ref}
        htmlFor={id}
        className={cn(
          "flex items-center gap-4 cursor-pointer",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {switchPosition === "left" && (
          <Switch
            id={id}
            checked={checked}
            onCheckedChange={onCheckedChange}
            disabled={disabled}
          />
        )}

        <div className="flex-1 space-y-0.5">
          <div className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>

        {switchPosition === "right" && (
          <Switch
            id={id}
            checked={checked}
            onCheckedChange={onCheckedChange}
            disabled={disabled}
          />
        )}
      </label>
    )
  }
)
ToggleWithLabel.displayName = "ToggleWithLabel"
