import * as React from "react"
import { cn } from "@/lib/utils"

interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** "default" = standard form label, "muted" = smaller uppercase tracking label */
  variant?: "default" | "muted"
}

const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "block",
          variant === "default"
            ? "text-sm font-bold text-foreground"
            : "text-sm font-bold text-muted-foreground",
          className
        )}
        {...props}
      />
    )
  }
)
FormLabel.displayName = "FormLabel"

export { FormLabel }
