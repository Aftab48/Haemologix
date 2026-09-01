import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-sm border border-text-dark/35 bg-white px-3 py-2 text-base font-dm-sans ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-0 focus-visible:shadow-[4px_4px_0_hsl(var(--accent)/0.7)] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-[border-color,box-shadow] duration-200 hover:border-secondary/60",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
