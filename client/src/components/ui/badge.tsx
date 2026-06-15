import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        success: "border-transparent bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
        warning: "border-transparent bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
        info: "border-transparent bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
        pending: "border-transparent bg-amber-50 text-amber-700",
        processing: "border-transparent bg-blue-50 text-blue-700",
        completed: "border-transparent bg-emerald-50 text-emerald-700",
        cancelled: "border-transparent bg-red-50 text-red-700",
        paid: "border-transparent bg-emerald-50 text-emerald-700",
        refunded: "border-transparent bg-purple-50 text-purple-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
