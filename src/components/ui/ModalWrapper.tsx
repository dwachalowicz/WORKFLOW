import * as React from "react"
import { useEffect } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/* ─── Overlay ─── */

interface ModalOverlayProps {
  isOpen: boolean
  onClose?: () => void
  zIndex?: "default" | "high"
  children: React.ReactNode
  /** If true, clicking the overlay calls onClose */
  closeOnOverlayClick?: boolean
}

export const ModalOverlay = ({
  isOpen,
  onClose,
  zIndex = "default",
  children,
  closeOnOverlayClick = false,
}: ModalOverlayProps) => {
  useEffect(() => {
    if (!isOpen || !onClose) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null

  const content = (
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4 overflow-y-auto",
        zIndex === "high" ? "z-[200]" : "z-modal"
      )}
      onClick={closeOnOverlayClick && onClose ? (e) => { if (e.target === e.currentTarget) onClose() } : undefined}
    >
      {children}
    </div>
  )

  if (typeof document === 'undefined') return content
  return createPortal(content, document.body)
}

/* ─── Container ─── */

interface ModalContainerProps {
  children: React.ReactNode
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

const SIZE_MAP = {
  sm: "max-w-sm",
  md: "max-w-md",
  xl: "max-w-xl",
  lg: "max-w-3xl",
} as const

export const ModalContainer = ({
  children,
  size = "md",
  className,
}: ModalContainerProps) => (
  <div
    role="dialog"
    aria-modal="true"
    className={cn(
      "bg-card w-full rounded-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl flex flex-col max-h-[90vh]",
      SIZE_MAP[size],
      className
    )}
    onClick={(e) => e.stopPropagation()}
  >
    {children}
  </div>
)

/* ─── Header ─── */

interface ModalHeaderProps {
  title: React.ReactNode
  icon?: React.ElementType
  subtitle?: React.ReactNode
  onClose: () => void
  /** If true, shows icon in a brand-gold tinted container */
  iconBrandBg?: boolean
  /** Custom icon color class (default: text-brand-gold) */
  iconClassName?: string
  className?: string
}

export const ModalHeader = ({
  title,
  icon: Icon,
  subtitle,
  onClose,
  iconBrandBg = false,
  iconClassName = "text-brand-gold",
  className,
}: ModalHeaderProps) => (
  <div className={cn("flex items-center justify-between px-6 py-4 border-b border-border/50 bg-secondary/50", className)}>
    <div className="flex items-center gap-3 min-w-0">
      {Icon && (
        iconBrandBg ? (
          <div className="w-10 h-10 rounded-xl bg-brand-gold/20 flex items-center justify-center shrink-0">
            <Icon size={20} className={iconClassName} />
          </div>
        ) : (
          <Icon size={18} className={cn("shrink-0", iconClassName)} />
        )
      )}
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-foreground truncate">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
    </div>
    <Button variant="iconGhost" size="icon" onClick={onClose} aria-label="Close" className="shrink-0 ml-2">
      <X size={18} />
    </Button>
  </div>
)

/* ─── Body ─── */

interface ModalBodyProps {
  children: React.ReactNode
  className?: string
}

export const ModalBody = ({ children, className }: ModalBodyProps) => (
  <div className={cn("p-6 overflow-y-auto flex-1", className)}>{children}</div>
)

/* ─── Footer ─── */

interface ModalFooterProps {
  children: React.ReactNode
  className?: string
}

export const ModalFooter = ({ children, className }: ModalFooterProps) => (
  <div className={cn("px-6 py-4 border-t border-border/50 flex justify-end gap-3", className)}>{children}</div>
)
