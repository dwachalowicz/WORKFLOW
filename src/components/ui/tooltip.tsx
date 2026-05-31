import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

/**
 * Unified tooltip style — used by both Radix TooltipContent and canvas inline tooltips.
 * bg-black, rounded, text-[10px], minimal padding.
 */
const TOOLTIP_STYLE = "bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap shadow-xl"

/**
 * Class string for inline (CSS group-hover) canvas tooltips.
 * Position with absolute + bottom-full / top-full etc. on the parent.
 */
const CANVAS_TOOLTIP_CLASS = `absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 transition-opacity ${TOOLTIP_STYLE} z-[9999] overflow-visible`

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, children, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        `z-[9999] overflow-visible ${TOOLTIP_STYLE} animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2`,
        className
      )}
      {...props}
    >
      {children}
      <TooltipPrimitive.Arrow className="fill-black" />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TooltipPrimitive }

export function SimpleTooltip({ 
  children, 
  content, 
  side = "top" 
}: { 
  children: React.ReactNode, 
  content: React.ReactNode, 
  side?: "top" | "right" | "bottom" | "left" 
}) {
  if (!content) return <>{children}</>;
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Inline tooltip for canvas elements (nodes/edges) where Radix portals 
 * don't work well. Uses CSS group-hover for show/hide.
 * Parent must have `group/{name}` class and `relative` positioning.
 * 
 * Safelist for Tailwind JIT:
 * group-hover/editor:opacity-100 group-hover/reader:opacity-100 
 * group-hover/checklist:opacity-100 group-hover/variables:opacity-100 
 * group-hover/sla:opacity-100 group-hover/comments:opacity-100 group-hover/cost:opacity-100
 * group-hover/avatars:opacity-100 group-hover/editors:opacity-100
 * group-hover/dbop:opacity-100 group-hover/trash:opacity-100 group-hover/label:opacity-100
 */
export function InlineTooltip({ 
  children, 
  groupName,
  className 
}: { 
  children: React.ReactNode,
  groupName: string,
  className?: string 
}) {
  return (
    <div className={cn(
      CANVAS_TOOLTIP_CLASS,
      `group-hover/${groupName}:opacity-100`,
      className
    )}>
      {children}
      <svg width="10" height="5" viewBox="0 0 10 5" className="absolute -bottom-[4px] left-1/2 -translate-x-1/2 fill-black">
        <polygon points="0,0 10,0 5,5" />
      </svg>
    </div>
  );
}
