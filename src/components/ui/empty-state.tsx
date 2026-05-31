import * as React from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon: React.ElementType
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
  /** If true, renders a dashed border variant */
  dashed?: boolean
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  children,
  className,
  dashed = false,
}: EmptyStateProps) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center py-16 text-muted-foreground",
      dashed && "bg-card/30 rounded-2xl border border-border/50 border-dashed",
      className
    )}
  >
    <div className={cn(
      "w-16 h-16 rounded-full flex items-center justify-center mb-4",
      dashed ? "bg-card border border-border/50" : ""
    )}>
      <Icon size={dashed ? 32 : 40} className="opacity-40" />
    </div>
    <h3 className="text-lg font-bold mb-1 text-foreground">{title}</h3>
    {description && (
      <p className="text-sm text-muted-foreground max-w-[240px] text-center">
        {description}
      </p>
    )}
    {children && <div className="mt-4">{children}</div>}
  </div>
)
