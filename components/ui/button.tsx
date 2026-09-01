import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm border text-sm font-dm-sans font-semibold ring-offset-background transition-[transform,box-shadow,background-color,border-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:-translate-y-0.5",
  {
    variants: {
      variant: {
        default: "border-primary bg-primary text-primary-foreground shadow-[4px_4px_0_hsl(var(--text-dark)/0.18)] hover:bg-primary/90 hover:shadow-[2px_2px_0_hsl(var(--text-dark)/0.22)]",
        destructive:
          "border-destructive bg-destructive text-destructive-foreground shadow-[4px_4px_0_hsl(var(--text-dark)/0.18)] hover:bg-destructive/90",
        outline:
          "border border-text-dark/35 bg-background hover:bg-accent hover:text-accent-foreground hover:border-secondary",
        secondary:
          "border-secondary bg-secondary text-secondary-foreground shadow-[4px_4px_0_hsl(var(--accent)/0.55)] hover:bg-secondary/90",
        ghost: "border-transparent hover:bg-accent hover:text-accent-foreground",
        link: "border-transparent text-primary underline-offset-4 hover:underline hover:translate-y-0",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-sm px-3",
        lg: "h-11 rounded-sm px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
