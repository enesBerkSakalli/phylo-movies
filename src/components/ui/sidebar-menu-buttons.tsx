import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type MenuButtonItem = {
  id?: string
  label: string
  onClick?: () => void
  disabled?: boolean
  title?: string
  ariaLabel?: string
  icon?: React.ReactNode
  variant?: React.ComponentProps<typeof Button>["variant"]
}

export function SidebarMenuButtons({
  items,
  className,
}: {
  items: MenuButtonItem[]
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {items.map((item, idx) => (
        <Button
          key={item.id ?? idx}
          id={item.id}
          onClick={item.onClick}
          disabled={item.disabled}
          title={item.title}
          aria-label={item.ariaLabel ?? item.label}
          variant={item.variant ?? "outline"}
          size="sm"
          className="justify-start gap-2 w-full"
        >
          {item.icon}
          <span>{item.label}</span>
        </Button>
      ))}
    </div>
  )
}

