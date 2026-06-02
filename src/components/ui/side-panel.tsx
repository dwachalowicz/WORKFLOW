import * as React from "react"
import { cn } from "@/lib/utils"

interface SidePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  position?: "left" | "right"
  width?: string
}

const SidePanel = React.forwardRef<HTMLDivElement, SidePanelProps>(
  ({ className, position = "left", width = "md:w-[420px]", ...props }, ref) => {
    const positionClasses = position === "left" 
      ? "left-0 md:left-[88px]" 
      : "right-0"

    return (
      <div
        ref={ref}
        role="complementary"
        className={cn(
          "fixed top-0 bottom-14 md:top-6 md:bottom-6 z-[110] flex flex-col bg-card md:rounded-2xl shadow-2xl overflow-hidden w-full",
          positionClasses,
          width,
          className
        )}
        {...props}
      />
    )
  }
)
SidePanel.displayName = "SidePanel"

export { SidePanel }
