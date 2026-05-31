import * as React from "react"
import { cn } from "@/lib/utils"

interface ErrorAlertProps {
  children: React.ReactNode
  className?: string
}

export const ErrorAlert = ({ children, className }: ErrorAlertProps) => {
  if (!children) return null
  return (
    <div
      className={cn(
        "text-xs font-medium text-destructive bg-destructive/10 p-3 rounded-xl border border-destructive/20",
        className
      )}
    >
      {children}
    </div>
  )
}
